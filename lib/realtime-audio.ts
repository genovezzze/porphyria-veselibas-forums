export const TRANSCRIPTION_KEYWORDS = [
  "Piearsta.lv",
  "pieraksts",
  "pierakstīties",
  "ārsts",
  "Ventspils",
  "Google Calendar",
  "poliklīnika",
  "slimnīca",
  "kardiologs",
  "neirologs",
  "dermatologs",
  "ginekologs",
  "otolaringologs",
  "кардиолог",
  "невролог",
  "дерматолог",
  "гинеколог",
] as const;

export function buildRealtimeInputAudioConfig() {
  return {
    transcription: {
      model: "gpt-live-transcribe",
      prompt: `The speaker may switch between Latvian and Russian. Preserve the spoken language. This is a healthcare appointment conversation in Ventspils, Latvia. Expected terms: ${TRANSCRIPTION_KEYWORDS.join(
        ", "
      )}.`,
    },
    noise_reduction: { type: "far_field" as const },
    turn_detection: {
      type: "server_vad" as const,
      threshold: 0.4,
      prefix_padding_ms: 500,
      silence_duration_ms: 800,
    },
  };
}
