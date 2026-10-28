// Central, easily-swappable product configuration.
// Product name and city are intentionally soft-coded so the demo can be rebranded.

export const PRODUCT_NAME =
  process.env.NEXT_PUBLIC_PRODUCT_NAME?.trim() || "Personalizēts balss aģents";

// Team name shown in the sidebar header.
export const TEAM_NAME =
  process.env.NEXT_PUBLIC_TEAM_NAME?.trim() || "Porphyria";

export const DEMO_CITY =
  process.env.NEXT_PUBLIC_DEMO_CITY?.trim() || "Riga";

// All demo dates are computed in this timezone.
export const TIMEZONE = "Europe/Riga";

// Demo guardrails.
export const LIMITS = {
  maxMessageChars: 1200,
  maxMessagesPerSession: 60,
  maxVoiceSessionsPerWindow: 5,
  voiceRateWindowMs: 60 * 60 * 1000, // 1 hour
  maxVoiceSessionSeconds: 5 * 60, // conversation length cap
};

// Voice id lives here so it is trivial to swap. Verify availability against
// current OpenAI Realtime docs; "ash" is a calm male-leaning voice.
export const VOICE_ID = process.env.OPENAI_REALTIME_VOICE?.trim() || "ash";
