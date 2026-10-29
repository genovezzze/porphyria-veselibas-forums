import { NextResponse } from "next/server";
import { buildSystemPrompt } from "@/lib/agent";
import { VOICE_ID, LIMITS } from "@/lib/config";
import { rateLimit, clientKey, checkOrigin } from "@/lib/rate-limit";
import { REALTIME_TOOL_DEFS } from "@/lib/tools";
import { buildRealtimeInputAudioConfig } from "@/lib/realtime-audio";

export const runtime = "nodejs";

// Mints a short-lived client secret for an OpenAI Realtime WebRTC session.
// The persistent OPENAI_API_KEY NEVER leaves the server; the browser only
// receives the ephemeral secret. Verify model/voice names against current
// OpenAI Realtime docs.
export async function POST(req: Request) {
  if (!checkOrigin(req)) {
    return NextResponse.json({ error: "Bad origin." }, { status: 403 });
  }

  const limit = rateLimit(
    clientKey(req, "voice"),
    LIMITS.maxVoiceSessionsPerWindow,
    LIMITS.voiceRateWindowMs
  );
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Voice session limit reached for now. Please use text chat." },
      { status: 429 }
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    // Clearly signal that real voice is not configured.
    return NextResponse.json(
      { error: "voice_unavailable", detail: "OPENAI_API_KEY is not configured." },
      { status: 503 }
    );
  }

  const model = process.env.OPENAI_REALTIME_MODEL?.trim() || "gpt-realtime";

  try {
    // Current Realtime API: mint an ephemeral client secret bound to a session
    // config. The SDP is later exchanged by the browser at /v1/realtime/calls.
    const res = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        session: {
          type: "realtime",
          model,
          instructions: buildSystemPrompt(),
          audio: {
            // Transcribe the user's speech too, so their turns show in the chat.
            input: buildRealtimeInputAudioConfig(),
            output: { voice: VOICE_ID },
          },
          max_output_tokens: 400,
          tools: REALTIME_TOOL_DEFS,
          tool_choice: "auto",
        },
      }),
    });

    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({}));
      console.error(
        "realtime: session mint failed",
        res.status,
        errorBody?.error?.code || "unknown",
        errorBody?.error?.param || "unknown"
      );
      return NextResponse.json(
        { error: "voice_unavailable", detail: "Could not start a voice session." },
        { status: 502 }
      );
    }

    const data = await res.json();
    // data.value is the ephemeral key ("ek_...") for the browser.
    return NextResponse.json({
      client_secret: { value: data.value },
      model,
      voice: VOICE_ID,
      maxSessionSeconds: LIMITS.maxVoiceSessionSeconds,
    });
  } catch (err) {
    console.error("realtime: session error");
    return NextResponse.json(
      { error: "voice_unavailable", detail: "Could not start a voice session." },
      { status: 502 }
    );
  }
}
