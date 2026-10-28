import type { Preferences } from "./types";
import type { UpdatePreferencesArgs } from "./tools";
import { URGENT_SIGNALS, URGENT_MESSAGE } from "./reference-content";
import { REFERENCE_NOTES } from "./reference-content";

// A deterministic, rule-based assistant used when OPENAI_API_KEY is not set.
// It is intentionally simple and clearly labeled in the UI as a scripted demo —
// it is NOT presented as the real AI.

export interface ScriptedTurn {
  reply: string;
  // A single optional preference update to apply, then re-run matching.
  updatePreferences?: UpdatePreferencesArgs;
  runFindSlots?: boolean;
}

function has(text: string, words: string[]): boolean {
  const t = text.toLowerCase();
  return words.some((w) => t.includes(w));
}

export function scriptedTurn(
  userText: string,
  _prefs: Preferences
): ScriptedTurn {
  const t = userText.toLowerCase();

  if (has(t, URGENT_SIGNALS)) {
    return { reply: URGENT_MESSAGE };
  }

  // Time preferences.
  if (has(t, ["after work", "pēc darba", "vakarā", "after-work"])) {
    return {
      reply:
        "Paldies, meklēšu laikus pēc darba. Šeit ir daži paraugvarianti, kas der.",
      updatePreferences: { timeOfDay: "after-work" },
      runFindSlots: true,
    };
  }
  if (has(t, ["friday morning", "piektdienas rīt", "piektdien no rīta"])) {
    return {
      reply: "Sapratu, piektdienas rīts. Šie paraugvarianti atbilst.",
      updatePreferences: { weekday: "friday", timeOfDay: "morning" },
      runFindSlots: true,
    };
  }
  if (has(t, ["morning", "rīt", "no rīta"])) {
    return {
      reply: "Labi, rīti. Šeit ir paraugvarianti.",
      updatePreferences: { timeOfDay: "morning" },
      runFindSlots: true,
    };
  }
  if (has(t, ["afternoon", "pēcpusdien", "dienas vidū"])) {
    return {
      reply: "Pēcpusdienas. Šeit ir paraugvarianti.",
      updatePreferences: { timeOfDay: "afternoon" },
      runFindSlots: true,
    };
  }

  // Hesitation reasons.
  if (has(t, ["feel fine", "jūtos labi", "vai man tiešām", "kāpēc man", "nav jēgas"])) {
    return {
      reply:
        `${REFERENCE_NOTES[0].text} Kas tieši liek šaubīties par aiziešanu: iemesls, procedūra, iespējamais rezultāts vai vienkārši laiks?`,
    };
  }
  if (has(t, ["afraid", "scared", "baidos", "bail", "nervoz", "satrauc"])) {
    return {
      reply:
        "Tā ir ļoti saprotama sajūta. Dalība ir tava izvēle, un vispirms vari uzdot iestādei jebkurus jautājumus. Vai palīdzētu apskatīt laikus, kas der tavai nedēļai, bez nekādām saistībām?",
    };
  }
  if (has(t, ["no time", "nav laika", "aizņemts", "darba grafik"])) {
    return {
      reply:
        "Laiks ir visbiežākais šķērslis. Pasaki, kad tev tiešām būtu ērti (nedēļas diena vai rīts, pēcpusdiena, pēc darba), un es parādīšu paraugvariantus.",
      updatePreferences: { concern: "no-time" },
    };
  }
  if (has(t, ["not now", "later", "negribu", "ne tagad", "vēlāk", "varbūt vēlāk"])) {
    return {
      reply:
        "Tas ir pilnīgi normāli, nav nekāda spiediena, un atteikšanās tagad neliedz izlemt vēlāk. Es būšu šeit, ja vēlēsies apskatīt vēlreiz.",
      updatePreferences: { concern: "not-now" },
    };
  }

  // Default.
  return {
    reply:
      "Es varu palīdzēt to pārdomāt, bez spiediena. Kas tev prātā saistībā ar skrīningu? Vai pasaki, kad tev būtu laiks (nedēļas diena vai rīts, pēcpusdiena, pēc darba).",
  };
}
