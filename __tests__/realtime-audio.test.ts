import { describe, expect, it } from "vitest";
import {
  buildRealtimeInputAudioConfig,
  TRANSCRIPTION_KEYWORDS,
} from "@/lib/realtime-audio";

describe("realtime speech recognition", () => {
  it("is configured for Latvian medical speech", () => {
    expect(TRANSCRIPTION_KEYWORDS).toContain("Piearsta.lv");
    const transcription = buildRealtimeInputAudioConfig().transcription;
    expect(transcription.language).toBe("lv");
    expect(transcription.prompt).toContain("uses Latvian");
    expect(transcription.prompt).not.toContain("Russian");
  });

  it("uses live transcription and far-field noise reduction", () => {
    const config = buildRealtimeInputAudioConfig();
    expect(config.transcription.model).toBe("gpt-live-transcribe");
    expect(config.noise_reduction.type).toBe("far_field");
    expect(config.turn_detection.prefix_padding_ms).toBeGreaterThanOrEqual(500);
    expect(config.turn_detection.silence_duration_ms).toBeGreaterThanOrEqual(700);
  });
});
