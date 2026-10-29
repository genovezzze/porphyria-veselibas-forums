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
] as const;

export function buildRealtimeInputAudioConfig() {
  return {
    transcription: {
      model: "gpt-live-transcribe",
      language: "lv",
      prompt: `The speaker uses Latvian. Preserve Latvian spelling and diacritics. This is a healthcare appointment conversation in Ventspils, Latvia. Expected terms: ${TRANSCRIPTION_KEYWORDS.join(
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
