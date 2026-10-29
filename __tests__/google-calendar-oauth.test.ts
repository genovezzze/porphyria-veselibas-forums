import { afterEach, describe, expect, it, vi } from "vitest";
import {
  GOOGLE_FREEBUSY_SCOPE,
  GOOGLE_EVENTS_SCOPE,
  GOOGLE_CALENDAR_META_SCOPE,
  googleAuthorizationUrl,
  seal,
  toRigaWallTime,
  unseal,
  createGoogleBookingEvent,
} from "@/lib/google-calendar-oauth";

afterEach(() => vi.unstubAllGlobals());

describe("Google Calendar OAuth helpers", () => {
  it("encrypts the token payload instead of exposing it", () => {
    const payload = { accessToken: "secret-access-token", expiresAt: 123 };
    const encrypted = seal(payload, "test encryption key");
    expect(encrypted).not.toContain(payload.accessToken);
    expect(unseal(encrypted, "test encryption key")).toEqual(payload);
  });

  it("requests availability and event access", () => {
    const url = new URL(
      googleAuthorizationUrl(
        {
          clientId: "client-id",
          clientSecret: "client-secret",
          cookieSecret: "cookie-secret",
          redirectUri: "http://localhost:3000/api/google-calendar/callback",
        },
        { state: "state" }
      )
    );
    const scopes = url.searchParams.get("scope")?.split(" ") || [];
    expect(scopes).toEqual([
      GOOGLE_FREEBUSY_SCOPE,
      GOOGLE_EVENTS_SCOPE,
      GOOGLE_CALENDAR_META_SCOPE,
    ]);
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("access_type")).toBe("offline");
    expect(url.searchParams.get("state")).toBe("state");
  });

  it("converts Google timestamps to Europe/Riga wall time", () => {
    expect(toRigaWallTime("2026-11-05T11:00:00Z")).toBe(
      "2026-11-05T13:00"
    );
  });

  it("creates a confirmed booking with 24h and 2h reminders", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "event-1", htmlLink: "https://calendar.google.com/event" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const created = await createGoogleBookingEvent("token", {
      summary: "Mamogrāfijas skrīnings",
      description: "Apstiprināts Piearsta.lv",
      location: "Raiņa iela 6, Ventspils",
      start: "2026-11-02T10:00",
      end: "2026-11-02T11:00",
    });

    expect(created.id).toBe("event-1");
    const request = fetchMock.mock.calls[0][1];
    const body = JSON.parse(String(request.body));
    expect(body.reminders.overrides).toEqual([
      { method: "popup", minutes: 1440 },
      { method: "popup", minutes: 120 },
    ]);
    expect(body.start.timeZone).toBe("Europe/Riga");
  });
});
