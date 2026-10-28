import { describe, it, expect } from "vitest";
import {
  executeTool,
  mergePreferences,
  updatePreferencesSchema,
  selectDemoOptionSchema,
  findVentspilsCareSchema,
} from "@/lib/tools";
import { buildBusyIntervals, buildDemoSlots } from "@/lib/fixtures";
import type { Preferences } from "@/lib/types";

const TODAY = "2026-11-04";
const base: Preferences = { timeOfDay: "any", weekday: null, concern: null };
const ctx = { preferences: base, busy: buildBusyIntervals(TODAY), today: TODAY };

describe("argument validation", () => {
  it("accepts valid preference args", () => {
    expect(updatePreferencesSchema.safeParse({ timeOfDay: "after-work" }).success).toBe(true);
    expect(updatePreferencesSchema.safeParse({ weekday: null }).success).toBe(true);
  });

  it("rejects invalid enums", () => {
    expect(updatePreferencesSchema.safeParse({ timeOfDay: "midnight" }).success).toBe(false);
    expect(updatePreferencesSchema.safeParse({ weekday: "funday" }).success).toBe(false);
  });

  it("rejects missing/oversized slotId", () => {
    expect(selectDemoOptionSchema.safeParse({}).success).toBe(false);
    expect(selectDemoOptionSchema.safeParse({ slotId: "x".repeat(200) }).success).toBe(false);
  });

  it("validates the Ventspils care search input", () => {
    expect(
      findVentspilsCareSchema.safeParse({
        location: "Ventspils, LV-3601",
        specialty: "kardiologs",
      }).success
    ).toBe(true);
    expect(
      findVentspilsCareSchema.safeParse({ location: "", specialty: "" }).success
    ).toBe(false);
  });
});

describe("mergePreferences", () => {
  it("overlays only provided fields", () => {
    const merged = mergePreferences(
      { timeOfDay: "morning", weekday: "friday", concern: null },
      { timeOfDay: "after-work" }
    );
    expect(merged).toEqual({ timeOfDay: "after-work", weekday: "friday", concern: null });
  });

  it("can clear weekday with explicit null", () => {
    const merged = mergePreferences(
      { timeOfDay: "any", weekday: "friday", concern: null },
      { weekday: null }
    );
    expect(merged.weekday).toBeNull();
  });
});

describe("executeTool", () => {
  it("update_preferences returns merged prefs and options", () => {
    const res = executeTool("update_preferences", { timeOfDay: "after-work" }, ctx);
    expect(res.ok).toBe(true);
    expect(res.preferences?.timeOfDay).toBe("after-work");
    expect(Array.isArray(res.options)).toBe(true);
    expect(res.options!.length).toBeGreaterThan(0);
  });

  it("find_demo_slots returns matching options", () => {
    const res = executeTool("find_demo_slots", {}, ctx);
    expect(res.ok).toBe(true);
    expect(res.options!.length).toBeGreaterThan(0);
  });

  it("select_demo_option accepts a real slot id and rejects a fake one", () => {
    const realId = buildDemoSlots(TODAY)[0].id;
    expect(executeTool("select_demo_option", { slotId: realId }, ctx).ok).toBe(true);
    const bad = executeTool("select_demo_option", { slotId: "nope" }, ctx);
    expect(bad.ok).toBe(false);
  });

  it("rejects invalid args without throwing", () => {
    const res = executeTool("update_preferences", { timeOfDay: 123 }, ctx);
    expect(res.ok).toBe(false);
  });

  it("returns error for unknown tool", () => {
    expect(executeTool("drop_table", {}, ctx).ok).toBe(false);
  });

  it("finds Ventspils providers and calendar-compatible windows", () => {
    const res = executeTool(
      "find_ventspils_care",
      { location: "Ventspils centrs", specialty: "kardiologs" },
      ctx
    );
    expect(res.ok).toBe(true);
    expect(res.careMatches?.[0].providerName).toContain("Ventspils");
    expect(res.careMatches?.[0].bookingUrl).toContain("piearsta.lv");
    expect(res.careMatches?.[0].suggestedTimes.length).toBeGreaterThan(0);
  });
});
