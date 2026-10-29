import { describe, expect, it } from "vitest";
import { buildSystemPrompt } from "@/lib/agent";

describe("booking conversation order", () => {
  it("requires the assistant to understand the problem before location", () => {
    const prompt = buildSystemPrompt();
    const problem = prompt.indexOf("SĀC AR PROBLĒMU");
    const location = prompt.indexOf("Tikai pēc lietotāja apstiprinājuma");

    expect(problem).toBeGreaterThanOrEqual(0);
    expect(location).toBeGreaterThan(problem);
    expect(prompt).toContain(
      "Nekad nejautā atrašanās vietu, pirms nav saprasta problēma"
    );
  });
});
