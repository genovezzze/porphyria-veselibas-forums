import { describe, expect, it } from "vitest";
import {
  buildRealtimeInputAudioConfig,
  isAcceptableLatvianTranscript,
  TRANSCRIPTION_KEYWORDS,
} from "@/lib/realtime-audio";

describe("realtime speech recognition", () => {
  it("is configured for Latvian medical speech", () => {
    expect(TRANSCRIPTION_KEYWORDS).toContain("Piearsta.lv");
    const transcription = buildRealtimeInputAudioConfig().transcription;
    expect(transcription.languages).toEqual(["lv"]);
    expect(transcription.keywords).toContain("mamogrāfijas skrīnings");
    expect(transcription.prompt).toContain("latviešu valodā");
  });

  it("uses live transcription and near-field noise reduction", () => {
    const config = buildRealtimeInputAudioConfig();
    expect(config.transcription.model).toBe("gpt-live-transcribe");
    expect(config.noise_reduction.type).toBe("near_field");
    expect(config.turn_detection.prefix_padding_ms).toBeGreaterThanOrEqual(500);
    expect(config.turn_detection.silence_duration_ms).toBeGreaterThanOrEqual(1000);
  });

  it("does not display a Cyrillic transcript as the user's Latvian words", () => {
    expect(isAcceptableLatvianTranscript("Es vēlos pierakstīties.")).toBe(true);
    expect(isAcceptableLatvianTranscript("Скрининг.")).toBe(false);
  });
});
