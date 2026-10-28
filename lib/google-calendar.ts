import type { MatchedOption } from "./types";
import { TIMEZONE } from "./config";

// Builds a Google Calendar "add event" link for a demo option. No OAuth and no
// API key: Google opens its own prefilled event form and the user saves it
// themselves. Times are passed as Europe/Riga wall-clock via `ctz`, so the
// event lands at the same hour the demo shows.

/** "2026-10-30T09:30" -> "20261030T093000" (Google's basic date-time format). */
export function toGoogleDate(iso: string): string {
  return iso.replace(/[-:]/g, "") + "00";
}

export function googleCalendarUrl(option: MatchedOption): string {
  const { center } = option;
  const details = [
    "DEMO ieraksts no prototipa. Izdomāti paraugdati: tas nav īsts pieraksts, un iestāde par to nezina.",
    `Pakalpojums: ${center.service}`,
    `Nosacījumi: ${center.conditions}`,
  ].join("\n");

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `Skrīninga vizīte (DEMO) · ${center.name}`,
    dates: `${toGoogleDate(option.start)}/${toGoogleDate(option.end)}`,
    ctz: TIMEZONE,
    details,
    location: center.address,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
