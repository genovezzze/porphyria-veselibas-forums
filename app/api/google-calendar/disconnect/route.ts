import { NextRequest, NextResponse } from "next/server";
import { GOOGLE_TOKEN_COOKIE } from "@/lib/google-calendar-oauth";
import { checkOrigin } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!checkOrigin(req)) {
    return NextResponse.json({ error: "Bad origin." }, { status: 403 });
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(GOOGLE_TOKEN_COOKIE);
  return response;
}
