"use client";

import * as React from "react";
import {
  ArrowUp,
  Paperclip,
  HelpCircle,
  HeartPulse,
  MapPin,
  ExternalLink,
  Navigation,
  CheckCircle2,
  FileText,
} from "lucide-react";
import { useDemo } from "@/lib/store";
import { LIMITS, PRODUCT_NAME } from "@/lib/config";
import { useTypewriter } from "@/lib/use-typewriter";
import { addDays } from "@/lib/date";
import { PiearstaAssistDialog } from "@/components/PiearstaAssistDialog";
import type { BookingStage } from "@/lib/types";

// Hero title: the last two words ("balss aģents") get the gradient effect.
const TITLE_WORDS = PRODUCT_NAME.split(" ");
const TITLE_HEAD = TITLE_WORDS.slice(0, -2).join(" ");
const TITLE_TAIL = TITLE_WORDS.slice(-2).join(" ");

// Calm, open questions that invite a conversation (no pressure, no fear).
const PROMPTS = [
  "Kas tevi attur no pārbaudes?",
  "Jūties labi, bet šaubies, vai tas vajadzīgs?",
  "Kas tevi visvairāk satrauc procedūrā?",
  "Kad tev būtu ērti aiziet?",
  "Ko tu gribētu uzzināt par skrīningu?",
  "Palīdzi atrast ārstu Ventspilī",
] as const;

const STARTERS: {
  text: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}[] = [
  { text: "Es jūtos labi. Vai man tiešām vajag šo skrīningu?", label: "Vai man tas vajadzīgs?", icon: HelpCircle, color: "text-accent" },
  { text: "Es mazliet baidos no procedūras.", label: "Baidos no procedūras", icon: HeartPulse, color: "text-accent" },
  { text: "Man vajag pierakstu pie ārsta Ventspilī.", label: "Atrast ārstu Ventspilī", icon: MapPin, color: "text-accent" },
];

export function Chat({ onOptions }: { onOptions: () => void }) {
  const demo = useDemo();
  const [input, setInput] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [mode, setMode] = React.useState<"openai" | "scripted" | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [bookingMatch, setBookingMatch] = React.useState<(typeof demo.careMatches)[number] | null>(null);
  const endRef = React.useRef<HTMLDivElement | null>(null);
  // Typing prompts only on the empty start screen, not once a conversation exists.
  const typed = useTypewriter(PROMPTS, input.length === 0 && demo.messages.length === 0);

  React.useEffect(() => {
    if (
      demo.hydrated &&
      demo.messages.length === 0 &&
      demo.referral.status === "new" &&
      demo.bookingStage === "referral_received"
    ) {
      demo.addMessage({
        role: "assistant",
        channel: "text",
        content: `Labdien, ${demo.referral.patientName}! Tavs ${demo.referral.issuedBy} ir izrakstījis nosūtījumu uz ${demo.referral.examination}. Es varu palīdzēt sagatavot pierakstu. Kas tevi visvairāk satrauc: pati pārbaude, iespējamais rezultāts vai laika atrašana?`,
      });
      demo.setReferralStatus("contacted");
      demo.setBookingStage("concern_identification");
    }
  }, [
    demo.hydrated,
    demo.messages.length,
    demo.referral.status,
    demo.bookingStage,
  ]);

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [demo.messages.length]);

  React.useEffect(() => {
    if (demo.messages.length === 0) demo.setCareMatches([]);
  }, [demo.messages.length]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    setError(null);
    setInput("");
    demo.addMessage({ role: "user", content, channel: "text" });
    setBusy(true);

    const requestStage = nextBookingStage(demo.bookingStage, content);
    if (requestStage !== demo.bookingStage) {
      demo.setBookingStage(requestStage);
      if (requestStage === "calendar_check") demo.setReferralStatus("booking");
    }

    let currentBusy: typeof demo.busy = [];
    let calendarConnected = false;
    try {
      const statusResponse = await fetch("/api/google-calendar/status", {
        cache: "no-store",
      });
      const status = statusResponse.ok ? await statusResponse.json() : null;
      if (!status?.connected || status?.needsReconnect) {
        demo.setBusy([]);
        demo.setCalendarConnected(false);
      } else {
      const rangeStart = demo.today;
      const rangeEnd = addDays(demo.today, 32);
      const calendarResponse = await fetch("/api/google-calendar/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startDate: rangeStart, endDate: rangeEnd }),
      });
      if (calendarResponse.ok) {
        const calendarData = await calendarResponse.json();
        currentBusy = (calendarData.events || []).map(
          (event: { start: string; end: string; title: string }) => ({
            start: event.start,
            end: event.end,
            label: event.title,
          })
        );
        demo.setBusy(currentBusy);
        calendarConnected = true;
        demo.setCalendarConnected(true);
      } else {
        demo.setBusy([]);
        demo.setCalendarConnected(false);
      }
      }
    } catch {
      // Never reuse stale or demo availability when Google Calendar is unavailable.
      currentBusy = [];
      demo.setBusy([]);
      demo.setCalendarConnected(false);
    }

    const history = [
      ...demo.messages.map((m) => ({ role: m.role, content: m.content })),
      { role: "user" as const, content },
    ].slice(-LIMITS.maxMessagesPerSession);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history,
          preferences: demo.preferences,
          busy: currentBusy,
          calendarConnected,
          today: demo.today,
          referral: demo.referral,
          bookingStage: requestStage,
        }),
      });
      if (!res.ok) throw new Error("http " + res.status);
      const data = await res.json();
      setMode(data.mode);
      if (data.preferences) demo.setPreferences(data.preferences);
      if (Array.isArray(data.careMatches)) {
        demo.setCareMatches(data.careMatches);
        if (data.careMatches.length > 0) {
          demo.setBookingStage("provider_search");
        }
      }
      demo.addMessage({ role: "assistant", content: data.reply, channel: "text" });
      if (data.options && data.options.length >= 0) onOptions();
    } catch {
      setError("Neizdevās sazināties ar asistentu. Lūdzu, mēģini vēlreiz.");
      demo.addMessage({
        role: "assistant",
        content: "Atvaino, tikko neizdevās atbildēt. Lūdzu, pamēģini pēc brīža vēlreiz.",
        channel: "text",
      });
    } finally {
      setBusy(false);
    }
  }

  const empty = demo.messages.length === 0;

  function formatSuggestedTime(value: string): string {
    const [date, time] = value.split("T");
    const [, month, day] = date.split("-");
    return `${day}.${month}. plkst. ${time}`;
  }

  async function confirmPiearstaBooking(
    match: (typeof demo.careMatches)[number],
    start: string
  ) {
    const end = addMinutes(start, 60);
    const res = await fetch("/api/google-calendar/create-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        summary: `${demo.referral.examination} · ${match.providerName}`,
        description:
          "Lietotājs apstiprināja pierakstu Piearsta.lv. Atgādinājumi: 24 stundas un 2 stundas pirms vizītes.",
        location: match.address,
        start,
        end,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (data?.reconnect) {
        throw new Error("Atkārtoti pieslēdz Google Calendar sadaļā “Integrācijas”.");
      }
      throw new Error(data?.error || "Neizdevās pievienot notikumu kalendāram.");
    }
    demo.confirmBooking({
      id: crypto.randomUUID(),
      referralId: demo.referral.id,
      providerName: match.providerName,
      examination: demo.referral.examination,
      address: match.address,
      start,
      end,
      confirmedAt: new Date().toISOString(),
      calendarEventId: data.id,
      calendarEventUrl: data.htmlLink,
    });
    demo.addMessage({
      role: "assistant",
      channel: "text",
      content: `Pieraksts ir apstiprināts un pievienots Google Calendar: ${formatSuggestedTime(
        start
      )}. Atgādinājumus saņemsi 24 stundas un 2 stundas pirms vizītes.`,
    });
  }

  const composer = (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        send(input);
      }}
    >
      <div className="overflow-hidden rounded-2xl border border-black/[0.08] bg-white shadow-[0_10px_40px_rgba(0,0,0,0.08)] transition-shadow focus-within:shadow-[0_10px_40px_rgba(36,116,245,0.22)]">
        <label htmlFor="msg" className="sr-only">Tava ziņa</label>
        <textarea
          id="msg"
          value={input}
          onChange={(e) => setInput(e.target.value.slice(0, LIMITS.maxMessageChars))}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          rows={empty ? 2 : 1}
          placeholder={empty ? typed + "|" : "Raksti ziņu…"}
          className="block w-full resize-none bg-transparent px-4 pt-3.5 pb-3 text-[15px] text-black placeholder:text-neutral-500 focus:outline-none"
        />
        <div className="flex items-center justify-between gap-2 bg-panel px-3 py-2">
          <span
            className="inline-flex items-center gap-2 text-[14px] text-black"
            title="Pielikumi nav pieejami demo"
          >
            <Paperclip size={16} />
          </span>
          <div className="flex items-center gap-2.5">
            <span className="text-[13px] tabular-nums text-black">
              {input.length}/{LIMITS.maxMessageChars}
            </span>
            <button
              type="submit"
              disabled={busy || !input.trim()}
              aria-label="Sūtīt"
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/70 text-black shadow-sm backdrop-blur transition-colors hover:bg-white disabled:opacity-40 enabled:border-transparent enabled:bg-accent enabled:text-white enabled:hover:bg-accent-hover"
            >
              <ArrowUp size={18} />
            </button>
          </div>
        </div>
      </div>
    </form>
  );

  if (empty) {
    return (
      <div className="relative flex h-full w-full flex-col items-center justify-center px-2">
        {/* Purple glow */}
        <div className="pointer-events-none absolute left-1/2 top-[22%] h-64 w-[36rem] max-w-[90%] -translate-x-1/2 rounded-full bg-accent/25 blur-[90px]" />

        <div className="relative w-full max-w-2xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-black sm:text-5xl">
            {TITLE_HEAD && <>{TITLE_HEAD} </>}
            <span className="text-gradient-flow">
              {TITLE_TAIL}
            </span>
          </h1>
          <p className="mx-auto mt-3 text-[17px] sm:whitespace-nowrap text-black">
            Pastāsti, kas tev vajadzīgs. Asistents sarunā precizēs vietu un ārstu.
          </p>

          <div className="mt-8">{composer}</div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {STARTERS.map((s) => (
              <button
                key={s.text}
                onClick={() => send(s.text)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-black/[0.08] bg-panel px-3 py-2 text-[14px] font-medium text-black transition-colors hover:bg-panel-hover"
              >
                <s.icon className={"h-4 w-4 " + s.color} />
                {s.label}
              </button>
            ))}
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[68vh] max-h-[86vh] w-full max-w-3xl flex-col rounded-3xl border border-black/[0.08] bg-white p-5 shadow-[0_10px_40px_rgba(0,0,0,0.08)]">
      <div className="mb-3 flex items-center justify-between pl-1">
        <div>
          <h2 className="text-xl font-semibold text-black">Saruna</h2>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-neutral-600">
            <FileText size={13} /> {demo.referral.examination} · {demo.referral.city}
          </p>
        </div>
        {mode && (
          <span className="text-[13px] text-black">
            {mode === "openai" ? "AI asistents" : "Scenārija demo (nav AI atslēgas)"}
          </span>
        )}
      </div>

      <div className="flex-1 space-y-2.5 overflow-y-auto pr-1" aria-live="polite">
        {demo.messages.map((m) => (
          <div
            key={m.id}
            className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
          >
            <div
              className={
                m.role === "user"
                  ? "max-w-[75%] rounded-2xl rounded-br-md bg-accent px-3.5 py-2.5 text-[15px] text-white"
                  : "max-w-[75%] rounded-2xl rounded-bl-md border border-black/10 bg-black/[0.06] px-3.5 py-2.5 text-[15px] text-black"
              }
            >
              {m.channel === "voice" && (
                <span className="mb-0.5 block text-[11px] uppercase tracking-wide opacity-60">
                  {m.role === "user" ? "Es" : "Balss"}
                </span>
              )}
              {m.content}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-md border border-black/10 bg-black/[0.06] px-4 py-3 text-black">
              <span className="inline-flex gap-1">
                <span className="h-2 w-2 animate-bounce rounded-full bg-neutral-500 [animation-delay:-0.3s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-neutral-500 [animation-delay:-0.15s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-neutral-500" />
              </span>
            </div>
          </div>
        )}
        {demo.careMatches.length > 0 && (
          <div className="space-y-2 pt-1">
            {demo.careMatches.map((match) => (
              <div
                key={match.id}
                className="rounded-2xl border border-black/10 bg-white p-3.5 text-black shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-[15px] font-semibold">{match.providerName}</h3>
                    <p className="mt-0.5 text-[13px] text-neutral-600">
                      {match.specialty}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full border border-black/10 bg-black/5 px-2 py-1 text-[11px]">
                    Ventspils
                  </span>
                </div>
                <p className="mt-2 flex items-start gap-1.5 text-[12px] text-neutral-600">
                  <MapPin size={14} className="mt-0.5 shrink-0" /> {match.address}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {match.suggestedTimes.map((time) => (
                    <span
                      key={time}
                      className="rounded-full border border-[#ceead6] bg-[#e6f4ea] px-2.5 py-1 text-[11px] font-medium text-[#137333]"
                    >
                      {formatSuggestedTime(time)}
                    </span>
                  ))}
                </div>
                <p className="mt-2 text-[11px] leading-4 text-neutral-500">
                  {match.availabilityNote}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <a
                    href={match.bookingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-9 items-center gap-1.5 rounded-2xl border border-black/10 bg-white px-3 text-[12px] font-medium text-black hover:bg-black/5"
                  >
                    E-pieraksts <ExternalLink size={13} />
                  </a>
                  <button
                    type="button"
                    onClick={() => setBookingMatch(match)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-2xl border border-black/10 bg-white px-3 text-[12px] font-medium text-black hover:bg-black/5"
                  >
                    Sagatavot pierakstu
                  </button>
                  <a
                    href={match.directionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-9 items-center gap-1.5 rounded-2xl border border-black/10 bg-white px-3 text-[12px] font-medium text-black hover:bg-black/5"
                  >
                    Maršruts <Navigation size={13} />
                  </a>
                  <a
                    href={`tel:${match.phone.replace(/\s/g, "")}`}
                    className="inline-flex h-9 items-center rounded-2xl border border-black/10 bg-white px-3 text-[12px] font-medium text-black hover:bg-black/5"
                  >
                    {match.phone}
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
        {demo.confirmedBooking && (
          <div className="rounded-2xl border border-[#ceead6] bg-[#e6f4ea] p-4 text-[#0f5132]">
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle2 size={18} /> Pieraksts apstiprināts
            </div>
            <p className="mt-1 text-sm">
              {demo.confirmedBooking.providerName} · {formatSuggestedTime(demo.confirmedBooking.start)}
            </p>
            <p className="mt-1 text-xs">Pievienots Google Calendar ar diviem atgādinājumiem.</p>
            {demo.confirmedBooking.calendarEventUrl && (
              <a
                href={demo.confirmedBooking.calendarEventUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold underline"
              >
                Atvērt Google Calendar <ExternalLink size={12} />
              </a>
            )}
          </div>
        )}
        <div ref={endRef} />
      </div>

      {error && <p className="mt-3 text-[15px] text-amber-400">{error}</p>}

      <div className="mt-3">{composer}</div>
      {bookingMatch && (
        <PiearstaAssistDialog
          match={bookingMatch}
          patientName={demo.referral.patientName}
          onConfirm={(start) => confirmPiearstaBooking(bookingMatch, start)}
          onClose={() => setBookingMatch(null)}
        />
      )}
    </div>
  );
}

function nextBookingStage(stage: BookingStage, content: string): BookingStage {
  if (stage === "referral_received") return "concern_identification";
  if (stage === "concern_identification") return "search_consent";
  if (
    stage === "search_consent" &&
    /\b(jā|lūdzu|vēlos|meklē|palīdzi|piekrītu)\b/iu.test(content)
  ) {
    return "calendar_check";
  }
  return stage;
}

function addMinutes(value: string, minutes: number): string {
  const date = new Date(`${value}:00Z`);
  date.setUTCMinutes(date.getUTCMinutes() + minutes);
  return date.toISOString().slice(0, 16);
}
