import crypto from "node:crypto";
import type { BusyInterval } from "./types";
import { TIMEZONE } from "./config";
import { addDays } from "./date";

export const GOOGLE_TOKEN_COOKIE = "next-step-google-calendar";
export const GOOGLE_FLOW_COOKIE = "next-step-google-oauth-flow";
export const GOOGLE_FREEBUSY_SCOPE =
  "https://www.googleapis.com/auth/calendar.freebusy";
export const GOOGLE_EVENTS_SCOPE =
  "https://www.googleapis.com/auth/calendar.events";
export const GOOGLE_CALENDAR_META_SCOPE =
  "https://www.googleapis.com/auth/calendar.calendars.readonly";
export const GOOGLE_REQUIRED_SCOPES = [
  GOOGLE_FREEBUSY_SCOPE,
  GOOGLE_EVENTS_SCOPE,
  GOOGLE_CALENDAR_META_SCOPE,
] as const;

interface GoogleConfig {
  clientId: string;
  clientSecret: string;
  cookieSecret: string;
  redirectUri: string;
}

export interface GoogleTokenSet {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  scope: string;
}

export interface GoogleCalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
}

export class GoogleOAuthError extends Error {
  constructor(public readonly code: string) {
    super(`Google OAuth failed: ${code}`);
    this.name = "GoogleOAuthError";
  }
}

interface OAuthFlow {
  state: string;
  returnTo?: "calendar" | "integrations";
}

export function googleCalendarConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID?.trim() &&
      process.env.GOOGLE_CLIENT_SECRET?.trim() &&
      process.env.GOOGLE_TOKEN_ENCRYPTION_KEY?.trim()
  );
}

export function googleConfig(origin: string): GoogleConfig {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const cookieSecret = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY?.trim();
  if (!clientId || !clientSecret || !cookieSecret) {
    throw new Error("Google Calendar is not configured.");
  }
  return {
    clientId,
    clientSecret,
    cookieSecret,
    redirectUri:
      process.env.GOOGLE_REDIRECT_URI?.trim() ||
      `${origin}/api/google-calendar/callback`,
  };
}

function keyFor(secret: string): Buffer {
  return crypto.createHash("sha256").update(secret).digest();
}

export function seal(value: unknown, secret: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", keyFor(secret), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

export function unseal<T>(value: string, secret: string): T {
  const data = Buffer.from(value, "base64url");
  if (data.length < 29) throw new Error("Invalid encrypted value.");
  const iv = data.subarray(0, 12);
  const tag = data.subarray(12, 28);
  const encrypted = data.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", keyFor(secret), iv);
  decipher.setAuthTag(tag);
  return JSON.parse(
    Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8")
  ) as T;
}

export function createOAuthFlow(
  returnTo: OAuthFlow["returnTo"] = "integrations"
): OAuthFlow {
  return {
    state: crypto.randomBytes(24).toString("base64url"),
    returnTo,
  };
}

export function googleAuthorizationUrl(
  config: GoogleConfig,
  flow: OAuthFlow
): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: GOOGLE_REQUIRED_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state: flow.state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeCode(
  config: GoogleConfig,
  code: string
): Promise<GoogleTokenSet> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: config.redirectUri,
    }),
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok || !data.access_token) {
    throw new GoogleOAuthError(String(data.error || "token_exchange"));
  }
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + Number(data.expires_in || 3600) * 1000,
    scope: String(data.scope || GOOGLE_FREEBUSY_SCOPE),
  };
}

export async function refreshGoogleToken(
  config: GoogleConfig,
  token: GoogleTokenSet
): Promise<GoogleTokenSet> {
  if (!token.refreshToken) throw new Error("Refresh token is missing.");
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: token.refreshToken,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok || !data.access_token) throw new Error("Token refresh failed.");
  return {
    ...token,
    accessToken: data.access_token,
    expiresAt: Date.now() + Number(data.expires_in || 3600) * 1000,
    scope: String(data.scope || token.scope),
  };
}

export function toRigaWallTime(value: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value || "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

export async function fetchGoogleBusy(
  accessToken: string,
  startDate: string,
  endDate: string
): Promise<BusyInterval[]> {
  const response = await fetch(
    "https://www.googleapis.com/calendar/v3/freeBusy",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        timeMin: `${startDate}T00:00:00Z`,
        timeMax: `${endDate}T00:00:00Z`,
        timeZone: TIMEZONE,
        items: [{ id: "primary" }],
      }),
      cache: "no-store",
    }
  );
  const data = await response.json();
  if (!response.ok) throw new Error("Google Calendar free/busy request failed.");
  const busy = data.calendars?.primary?.busy;
  if (!Array.isArray(busy)) return [];
  return busy
    .filter((item) => item?.start && item?.end)
    .map((item) => ({
      start: toRigaWallTime(item.start),
      end: toRigaWallTime(item.end),
      label: "Aizņemts · Google Calendar",
    }));
}

export async function fetchGoogleEvents(
  accessToken: string,
  startDate: string,
  endDate: string
): Promise<GoogleCalendarEvent[]> {
  const params = new URLSearchParams({
    timeMin: `${startDate}T00:00:00Z`,
    timeMax: `${endDate}T00:00:00Z`,
    timeZone: TIMEZONE,
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "250",
  });
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    }
  );
  const data = await response.json();
  if (!response.ok) throw new Error("Google Calendar events request failed.");
  if (!Array.isArray(data.items)) return [];

  const events: GoogleCalendarEvent[] = [];
  for (const item of data.items) {
    if (item?.status === "cancelled") continue;
    const title = String(item?.summary || "Notikums").slice(0, 120);
    if (item?.start?.date && item?.end?.date) {
      for (let date = item.start.date; date < item.end.date; date = addDays(date, 1)) {
        events.push({
          id: `${String(item.id || "event")}-${date}`,
          title,
          start: `${date}T08:00`,
          end: `${date}T20:00`,
          allDay: true,
        });
      }
    } else if (item?.start?.dateTime && item?.end?.dateTime) {
      events.push({
        id: String(item.id || crypto.randomUUID()),
        title,
        start: toRigaWallTime(item.start.dateTime),
        end: toRigaWallTime(item.end.dateTime),
        allDay: false,
      });
    }
  }
  return events;
}

export async function createGoogleTestEvents(
  accessToken: string,
  monthStart: string
): Promise<number> {
  const [year, month] = monthStart.split("-").map(Number);
  const rangeEnd = `${month === 12 ? year + 1 : year}-${String(
    month === 12 ? 1 : month + 1
  ).padStart(2, "0")}-01`;
  const marker = `porphyria-test-v3-${monthStart}`;
  const existingParams = new URLSearchParams({
    timeMin: `${monthStart}T00:00:00Z`,
    timeMax: `${rangeEnd}T00:00:00Z`,
    privateExtendedProperty: `porphyriaTest=${marker}`,
    singleEvents: "true",
  });
  const existingResponse = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${existingParams}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    }
  );
  const existing = await existingResponse.json();
  if (!existingResponse.ok) {
    throw new Error("Google Calendar test events could not be checked.");
  }
  if (Array.isArray(existing.items) && existing.items.length > 0) {
    return 0;
  }

  const samples: Array<{
    date: string;
    start: string;
    end: string;
    summary: string;
  }> = [];
  let dayIndex = 0;
  for (let date = monthStart; date < rangeEnd; date = addDays(date, 1)) {
    const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
    const week = Math.floor(dayIndex / 7);

    if (weekday >= 1 && weekday <= 5) {
      const workHours: Record<number, [string, string]> = {
        1: ["09:00", "17:00"],
        2: ["09:30", "16:30"],
        3: ["10:00", "18:00"],
        4: ["09:00", "15:00"],
        5: ["09:00", "13:00"],
      };
      const [start, end] = workHours[weekday];
      samples.push({ date, start, end, summary: "Darbs" });
    }

    if (weekday === 1) {
      samples.push({ date, start: "18:30", end: "20:00", summary: "Treniņš" });
    } else if (weekday === 2 && week % 2 === 0) {
      samples.push({ date, start: "17:30", end: "19:00", summary: "Manikīrs" });
    } else if (weekday === 3) {
      samples.push({ date, start: "18:30", end: "19:30", summary: "Iepirkšanās" });
    } else if (weekday === 4 && week % 2 === 1) {
      samples.push({ date, start: "18:00", end: "19:30", summary: "Vakariņas ar draugiem" });
    } else if (weekday === 5 && week % 2 === 0) {
      samples.push({ date, start: "14:30", end: "16:00", summary: "Frizieris" });
    } else if (weekday === 6) {
      samples.push({ date, start: "11:00", end: "13:00", summary: "Mājas darbi" });
    } else if (weekday === 0 && week % 2 === 0) {
      samples.push({ date, start: "15:00", end: "17:00", summary: "Laiks ar ģimeni" });
    }
    dayIndex += 1;
  }

  for (const sample of samples) {
    const response = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          summary: sample.summary,
          description: "Parauga aizņemtais laiks Porphyria brīvo logu pārbaudei.",
          start: { dateTime: `${sample.date}T${sample.start}:00`, timeZone: TIMEZONE },
          end: { dateTime: `${sample.date}T${sample.end}:00`, timeZone: TIMEZONE },
          visibility: "private",
          extendedProperties: { private: { porphyriaTest: marker } },
        }),
        cache: "no-store",
      }
    );
    if (!response.ok) {
      throw new Error("Google Calendar test event could not be created.");
    }
  }
  return samples.length;
}

export async function fetchPrimaryCalendarId(
  accessToken: string
): Promise<string> {
  const response = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    }
  );
  const data = await response.json();
  if (!response.ok || !data.id) {
    throw new Error("Primary Google Calendar could not be loaded.");
  }
  return String(data.id);
}

export function googleCalendarEmbedUrl(calendarId: string): string {
  const params = new URLSearchParams({
    height: "600",
    wkst: "2",
    bgcolor: "#ffffff",
    ctz: TIMEZONE,
    src: calendarId,
    color: "#4285F4",
    mode: "MONTH",
    showTitle: "0",
    showNav: "1",
    showDate: "1",
    showPrint: "0",
    showTabs: "1",
    showCalendars: "0",
    showTz: "0",
  });
  return `https://calendar.google.com/calendar/embed?${params.toString()}`;
}
