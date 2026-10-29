export const TRANSCRIPTION_KEYWORDS = [
  "Piearsta.lv",
  "pieraksts",
  "pierakstīties",
  "ārsts",
  "ģimenes ārsts",
  "nosūtījums",
  "skrīnings",
  "mamogrāfija",
  "mamogrāfijas skrīnings",
  "pārbaude",
  "izmeklējums",
  "rezultāti",
  "šaubos",
  "Ventspils",
  "Google Calendar",
  "poliklīnika",
  "slimnīca",
  "kardiologs",
  "neirologs",
  "dermatologs",
  "ginekologs",
  "otolaringologs",
] as const;

export function buildRealtimeInputAudioConfig() {
  return {
    transcription: {
      model: "gpt-live-transcribe",
      languages: ["lv"],
      prompt:
        "Saruna latviešu valodā par veselības pārbaudi, nosūtījumu un pierakstu pie ārsta Ventspilī.",
      keywords: [...TRANSCRIPTION_KEYWORDS],
    },
    noise_reduction: { type: "near_field" as const },
    turn_detection: {
      type: "server_vad" as const,
      threshold: 0.4,
      prefix_padding_ms: 700,
      silence_duration_ms: 1100,
    },
  };
}

export function isAcceptableLatvianTranscript(text: string) {
  const normalized = text.trim();
  if (!normalized) return false;
  return !/[\u0400-\u04ff]/u.test(normalized);
}
