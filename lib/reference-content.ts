// Medical reference content is kept SEPARATE from the system prompt, with a
// source and a verification date. This is deliberately neutral and general: no
// specific screening type, eligibility criteria, preparation, or medical claims
// are asserted, because the concrete screening has not been chosen yet.

export const REFERENCE_REVIEWED_ON = "2026-10-28";

export interface ReferenceNote {
  id: string;
  topic: string;
  text: string;
  source: string;
}

export const REFERENCE_NOTES: ReferenceNote[] = [
  {
    id: "purpose-general",
    topic: "Skrīninga vispārīgais mērķis",
    text:
      "Skrīninga programmas parasti tiek piedāvātas, lai pārbaudītu agrīnas pazīmes, pirms parādās simptomi, lai nākamos soļus varētu apsvērt savlaicīgāk. Laba pašsajūta pati par sevi nepasaka, ko skrīnings varētu atklāt. Skrīnings ir piedāvājums, nevis pienākums.",
    source: "Vispārīgs sabiedrības veselības ietvars (provizorisks avots, jāapstiprina ar foruma klīnisko partneri).",
  },
  {
    id: "voluntary",
    topic: "Tā ir tava izvēle",
    text:
      "Dalība ir brīvprātīga. Tu vari uzdot jautājumus, veltīt laiku lēmumam vai atteikties. Atteikšanās tagad neliedz izlemt vēlāk.",
    source: "Vispārīgs sabiedrības veselības ietvars (provizorisks avots, jāapstiprina).",
  },
  {
    id: "where-to-ask",
    topic: "Kad jautājums ir medicīnisks",
    text:
      "Jautājumus par tavu personīgo risku, konkrētiem rezultātiem, sagatavošanos vai to, vai konkrēta pārbaude ir piemērota tev, vislabāk pārrunāt ar ārstu vai uzaicinājumā norādīto iestādi.",
    source: "Vispārīgs sabiedrības veselības ietvars (provizorisks avots, jāapstiprina).",
  },
];

// Phrases that should trigger an urgent-care handoff instead of the usual
// motivational flow. Deliberately conservative.
// Includes Latvian terms for the scripted fallback.
export const URGENT_SIGNALS = [
  "chest pain",
  "can't breathe",
  "cannot breathe",
  "shortness of breath",
  "severe pain",
  "bleeding",
  "stroke",
  "faint",
  "passing out",
  "suicidal",
  "kill myself",
  // Latvian
  "sāpes krūtīs",
  "nevaru elpot",
  "grūti elpot",
  "stipras sāpes",
  "asiņošana",
  "insults",
  "ģībst",
  "nogalināt sevi",
];

export const URGENT_MESSAGE =
  "Tas izklausās pēc situācijas, kas var prasīt steidzamu uzmanību. Es nevaru palīdzēt ārkārtas gadījumos. Lūdzu, nekavējoties zvani neatliekamās palīdzības numuram vai dodies uz tuvāko neatliekamās palīdzības iestādi. Latvijā zvani 113 (medicīniskā palīdzība) vai 112 (vispārējā ārkārtas palīdzība).";
