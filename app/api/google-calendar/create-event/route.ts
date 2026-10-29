import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkOrigin } from "@/lib/rate-limit";
import {
  GOOGLE_EVENTS_SCOPE,
  GOOGLE_TOKEN_COOKIE,
  createGoogleBookingEvent,
  googleConfig,
  refreshGoogleToken,
  seal,
  unseal,
  type GoogleTokenSet,
} from "@/lib/google-calendar-oauth";

export const runtime = "nodejs";

const schema = z.object({
  summary: z.string().min(2).max(160),
  description: z.string().max(1000),
  location: z.string().min(2).max(240),
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
});

export async function POST(req: NextRequest) {
  if (!checkOrigin(req)) {
    return NextResponse.json({ error: "Bad origin." }, { status: 403 });
  }
  try {
    const event = schema.parse(await req.json());
    if (event.end <= event.start) {
      return NextResponse.json({ error: "Invalid event time." }, { status: 400 });
    }
    const encrypted = req.cookies.get(GOOGLE_TOKEN_COOKIE)?.value;
    if (!encrypted) {
      return NextResponse.json({ error: "Google Calendar is not connected." }, { status: 401 });
    }
    const config = googleConfig(req.nextUrl.origin);
    let token = unseal<GoogleTokenSet>(encrypted, config.cookieSecret);
    if (!token.scope.split(" ").includes(GOOGLE_EVENTS_SCOPE)) {
      return NextResponse.json(
        { error: "Calendar write permission required.", reconnect: true },
        { status: 403 }
      );
    }
    let refreshed = false;
    if (token.expiresAt < Date.now() + 60_000) {
      token = await refreshGoogleToken(config, token);
      refreshed = true;
    }
    const created = await createGoogleBookingEvent(token.accessToken, event);
    const response = NextResponse.json(created, {
      headers: { "Cache-Control": "private, no-store" },
    });
    if (refreshed) {
      response.cookies.set(
        GOOGLE_TOKEN_COOKIE,
        seal(token, config.cookieSecret),
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
  } catch {
    return NextResponse.json(
      { error: "Calendar event could not be created." },
      { status: 400 }
    );
  }
}
