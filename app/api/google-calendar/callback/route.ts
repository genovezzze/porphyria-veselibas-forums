import { NextRequest, NextResponse } from "next/server";
import {
  GOOGLE_FLOW_COOKIE,
  GOOGLE_REQUIRED_SCOPES,
  GOOGLE_TOKEN_COOKIE,
  GoogleOAuthError,
  exchangeCode,
  googleConfig,
  seal,
  unseal,
} from "@/lib/google-calendar-oauth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  let returnTab: "calendar" | "integrations" = "integrations";
  const redirect = (status: string) =>
    NextResponse.redirect(
      new URL(`/demo?tab=${returnTab}&calendar=${status}`, req.url)
    );
  const providerError = req.nextUrl.searchParams.get("error");
  if (providerError) return redirect("denied");

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  if (!code || !state) return redirect("response-missing");

  const flowCookie = req.cookies.get(GOOGLE_FLOW_COOKIE)?.value;
  if (!flowCookie) return redirect("flow-missing");

  let config: ReturnType<typeof googleConfig>;
  try {
    config = googleConfig(req.nextUrl.origin);
  } catch {
    return redirect("not-configured");
  }

  let flow: { state: string; returnTo?: "calendar" | "integrations" };
  try {
    flow = unseal(flowCookie, config.cookieSecret);
  } catch {
    return redirect("flow-invalid");
  }
  if (flow.returnTo === "calendar") returnTab = "calendar";
  if (state !== flow.state) return redirect("state-mismatch");

  let token;
  try {
    token = await exchangeCode(config, code);
  } catch (error) {
    const code = error instanceof GoogleOAuthError ? error.code : "exchange";
    console.error(`google calendar oauth callback: ${code}`);
    return redirect(`token-${code}`);
  }
  const grantedScopes = token.scope.split(" ");
  if (GOOGLE_REQUIRED_SCOPES.some((scope) => !grantedScopes.includes(scope))) {
    return redirect("scope-missing");
  }

  try {
    const response = redirect("connected");
    response.cookies.set(GOOGLE_TOKEN_COOKIE, seal(token, config.cookieSecret), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    response.cookies.delete(GOOGLE_FLOW_COOKIE);
    return response;
  } catch {
    return redirect("cookie-error");
  }
}
