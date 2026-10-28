import type {
  DemoSlot,
  BusyInterval,
  MatchedOption,
  Preferences,
  Weekday,
} from "./types";
import {
  minutesSinceEpochLocal,
  weekdayOf,
  timeOfDayOf,
  labelFor,
} from "./date";
import { centerById } from "./fixtures";

// Default travel buffer applied around a slot when checking calendar conflicts.
// This is a demo allowance, surfaced in the UI as an example only.
const DEFAULT_TRAVEL_BUFFER_MIN = 15;

interface Interval {
  start: number;
  end: number;
}

function toInterval(startIso: string, endIso: string): Interval {
  return {
    start: minutesSinceEpochLocal(startIso),
    end: minutesSinceEpochLocal(endIso),
  };
}

export function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end;
}

/**
 * A slot conflicts with the calendar if the slot — padded by travel time on
 * both sides — overlaps any busy interval. Travel buffer is the max of the
 * slot's own example travel minutes and a default allowance.
 */
export function slotConflictsWithBusy(
  slot: DemoSlot,
  busy: BusyInterval[]
): boolean {
  const buffer = Math.max(slot.travelMinutes, DEFAULT_TRAVEL_BUFFER_MIN);
  const padded: Interval = {
    start: minutesSinceEpochLocal(slot.start) - buffer,
    end: minutesSinceEpochLocal(slot.end) + buffer,
  };
  return busy.some((b) => overlaps(padded, toInterval(b.start, b.end)));
}

function matchesPreferences(slot: DemoSlot, prefs: Preferences): boolean {
  const date = slot.start.split("T")[0];
  const time = slot.start.split("T")[1];

  if (prefs.weekday && weekdayOf(date) !== prefs.weekday) return false;

  if (prefs.timeOfDay !== "any" && timeOfDayOf(time) !== prefs.timeOfDay) {
    return false;
  }
  return true;
}

export function decorate(slot: DemoSlot): MatchedOption | null {
  const center = centerById(slot.centerId);
  if (!center) return null;
  const date = slot.start.split("T")[0];
  const time = slot.start.split("T")[1];
  return {
    ...slot,
    center,
    weekday: weekdayOf(date) as Weekday,
    timeOfDay: timeOfDayOf(time),
    label: labelFor(slot.start),
  };
}

/**
 * Core matching: slots that fit the preferences and do not conflict with the
 * calendar, sorted chronologically. The AI never invents slots — it only calls
 * this over the fixed fixture set.
 */
export function findDemoSlots(
  slots: DemoSlot[],
  busy: BusyInterval[],
  prefs: Preferences
): MatchedOption[] {
  return slots
    .filter((s) => matchesPreferences(s, prefs))
    .filter((s) => !slotConflictsWithBusy(s, busy))
    .map(decorate)
    .filter((x): x is MatchedOption => x !== null)
    .sort((a, b) => a.start.localeCompare(b.start));
}
