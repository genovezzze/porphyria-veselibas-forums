import { addDays } from "./date";
import type { BusyInterval, CareMatch } from "./types";

interface Provider {
  id: string;
  name: string;
  address: string;
  phone: string;
  bookingUrl: string;
  sourceUrl: string;
  specialties: string[];
  openHour: number;
  closeHour: number;
}

const PROVIDERS: Provider[] = [
  {
    id: "ventspils-poliklinika",
    name: "Ventspils poliklīnika",
    address: "Raiņa iela 6, Ventspils, LV-3601",
    phone: "+371 636 22131",
    bookingUrl:
      "https://www.piearsta.lv/iestazu-katalogs/ventspils-poliklinika-psia-1095/",
    sourceUrl: "https://www.ventspilspoliklinika.lv/kontakti/",
    specialties: [
      "endokrinologs",
      "lor",
      "otolaringologs",
      "ķirurgs",
      "internists",
      "mamogrāfija",
      "osteodensitometrija",
    ],
    openHour: 8,
    closeHour: 19,
  },
  {
    id: "ventspils-slimnica",
    name: "Ziemeļkurzemes reģionālā slimnīca, Ventspils",
    address: "Inženieru iela 60, Ventspils, LV-3601",
    phone: "+371 636 24665",
    bookingUrl:
      "https://www.piearsta.lv/lv/iestazu-katalogs/ziemelkurzemes-regionala-slimnica-sia-1105/",
    sourceUrl:
      "https://ziemelkurzemesslimnica.lv/filiales-un-nodalas/ventspils-slimnica/ambulatora-nodala/",
    specialties: [
      "kardiologs",
      "nefrologs",
      "neirologs",
      "oftalmologs",
      "acu ārsts",
      "optometrists",
      "traumatologs",
      "ortopēds",
      "asinsvadu ķirurgs",
      "flebologs",
      "ginekologs",
      "urologs",
      "pulmonologs",
      "rehabilitologs",
      "fizioterapeits",
      "uztura speciālists",
      "dermatologs",
      "gastroenterologs",
      "izmeklējums",
    ],
    openHour: 8,
    closeHour: 18,
  },
];

const SPECIALTY_ALIASES: Record<string, string[]> = {
  lor: ["lor", "otolaringolog", "ausu", "deguna", "kakla"],
  oftalmologs: ["oftalmolog", "acu ār", "redze", "optometrist"],
  traumatologs: ["traumatolog", "ortopēd", "kaulu", "locītav"],
  kardiologs: ["kardiolog", "sirds"],
  neirologs: ["neirolog", "nervu"],
  dermatologs: ["dermatolog", "ādas ār"],
  ginekologs: ["ginekolog", "sieviešu ār"],
  endokrinologs: ["endokrinolog", "vairogdziedzer"],
  fizioterapeits: ["fizioterapeit", "rehabilit"],
};

function normalizeSpecialty(value: string): string {
  const normalized = value.trim().toLocaleLowerCase("lv-LV");
  for (const [canonical, aliases] of Object.entries(SPECIALTY_ALIASES)) {
    if (aliases.some((alias) => normalized.includes(alias))) return canonical;
  }
  return normalized;
}

function overlapsBusy(start: string, end: string, busy: BusyInterval[]): boolean {
  return busy.some((interval) => start < interval.end && end > interval.start);
}

function suggestedFreeTimes(
  provider: Provider,
  busy: BusyInterval[],
  today: string,
  durationMinutes: number
): string[] {
  const results: string[] = [];
  const durationHours = Math.max(1, Math.ceil(durationMinutes / 60));
  for (let offset = 0; offset < 31 && results.length < 3; offset += 1) {
    const date = addDays(today, offset);
    const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
    if (weekday === 0 || weekday === 6) continue;
    for (let hour = provider.openHour; hour + durationHours <= provider.closeHour; hour += 1) {
      const start = `${date}T${String(hour).padStart(2, "0")}:00`;
      const end = `${date}T${String(hour + durationHours).padStart(2, "0")}:00`;
      if (!overlapsBusy(start, end, busy)) {
        results.push(start);
        break;
      }
    }
  }
  return results;
}

export function findVentspilsCare(args: {
  location: string;
  specialty: string;
  durationMinutes?: number;
  busy: BusyInterval[];
  today: string;
}): CareMatch[] {
  const specialty = normalizeSpecialty(args.specialty);
  const location = args.location.trim() || "Ventspils";
  const candidates = PROVIDERS.filter((provider) =>
    provider.specialties.some(
      (item) => item.includes(specialty) || specialty.includes(item)
    )
  );
  const selected = candidates.length > 0 ? candidates : PROVIDERS;

  return selected.map((provider) => ({
    id: `${provider.id}-${specialty.replace(/\s+/g, "-")}`,
    providerName: provider.name,
    specialty: args.specialty,
    address: provider.address,
    phone: provider.phone,
    bookingUrl: provider.bookingUrl,
    sourceUrl: provider.sourceUrl,
    directionsUrl: `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
      location
    )}&destination=${encodeURIComponent(provider.address)}`,
    suggestedTimes: suggestedFreeTimes(
      provider,
      args.busy,
      args.today,
      args.durationMinutes ?? 60
    ),
    availabilityNote:
      "Šie ir brīvie logi tavā Google Calendar. Ārsta pieejamība jāpārbauda e-pierakstā.",
  }));
}
