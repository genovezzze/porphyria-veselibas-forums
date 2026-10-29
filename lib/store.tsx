"use client";

import * as React from "react";
import type {
  Preferences,
  BusyInterval,
  PlanItem,
  MatchedOption,
  TimeOfDay,
  Referral,
  BookingStage,
  ConfirmedBooking,
  CareMatch,
} from "./types";
import { buildDemoSlots } from "./fixtures";
import { findDemoSlots, decorate } from "./slots";
import { rigaToday } from "./date";

// Browser-local demo mode. This is NOT a connected database — it is clearly
// labeled as sample data held only in this browser session.

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  channel: "text" | "voice";
}

interface DemoState {
  today: string;
  preferences: Preferences;
  busy: BusyInterval[];
  calendarConnected: boolean;
  careMatches: CareMatch[];
  referral: Referral;
  bookingStage: BookingStage;
  confirmedBooking: ConfirmedBooking | null;
  plan: PlanItem[];
  messages: ChatMessage[];
}

const DEFAULT_PREFS: Preferences = {
  timeOfDay: "any",
  weekday: null,
  concern: null,
};

function initialState(): DemoState {
  const today = rigaToday();
  return {
    today,
    preferences: DEFAULT_PREFS,
    busy: [],
    calendarConnected: false,
    careMatches: [],
    referral: {
      id: "ref-mammography-2026",
      patientName: "Anna Bērziņa",
      examination: "mamogrāfijas skrīnings",
      city: "Ventspils",
      issuedBy: "ģimenes ārsts",
      issuedAt: today,
      status: "new",
    },
    bookingStage: "referral_received",
    confirmedBooking: null,
    plan: [],
    messages: [],
  };
}

const STORAGE_KEY = "next-step-demo-v1";

interface StoreCtx extends DemoState {
  hydrated: boolean;
  options: MatchedOption[];
  setPreferences: (p: Preferences) => void;
  setTimeOfDay: (t: TimeOfDay) => void;
  setBusy: (b: BusyInterval[]) => void;
  setCalendarConnected: (connected: boolean) => void;
  setCareMatches: (matches: CareMatch[]) => void;
  setBookingStage: (stage: BookingStage) => void;
  setReferralStatus: (status: Referral["status"]) => void;
  confirmBooking: (booking: ConfirmedBooking) => void;
  addMessage: (m: Omit<ChatMessage, "id">) => void;
  // Insert a message with a known id, or replace its content if it already exists.
  upsertMessage: (m: ChatMessage) => void;
  removeMessage: (id: string) => void;
  // Start a fresh conversation; keeps the saved plan and preferences.
  clearConversation: () => void;
  savePlan: (slotId: string) => void;
  removePlan: (slotId: string) => void;
  markBooked: (slotId: string) => void;
  optionById: (slotId: string) => MatchedOption | null;
  resetDemo: () => void;
}

const Ctx = React.createContext<StoreCtx | null>(null);

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<DemoState>(initialState);
  const [hydrated, setHydrated] = React.useState(false);

  // Load from localStorage once on mount.
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as DemoState;
        const fresh = initialState();
        // Keep the stored demo week fresh if the date rolled over.
        if (parsed.today !== rigaToday()) {
          setState(initialState());
        } else {
          // Calendar availability is session data. Never restore an old or
          // demo schedule and present it as current Google Calendar data.
          setState({
            ...fresh,
            ...parsed,
            busy: [],
            calendarConnected: false,
            careMatches: [],
          });
        }
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  // Persist on change.
  React.useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore quota / privacy mode */
    }
  }, [state, hydrated]);

  const options = React.useMemo(
    () => findDemoSlots(buildDemoSlots(state.today), state.busy, state.preferences),
    [state.today, state.busy, state.preferences]
  );

  const api: StoreCtx = {
    ...state,
    hydrated,
    options,
    setPreferences: (preferences) => setState((s) => ({ ...s, preferences })),
    setTimeOfDay: (timeOfDay) =>
      setState((s) => ({ ...s, preferences: { ...s.preferences, timeOfDay } })),
    setBusy: (busy) => setState((s) => ({ ...s, busy })),
    setCalendarConnected: (calendarConnected) =>
      setState((s) => ({ ...s, calendarConnected })),
    setCareMatches: (careMatches) => setState((s) => ({ ...s, careMatches })),
    setBookingStage: (bookingStage) =>
      setState((s) => ({ ...s, bookingStage })),
    setReferralStatus: (status) =>
      setState((s) => ({
        ...s,
        referral: { ...s.referral, status },
      })),
    confirmBooking: (confirmedBooking) =>
      setState((s) => ({
        ...s,
        confirmedBooking,
        bookingStage: "completed",
        referral: { ...s.referral, status: "confirmed" },
      })),
    addMessage: (m) =>
      setState((s) => ({
        ...s,
        messages: [...s.messages, { ...m, id: crypto.randomUUID() }],
      })),
    upsertMessage: (m) =>
      setState((s) =>
        s.messages.some((x) => x.id === m.id)
          ? {
              ...s,
              messages: s.messages.map((x) =>
                x.id === m.id ? { ...x, content: m.content } : x
              ),
            }
          : { ...s, messages: [...s.messages, m] }
      ),
    removeMessage: (id) =>
      setState((s) => ({
        ...s,
        messages: s.messages.filter((x) => x.id !== id),
      })),
    clearConversation: () =>
      setState((s) => ({
        ...s,
        messages: [],
        careMatches: [],
        bookingStage:
          s.referral.status === "confirmed" ? "completed" : "referral_received",
      })),
    savePlan: (slotId) =>
      setState((s) =>
        s.plan.some((p) => p.slotId === slotId)
          ? s
          : {
              ...s,
              plan: [
                ...s.plan,
                { slotId, savedAt: new Date().toISOString(), booked: false },
              ],
            }
      ),
    removePlan: (slotId) =>
      setState((s) => ({
        ...s,
        plan: s.plan.filter((p) => p.slotId !== slotId),
      })),
    markBooked: (slotId) =>
      setState((s) => ({
        ...s,
        plan: s.plan.map((p) =>
          p.slotId === slotId ? { ...p, booked: true } : p
        ),
      })),
    optionById: (slotId) => {
      const slot = buildDemoSlots(state.today).find((x) => x.id === slotId);
      return slot ? decorate(slot) : null;
    },
    resetDemo: () => setState(initialState()),
  };

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useDemo(): StoreCtx {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("useDemo must be used within DemoProvider");
  return ctx;
}
