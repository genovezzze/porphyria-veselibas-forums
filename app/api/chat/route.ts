import { NextResponse } from "next/server";
import { z } from "zod";
import { buildSystemPrompt } from "@/lib/agent";
import {
  TOOL_DEFS,
  executeTool,
  mergePreferences,
  type ToolContext,
  type ToolResult,
} from "@/lib/tools";
import { scriptedTurn } from "@/lib/scripted";
import type {
  Preferences,
  BusyInterval,
  MatchedOption,
  CareMatch,
} from "@/lib/types";
import { LIMITS } from "@/lib/config";
import { rateLimit, clientKey, checkOrigin } from "@/lib/rate-limit";
import { buildBusyIntervals } from "@/lib/fixtures";

export const runtime = "nodejs";

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(LIMITS.maxMessageChars),
});

const prefsSchema = z.object({
  timeOfDay: z.enum(["morning", "afternoon", "after-work", "any"]),
  weekday: z
    .enum(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"])
    .nullable(),
  concern: z
    .enum(["dont-understand", "afraid-procedure", "afraid-result", "no-time", "not-now"])
    .nullable(),
});

const bodySchema = z.object({
  messages: z.array(messageSchema).max(LIMITS.maxMessagesPerSession),
  preferences: prefsSchema,
  busy: z
    .array(z.object({ start: z.string(), end: z.string(), label: z.string() }))
    .max(200)
    .optional(),
  today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

interface ChatResponse {
  reply: string;
  mode: "openai" | "scripted";
  preferences: Preferences;
  options: MatchedOption[] | null;
  selectedSlotId: string | null;
  careMatches: CareMatch[] | null;
}

export async function POST(req: Request) {
  if (!checkOrigin(req)) {
    return NextResponse.json({ error: "Bad origin." }, { status: 403 });
  }
  const limit = rateLimit(clientKey(req, "chat"), 40, 60_000);
  if (!limit.ok) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const busy: BusyInterval[] = body.busy ?? buildBusyIntervals(body.today);
  const ctx: ToolContext = {
    preferences: body.preferences,
    busy,
    today: body.today,
  };

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(runScripted(body, ctx));
  }

  try {
    const result = await runOpenAI(apiKey, body, ctx);
    return NextResponse.json(result);
  } catch (err) {
    // Fall back gracefully; do not leak error details or medical text to logs.
    console.error("chat: openai call failed");
    return NextResponse.json(runScripted(body, ctx));
  }
}

function runScripted(
  body: z.infer<typeof bodySchema>,
  ctx: ToolContext
): ChatResponse {
  const last = [...body.messages].reverse().find((m) => m.role === "user");
  const turn = scriptedTurn(last?.content ?? "", ctx.preferences);

  let preferences = ctx.preferences;
  let options: MatchedOption[] | null = null;

  if (turn.updatePreferences) {
    const res = executeTool("update_preferences", turn.updatePreferences, {
      ...ctx,
      preferences,
    });
    if (res.preferences) preferences = res.preferences;
    if (res.options) options = res.options;
  }
  if (turn.runFindSlots && !options) {
    const res = executeTool("find_demo_slots", {}, { ...ctx, preferences });
    if (res.options) options = res.options;
  }

  return {
    reply: turn.reply,
    mode: "scripted",
    preferences,
    options,
    selectedSlotId: null,
    careMatches: null,
  };
}

async function runOpenAI(
  apiKey: string,
  body: z.infer<typeof bodySchema>,
  ctx: ToolContext
): Promise<ChatResponse> {
  const model = process.env.OPENAI_TEXT_MODEL?.trim() || "gpt-4o-mini";

  type OAMessage = {
    role: "system" | "user" | "assistant" | "tool";
    content: string | null;
    tool_calls?: any[];
    tool_call_id?: string;
  };

  const messages: OAMessage[] = [
    { role: "system", content: buildSystemPrompt() },
    ...body.messages.map((m) => ({ role: m.role, content: m.content })),
  ];

  let preferences = ctx.preferences;
  let options: MatchedOption[] | null = null;
  let selectedSlotId: string | null = null;
  let careMatches: CareMatch[] | null = null;

  async function call(): Promise<any> {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        tools: TOOL_DEFS,
        temperature: 0.4,
        max_tokens: 300,
      }),
    });
    if (!res.ok) throw new Error("openai http " + res.status);
    return res.json();
  }

  let data = await call();
  let choice = data.choices?.[0];

  // One round of tool execution is enough for this demo flow.
  for (let round = 0; round < 3; round++) {
    const toolCalls = choice?.message?.tool_calls;
    if (!toolCalls || toolCalls.length === 0) break;

    messages.push(choice.message);

    for (const tc of toolCalls) {
      let args: unknown = {};
      try {
        args = JSON.parse(tc.function.arguments || "{}");
      } catch {
        args = {};
      }
      const res: ToolResult = executeTool(tc.function.name, args, {
        ...ctx,
        preferences,
      });
      if (res.preferences) preferences = res.preferences;
      if (res.options) options = res.options;
      if (res.selectedSlotId) selectedSlotId = res.selectedSlotId;
      if (res.careMatches) careMatches = res.careMatches;

      messages.push({
        role: "tool",
        tool_call_id: tc.id,
        content: JSON.stringify(
          res.ok
            ? {
                ok: true,
                options: res.options?.map((o) => ({
                  slotId: o.id,
                  center: o.center.name,
                  service: o.center.service,
                  when: o.label,
                  district: o.center.district,
                  priceEur: o.center.priceEur,
                })),
                selectedSlotId: res.selectedSlotId,
                careMatches: res.careMatches,
                preferences: res.preferences,
              }
            : { ok: false, error: res.error }
        ),
      });
    }

    data = await call();
    choice = data.choices?.[0];
  }

  const reply =
    choice?.message?.content?.trim() ||
    "Sorry, I didn't catch that. Could you say it another way?";

  return {
    reply,
    mode: "openai",
    preferences,
    options,
    selectedSlotId,
    careMatches,
  };
}
