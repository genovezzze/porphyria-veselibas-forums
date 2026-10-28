import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
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

export const runtime = "nodejs";

const bodySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function POST(req: NextRequest) {
  if (!checkOrigin(req)) {
    return NextResponse.json({ error: "Bad origin." }, { status: 403 });
  }
  try {
    const body = bodySchema.parse(await req.json());
    if (body.endDate <= body.startDate) throw new Error("Invalid date range.");
    const encrypted = req.cookies.get(GOOGLE_TOKEN_COOKIE)?.value;
    if (!encrypted) {
      return NextResponse.json({ error: "Not connected." }, { status: 401 });
    }
    const config = googleConfig(req.nextUrl.origin);
    let token = unseal<GoogleTokenSet>(encrypted, config.cookieSecret);
    if (!token.scope.split(" ").includes(GOOGLE_EVENTS_SCOPE)) {
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
    const events = await fetchGoogleEvents(
      token.accessToken,
      body.startDate,
      body.endDate
    );
    const response = NextResponse.json(
      { events },
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
      { error: "Calendar events could not be loaded." },
      { status: 400 }
    );
  }
}
