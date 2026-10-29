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

  it("continues toward booking when a family doctor already issued a referral", () => {
    const prompt = buildSystemPrompt();

    expect(prompt).toContain("JA ĢIMENES ĀRSTS JAU IR IZRAKSTĪJIS NOSŪTĪJUMU");
    expect(prompt).toContain("Nesūti lietotāju meklēt citu ārstu");
    expect(prompt).toContain("Vai vēlies, lai palīdzu atrast pieraksta laiku?");
    expect(prompt).toContain("Google Calendar un Piearsta.lv");
  });

  it("includes active referral context without asking for known data again", () => {
    const prompt = buildSystemPrompt({
      referral: {
        id: "ref-1",
        patientName: "Anna Bērziņa",
        examination: "mamogrāfijas skrīnings",
        city: "Ventspils",
        issuedBy: "ģimenes ārsts",
        issuedAt: "2026-10-29",
        status: "new",
      },
      bookingStage: "calendar_check",
    });
    expect(prompt).toContain("AKTĪVAIS NOSŪTĪJUMS");
    expect(prompt).toContain("mamogrāfijas skrīnings");
    expect(prompt).toContain("Scenārija posms: calendar_check");
    expect(prompt).toContain("Nejautā to atkārtoti");
  });
});
