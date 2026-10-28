// Shared domain types for the Next Step demo.

export type TimeOfDay = "morning" | "afternoon" | "after-work" | "any";

export type Weekday =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export interface Preferences {
  // Preferred part of day.
  timeOfDay: TimeOfDay;
  // Optional specific weekday filter, e.g. "friday".
  weekday: Weekday | null;
  // Reason the person is hesitating (free-form category, optional).
  concern:
    | "dont-understand"
    | "afraid-procedure"
    | "afraid-result"
    | "no-time"
    | "not-now"
    | null;
}

export interface DemoCenter {
  id: string;
  name: string;
  service: string;
  district: string;
  address: string;
  priceEur: number | null; // null = not applicable / free
  conditions: string;
  source: string; // provenance label — always flagged as sample data
}

// A concrete offerable appointment slot (demo/fixture data).
export interface DemoSlot {
  id: string;
  centerId: string;
  // ISO start/end in Europe/Riga local wall-clock, stored as "YYYY-MM-DDTHH:mm".
  start: string;
  end: string;
  // Example travel time in minutes — explicitly a sample, not a real estimate.
  travelMinutes: number;
}

// A slot joined with its center, plus derived display fields.
export interface MatchedOption extends DemoSlot {
  center: DemoCenter;
  weekday: Weekday;
  timeOfDay: Exclude<TimeOfDay, "any">;
  // Human label like "Friday, 7 Nov · 18:30".
  label: string;
}

export interface BusyInterval {
  // ISO local "YYYY-MM-DDTHH:mm".
  start: string;
  end: string;
  label: string;
}

export interface CareMatch {
  id: string;
  providerName: string;
  specialty: string;
  address: string;
  phone: string;
  bookingUrl: string;
  sourceUrl: string;
  directionsUrl: string;
  suggestedTimes: string[];
  availabilityNote: string;
}

export interface PlanItem {
  slotId: string;
  savedAt: string; // ISO timestamp
  booked: boolean; // only true after explicit user confirmation
}
