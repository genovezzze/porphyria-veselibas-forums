import { describe, it, expect } from "vitest";
import { buildDemoSlots, buildBusyIntervals } from "@/lib/fixtures";
import { findDemoSlots, slotConflictsWithBusy, overlaps } from "@/lib/slots";
import { weekdayOf, timeOfDayOf, demoWeekDates, latvianWeekday } from "@/lib/date";
import type { Preferences } from "@/lib/types";

const TODAY = "2026-11-04"; // deterministic anchor
const slots = buildDemoSlots(TODAY);
const busy = buildBusyIntervals(TODAY);

const base: Preferences = { timeOfDay: "any", weekday: null, concern: null };

describe("overlaps", () => {
  it("detects overlap and non-overlap", () => {
    expect(overlaps({ start: 0, end: 10 }, { start: 5, end: 15 })).toBe(true);
    expect(overlaps({ start: 0, end: 10 }, { start: 10, end: 20 })).toBe(false);
  });
});

describe("findDemoSlots — time of day", () => {
  it("after-work returns only evening slots", () => {
    const res = findDemoSlots(slots, busy, { ...base, timeOfDay: "after-work" });
    expect(res.length).toBeGreaterThan(0);
    for (const o of res) {
      expect(timeOfDayOf(o.start.split("T")[1])).toBe("after-work");
    }
  });

  it("morning returns only morning slots", () => {
    const res = findDemoSlots(slots, busy, { ...base, timeOfDay: "morning" });
    for (const o of res) {
      expect(timeOfDayOf(o.start.split("T")[1])).toBe("morning");
    }
  });
});

describe("findDemoSlots — busy exclusion", () => {
  it("never returns a slot that conflicts with a busy interval", () => {
    const res = findDemoSlots(slots, busy, base);
    for (const o of res) {
      expect(slotConflictsWithBusy(o, busy)).toBe(false);
    }
  });

  it("excludes Monday daytime work-hour slots", () => {
    const [mon] = demoWeekDates(TODAY);
    // Monday 09:00 morning slot overlaps the 09:00-17:00 work block.
    const monMorning = slots.find((s) => s.start === `${mon}T09:00`);
    expect(monMorning).toBeTruthy();
    expect(slotConflictsWithBusy(monMorning!, busy)).toBe(true);
    const res = findDemoSlots(slots, busy, base);
    expect(res.some((o) => o.id === monMorning!.id)).toBe(false);
  });
});

describe("findDemoSlots — Friday morning changes results", () => {
  it("returns friday morning options distinct from after-work", () => {
    const friMorning = findDemoSlots(slots, busy, {
      ...base,
      weekday: "friday",
      timeOfDay: "morning",
    });
    expect(friMorning.length).toBeGreaterThan(0);
    for (const o of friMorning) {
      expect(weekdayOf(o.start.split("T")[0])).toBe("friday");
      expect(timeOfDayOf(o.start.split("T")[1])).toBe("morning");
    }

    const afterWork = findDemoSlots(slots, busy, { ...base, timeOfDay: "after-work" });
    const friIds = new Set(friMorning.map((o) => o.id));
    expect(afterWork.every((o) => !friIds.has(o.id))).toBe(true);
  });
});

describe("date/weekday consistency", () => {
  it("label weekday matches the date's weekday", () => {
    const res = findDemoSlots(slots, busy, base);
    for (const o of res) {
      const wd = weekdayOf(o.start.split("T")[0]);
      expect(o.label.startsWith(latvianWeekday(wd))).toBe(true);
      expect(o.weekday).toBe(wd);
    }
  });
});
