import { z } from "zod";
import type { Preferences, BusyInterval, MatchedOption, CareMatch } from "./types";
import { buildDemoSlots } from "./fixtures";
import { findDemoSlots } from "./slots";
import { findVentspilsCare } from "./ventspils-care";

// Tool argument schemas. The server validates every tool call before executing
// any action, so the model can never trigger an unchecked side effect.

export const timeOfDaySchema = z.enum([
  "morning",
  "afternoon",
  "after-work",
  "any",
]);

export const weekdaySchema = z.enum([
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
]);

export const updatePreferencesSchema = z.object({
  timeOfDay: timeOfDaySchema.optional(),
  weekday: weekdaySchema.nullable().optional(),
  concern: z
    .enum([
      "dont-understand",
      "afraid-procedure",
      "afraid-result",
      "no-time",
      "not-now",
    ])
    .nullable()
    .optional(),
});

export const findDemoSlotsSchema = z.object({});

export const selectDemoOptionSchema = z.object({
  slotId: z.string().min(1).max(64),
});

export const findVentspilsCareSchema = z.object({
  location: z.string().min(2).max(160),
  specialty: z.string().min(2).max(100),
  durationMinutes: z.number().int().min(30).max(180).optional(),
});

export type UpdatePreferencesArgs = z.infer<typeof updatePreferencesSchema>;

// OpenAI-compatible tool definitions (function calling).
export const TOOL_DEFS = [
  {
    type: "function" as const,
    function: {
      name: "find_ventspils_care",
      description:
        "Find suitable official Ventspils healthcare providers and the person's free Google Calendar windows. Call only after both location and requested doctor or specialty are known.",
      parameters: {
        type: "object",
        properties: {
          location: {
            type: "string",
            description: "The person's starting address, district, or postcode.",
          },
          specialty: {
            type: "string",
            description: "Requested doctor, specialty, or examination.",
          },
          durationMinutes: {
            type: "integer",
            minimum: 30,
            maximum: 180,
          },
        },
        required: ["location", "specialty"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "update_preferences",
      description:
        "Update the person's scheduling preferences when they express a time of day, a weekday, or a reason for hesitating.",
      parameters: {
        type: "object",
        properties: {
          timeOfDay: {
            type: "string",
            enum: ["morning", "afternoon", "after-work", "any"],
          },
          weekday: {
            type: ["string", "null"],
            enum: [
              "monday",
              "tuesday",
              "wednesday",
              "thursday",
              "friday",
              "saturday",
              "sunday",
              null,
            ],
          },
          concern: {
            type: ["string", "null"],
            enum: [
              "dont-understand",
              "afraid-procedure",
              "afraid-result",
              "no-time",
              "not-now",
              null,
            ],
          },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "find_demo_slots",
      description:
        "Return matching fictional demo appointment options for the current preferences and calendar. Never invents data.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "select_demo_option",
      description:
        "Mark a specific demo option as the person's chosen one. Only call after the person explicitly chooses it.",
      parameters: {
        type: "object",
        properties: { slotId: { type: "string" } },
        required: ["slotId"],
        additionalProperties: false,
      },
    },
  },
];

// Realtime uses the same function schema without the Chat Completions
// `function` wrapper. Demo-only tools are intentionally unavailable to voice.
export const REALTIME_TOOL_DEFS = TOOL_DEFS.filter(({ function: fn }) =>
  ["find_ventspils_care", "update_preferences"].includes(fn.name)
).map(({ function: fn }) => ({
  type: "function" as const,
  name: fn.name,
  description: fn.description,
  parameters: fn.parameters,
}));

export interface ToolContext {
  preferences: Preferences;
  busy: BusyInterval[];
  today: string;
  calendarConnected: boolean;
}

export interface ToolResult {
  ok: boolean;
  error?: string;
  // Possibly-updated preferences (for update_preferences).
  preferences?: Preferences;
  // Options list (for find_demo_slots).
  options?: MatchedOption[];
  // Chosen slot id (for select_demo_option).
  selectedSlotId?: string;
  careMatches?: CareMatch[];
}

export function mergePreferences(
  current: Preferences,
  patch: UpdatePreferencesArgs
): Preferences {
  return {
    timeOfDay: patch.timeOfDay ?? current.timeOfDay,
    weekday: patch.weekday === undefined ? current.weekday : patch.weekday,
    concern: patch.concern === undefined ? current.concern : patch.concern,
  };
}

/**
 * Deterministic server-side execution of a validated tool call.
 * Returns a structured result; never throws on bad model input.
 */
export function executeTool(
  name: string,
  rawArgs: unknown,
  ctx: ToolContext
): ToolResult {
  switch (name) {
    case "update_preferences": {
      const parsed = updatePreferencesSchema.safeParse(rawArgs);
      if (!parsed.success) return { ok: false, error: "Invalid arguments." };
      const preferences = mergePreferences(ctx.preferences, parsed.data);
      const options = ctx.calendarConnected
        ? findDemoSlots(buildDemoSlots(ctx.today), ctx.busy, preferences)
        : undefined;
      return { ok: true, preferences, options };
    }
    case "find_demo_slots": {
      if (!ctx.calendarConnected) {
        return {
          ok: false,
          error: "Connect Google Calendar before searching for free times.",
        };
      }
      const options = findDemoSlots(
        buildDemoSlots(ctx.today),
        ctx.busy,
        ctx.preferences
      );
      return { ok: true, options };
    }
    case "select_demo_option": {
      const parsed = selectDemoOptionSchema.safeParse(rawArgs);
      if (!parsed.success) return { ok: false, error: "Invalid arguments." };
      const exists = buildDemoSlots(ctx.today).some(
        (s) => s.id === parsed.data.slotId
      );
      if (!exists) return { ok: false, error: "Unknown slot." };
      return { ok: true, selectedSlotId: parsed.data.slotId };
    }
    case "find_ventspils_care": {
      const parsed = findVentspilsCareSchema.safeParse(rawArgs);
      if (!parsed.success) return { ok: false, error: "Invalid arguments." };
      if (!ctx.calendarConnected) {
        return {
          ok: false,
          error:
            "Google Calendar is not connected or its current availability could not be loaded. Ask the user to connect or refresh Google Calendar before suggesting times.",
        };
      }
      const careMatches = findVentspilsCare({
        ...parsed.data,
        busy: ctx.busy,
        today: ctx.today,
      });
      return { ok: true, careMatches };
    }
    default:
      return { ok: false, error: "Unknown tool." };
  }
}
