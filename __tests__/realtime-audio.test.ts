import { describe, expect, it } from "vitest";
import {
  buildRealtimeInputAudioConfig,
  TRANSCRIPTION_KEYWORDS,
} from "@/lib/realtime-audio";

describe("realtime speech recognition", () => {
  it("supports Latvian and Russian code-switching", () => {
    expect(TRANSCRIPTION_KEYWORDS).toContain("Piearsta.lv");
    expect(TRANSCRIPTION_KEYWORDS).toContain("кардиолог");
    expect(buildRealtimeInputAudioConfig().transcription.prompt).toContain(
      "Latvian and Russian"
    );
  });

  it("uses live transcription and far-field noise reduction", () => {
    const config = buildRealtimeInputAudioConfig();
    expect(config.transcription.model).toBe("gpt-live-transcribe");
    expect(config.noise_reduction.type).toBe("far_field");
    expect(config.turn_detection.prefix_padding_ms).toBeGreaterThanOrEqual(500);
    expect(config.turn_detection.silence_duration_ms).toBeGreaterThanOrEqual(700);
  });
});
