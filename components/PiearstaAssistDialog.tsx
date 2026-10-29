"use client";

import * as React from "react";
import { Check, Copy, ExternalLink, X } from "lucide-react";
import type { CareMatch } from "@/lib/types";

export function PiearstaAssistDialog({
  match,
  onClose,
  patientName = "",
  onConfirm,
}: {
  match: CareMatch;
  onClose: () => void;
  patientName?: string;
  onConfirm: (confirmedStart: string) => Promise<void>;
}) {
  const [draft, setDraft] = React.useState({
    patientName,
    personalCode: "",
    phone: "",
    email: "",
  });
  const [copied, setCopied] = React.useState(false);
  const [confirmedStart, setConfirmedStart] = React.useState("");
  const [confirming, setConfirming] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const copySummary = async () => {
    const value = [
      `Pacients: ${draft.patientName}`,
      `Personas kods: ${draft.personalCode}`,
      `Tālrunis: ${draft.phone}`,
      `E-pasts: ${draft.email}`,
      `Specialitāte: ${match.specialty}`,
      `Iestāde: ${match.providerName}`,
    ].join("\n");
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="piearsta-assist-title"
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-lg rounded-3xl border border-black/10 bg-white p-5 text-black shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="piearsta-assist-title" className="text-xl font-semibold">
              Sagatavo datus Piearsta.lv
            </h2>
            <p className="mt-1 text-sm text-neutral-600">
              Dati paliek šajā logā un netiek saglabāti. Paroli vai Smart-ID kodus šeit neievadi.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Aizvērt" className="rounded-xl p-2 hover:bg-black/5">
            <X size={18} />
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Vārds un uzvārds" autoComplete="name" value={draft.patientName} onChange={(patientName) => setDraft((old) => ({ ...old, patientName }))} />
          <Field label="Personas kods" autoComplete="off" value={draft.personalCode} onChange={(personalCode) => setDraft((old) => ({ ...old, personalCode }))} />
          <Field label="Tālrunis" autoComplete="tel" value={draft.phone} onChange={(phone) => setDraft((old) => ({ ...old, phone }))} />
          <Field label="E-pasts" autoComplete="email" value={draft.email} onChange={(email) => setDraft((old) => ({ ...old, email }))} />
        </div>

        <p className="mt-4 rounded-2xl bg-black/[0.04] px-3 py-2 text-xs leading-5 text-neutral-600">
          Pārlūks neļauj šai platformai automātiski ievadīt datus citā domēnā. Nokopē sagatavotos datus, atver Piearsta.lv un pats apstiprini izvēlēto laiku.
        </p>

        <label className="mt-4 block text-sm font-medium">
          Piearsta.lv apstiprinātais laiks
          <input
            type="datetime-local"
            value={confirmedStart}
            onChange={(event) => setConfirmedStart(event.target.value)}
            className="mt-1 block h-10 w-full rounded-xl border border-black/10 px-3 font-normal outline-none focus:border-[#1a73e8] focus:ring-2 focus:ring-[#1a73e8]/15"
          />
          <span className="mt-1 block text-xs font-normal text-neutral-500">
            Ievadi tikai laiku, kuru Piearsta.lv tiešām apstiprināja.
          </span>
        </label>

        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={copySummary}
            className="inline-flex h-10 items-center gap-2 rounded-2xl border border-black/10 bg-white px-4 text-sm font-medium hover:bg-black/5"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? "Nokopēts" : "Kopēt datus"}
          </button>
          <a
            href={match.bookingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 items-center gap-2 rounded-2xl bg-[#1a73e8] px-4 text-sm font-medium text-white hover:bg-[#1765cc]"
          >
            Atvērt Piearsta.lv <ExternalLink size={15} />
          </a>
          <button
            type="button"
            disabled={!confirmedStart || confirming}
            onClick={async () => {
              setError(null);
              setConfirming(true);
              try {
                await onConfirm(confirmedStart);
                onClose();
              } catch (cause) {
                setError(
                  cause instanceof Error
                    ? cause.message
                    : "Neizdevās saglabāt pierakstu."
                );
              } finally {
                setConfirming(false);
              }
            }}
            className="inline-flex h-10 items-center gap-2 rounded-2xl bg-[#137333] px-4 text-sm font-medium text-white hover:bg-[#0f5d29] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Check size={15} />
            {confirming ? "Saglabā…" : "Pieraksts apstiprināts"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  autoComplete,
  onChange,
}: {
  label: string;
  value: string;
  autoComplete: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-sm font-medium">
      {label}
      <input
        value={value}
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 block h-10 w-full rounded-xl border border-black/10 px-3 font-normal outline-none focus:border-[#1a73e8] focus:ring-2 focus:ring-[#1a73e8]/15"
      />
    </label>
  );
}
