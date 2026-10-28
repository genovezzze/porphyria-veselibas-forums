import { NextRequest, NextResponse } from "next/server";
import {
  GOOGLE_CALENDAR_META_SCOPE,
  GOOGLE_TOKEN_COOKIE,
  fetchPrimaryCalendarId,
  googleCalendarEmbedUrl,
  googleConfig,
  refreshGoogleToken,
  seal,
  unseal,
  type GoogleTokenSet,
} from "@/lib/google-calendar-oauth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const encrypted = req.cookies.get(GOOGLE_TOKEN_COOKIE)?.value;
    if (!encrypted) {
      return NextResponse.json({ error: "Not connected." }, { status: 401 });
    }
    const config = googleConfig(req.nextUrl.origin);
    let token = unseal<GoogleTokenSet>(encrypted, config.cookieSecret);
    if (!token.scope.split(" ").includes(GOOGLE_CALENDAR_META_SCOPE)) {
      return NextResponse.json(
        { error: "Calendar permission upgrade required." },
        { status: 403 }
      );
    }
    let refreshed = false;
    if (token.expiresAt < Date.now() + 60_000) {
      token = await refreshGoogleToken(config, token);
      refreshed = true;
    }
    const calendarId = await fetchPrimaryCalendarId(token.accessToken);
    const response = NextResponse.json(
      {
        embedUrl: googleCalendarEmbedUrl(calendarId),
        openUrl: "https://calendar.google.com/calendar/u/0/r/week",
      },
      { headers: { "Cache-Control": "private, no-store" } }
    );
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
      { error: "Google Calendar embed could not be prepared." },
      { status: 400 }
    );
  }
}
