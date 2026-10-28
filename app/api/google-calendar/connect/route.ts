import { NextRequest, NextResponse } from "next/server";
import {
  GOOGLE_FLOW_COOKIE,
  createOAuthFlow,
  googleAuthorizationUrl,
  googleConfig,
  seal,
} from "@/lib/google-calendar-oauth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const config = googleConfig(req.nextUrl.origin);
    const flow = createOAuthFlow(
      req.nextUrl.searchParams.get("return") === "calendar"
        ? "calendar"
        : "integrations"
    );
    const response = NextResponse.redirect(googleAuthorizationUrl(config, flow));
    response.cookies.set(GOOGLE_FLOW_COOKIE, seal(flow, config.cookieSecret), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 10 * 60,
    });
    return response;
  } catch {
    return NextResponse.redirect(new URL("/demo?calendar=not-configured", req.url));
  }
}
