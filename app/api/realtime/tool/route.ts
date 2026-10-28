import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { executeTool } from "@/lib/tools";
import { checkOrigin } from "@/lib/rate-limit";
import {
  GOOGLE_EVENTS_SCOPE,
  GOOGLE_TOKEN_COOKIE,
  fetchGoogleEvents,
  googleConfig,
  refreshGoogleToken,
  seal,
  unseal,
  type GoogleTokenSet,
} from "@/lib/google-calendar-oauth";
import { addDays } from "@/lib/date";

export const runtime = "nodejs";

const schema = z.object({
  name: z.enum(["find_ventspils_care", "update_preferences"]),
  arguments: z.unknown(),
  today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  preferences: z.object({
    timeOfDay: z.enum(["morning", "afternoon", "after-work", "any"]),
    weekday: z
      .enum(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"])
      .nullable(),
    concern: z
      .enum(["dont-understand", "afraid-procedure", "afraid-result", "no-time", "not-now"])
      .nullable(),
  }),
});

export async function POST(req: NextRequest) {
  if (!checkOrigin(req)) {
    return NextResponse.json({ error: "Bad origin." }, { status: 403 });
  }

  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await req.json());
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid tool request." }, { status: 400 });
  }

  let busy: Array<{ start: string; end: string; label: string }> = [];
  let calendarConnected = false;
  let refreshedToken: GoogleTokenSet | null = null;

  if (body.name === "find_ventspils_care") {
    try {
      const encrypted = req.cookies.get(GOOGLE_TOKEN_COOKIE)?.value;
      if (encrypted) {
        const config = googleConfig(req.nextUrl.origin);
        let token = unseal<GoogleTokenSet>(encrypted, config.cookieSecret);
        if (token.scope.split(" ").includes(GOOGLE_EVENTS_SCOPE)) {
          if (token.expiresAt < Date.now() + 60_000) {
            token = await refreshGoogleToken(config, token);
            refreshedToken = token;
          }
          const events = await fetchGoogleEvents(
            token.accessToken,
            body.today,
            addDays(body.today, 32)
          );
          busy = events.map((event) => ({
            start: event.start,
            end: event.end,
            label: event.title,
          }));
          calendarConnected = true;
        }
      }
    } catch {
      calendarConnected = false;
      busy = [];
    }
  }

  const result = executeTool(body.name, body.arguments, {
    preferences: body.preferences,
    busy,
    today: body.today,
    calendarConnected,
  });
  const response = NextResponse.json(result, {
    headers: { "Cache-Control": "private, no-store" },
  });
  if (refreshedToken) {
    const config = googleConfig(req.nextUrl.origin);
    response.cookies.set(
      GOOGLE_TOKEN_COOKIE,
      seal(refreshedToken, config.cookieSecret),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      }
    );
  }
  return response;
}
