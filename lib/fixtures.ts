import type { DemoCenter, DemoSlot, BusyInterval } from "./types";
import { demoWeekDates, rigaToday } from "./date";

// ---------------------------------------------------------------------------
// ALL DATA IN THIS FILE IS FICTIONAL SAMPLE DATA.
// The centers, prices, slots and travel times do NOT represent real clinics or
// real availability. The UI labels everything as "Demo · Sample data".
// ---------------------------------------------------------------------------

export const DEMO_CENTERS: DemoCenter[] = [
  {
    id: "c-northbridge",
    name: "Ziemeļtilta veselības punkts (paraugs)",
    service: "Profilaktiskā skrīninga vizīte",
    district: "Centrs",
    address: "Piemēra iela 12, Rīga",
    priceEur: 0,
    conditions: "Paņem līdzi uzaicinājuma vēstuli. Paraugdati.",
    source: "Demo dati, nav īsts piedāvājums",
  },
  {
    id: "c-rivergate",
    name: "Upesvārtu medicīna (paraugs)",
    service: "Profilaktiskā skrīninga vizīte",
    district: "Āgenskalns",
    address: "Parauga bulvāris 4, Rīga",
    priceEur: 15,
    conditions: "Parādīts piemēra līdzmaksājums. Paraugdati.",
    source: "Demo dati, nav īsts piedāvājums",
  },
  {
    id: "c-parkside",
    name: "Parka klīnika (paraugs)",
    service: "Profilaktiskā skrīninga vizīte",
    district: "Teika",
    address: "Vietturis aleja 88, Rīga",
    priceEur: null,
    conditions: "Iekļauts uzaicinājumā. Paraugdati.",
    source: "Demo dati, nav īsts piedāvājums",
  },
];

// Build a fresh set of slots across the demo week. Deterministic given `today`.
export function buildDemoSlots(today: string = rigaToday()): DemoSlot[] {
  const [mon, tue, wed, thu, fri] = demoWeekDates(today);
  const slots: Array<Omit<DemoSlot, "id">> = [
    // Mornings
    { centerId: "c-northbridge", start: `${mon}T09:00`, end: `${mon}T09:40`, travelMinutes: 20 },
    { centerId: "c-parkside", start: `${wed}T08:30`, end: `${wed}T09:10`, travelMinutes: 25 },
    { centerId: "c-northbridge", start: `${fri}T09:30`, end: `${fri}T10:10`, travelMinutes: 20 },
    { centerId: "c-rivergate", start: `${fri}T11:00`, end: `${fri}T11:40`, travelMinutes: 15 },
    // Afternoons
    { centerId: "c-rivergate", start: `${tue}T14:00`, end: `${tue}T14:40`, travelMinutes: 15 },
    { centerId: "c-parkside", start: `${thu}T15:30`, end: `${thu}T16:10`, travelMinutes: 25 },
    // After work
    { centerId: "c-northbridge", start: `${mon}T17:30`, end: `${mon}T18:10`, travelMinutes: 20 },
    { centerId: "c-rivergate", start: `${tue}T18:30`, end: `${tue}T19:10`, travelMinutes: 15 },
    { centerId: "c-parkside", start: `${wed}T18:00`, end: `${wed}T18:40`, travelMinutes: 25 },
    { centerId: "c-northbridge", start: `${thu}T17:45`, end: `${thu}T18:25`, travelMinutes: 20 },
  ];
  return slots.map((s, i) => ({ ...s, id: `slot-${i + 1}` }));
}

// Demo calendar: some intervals are "busy" (work hours block), leaving free windows.
export function buildBusyIntervals(today: string = rigaToday()): BusyInterval[] {
  const [mon, tue, wed, thu, fri] = demoWeekDates(today);
  return [
    { start: `${mon}T09:00`, end: `${mon}T17:00`, label: "Darbs" },
    { start: `${tue}T09:00`, end: `${tue}T17:00`, label: "Darbs" },
    { start: `${wed}T09:00`, end: `${wed}T17:00`, label: "Darbs" },
    { start: `${thu}T09:00`, end: `${thu}T17:00`, label: "Darbs" },
    { start: `${fri}T13:00`, end: `${fri}T17:00`, label: "Darbs (pēcpusdiena)" },
  ];
}

export function centerById(id: string): DemoCenter | undefined {
  return DEMO_CENTERS.find((c) => c.id === id);
}
