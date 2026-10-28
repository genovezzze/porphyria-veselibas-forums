import { describe, it, expect } from "vitest";
import { googleCalendarUrl, toGoogleDate } from "@/lib/google-calendar";
import { buildDemoSlots } from "@/lib/fixtures";
import { decorate } from "@/lib/slots";

const TODAY = "2026-11-04";

describe("toGoogleDate", () => {
  it("converts local ISO to Google basic format", () => {
    expect(toGoogleDate("2026-10-30T09:30")).toBe("20261030T093000");
  });
});

describe("googleCalendarUrl", () => {
  const option = decorate(buildDemoSlots(TODAY)[0])!;
  const url = new URL(googleCalendarUrl(option));
  const p = url.searchParams;

  it("targets the Google Calendar event template", () => {
    expect(url.origin + url.pathname).toBe("https://calendar.google.com/calendar/render");
    expect(p.get("action")).toBe("TEMPLATE");
  });

  it("uses the slot's Riga wall-clock times", () => {
    expect(p.get("dates")).toBe(`${toGoogleDate(option.start)}/${toGoogleDate(option.end)}`);
    expect(p.get("ctz")).toBe("Europe/Riga");
  });

  it("clearly marks the event as demo data and keeps the address", () => {
    expect(p.get("text")).toContain("DEMO");
    expect(p.get("details")).toContain("nav īsts pieraksts");
    expect(p.get("location")).toBe(option.center.address);
  });
});
