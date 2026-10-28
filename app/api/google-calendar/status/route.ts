import { NextRequest, NextResponse } from "next/server";
import {
  GOOGLE_TOKEN_COOKIE,
  GOOGLE_REQUIRED_SCOPES,
  googleCalendarConfigured,
  googleConfig,
  unseal,
  type GoogleTokenSet,
} from "@/lib/google-calendar-oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const configured = googleCalendarConfigured();
  let connected = false;
  let needsReconnect = false;
  if (configured) {
    try {
      const value = req.cookies.get(GOOGLE_TOKEN_COOKIE)?.value;
      if (value) {
        const config = googleConfig(req.nextUrl.origin);
        const token = unseal<GoogleTokenSet>(value, config.cookieSecret);
        connected = true;
        const granted = token.scope.split(" ");
        needsReconnect = GOOGLE_REQUIRED_SCOPES.some(
          (scope) => !granted.includes(scope)
        );
      }
    } catch {
      connected = false;
    }
  }
  return NextResponse.json(
    { configured, connected, needsReconnect },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
