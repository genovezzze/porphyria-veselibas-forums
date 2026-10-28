"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MatchedOption } from "@/lib/types";

// An explicitly fake booking page. It does NOT send data anywhere and does NOT
// create a medical record. The user returns and may mark the demo status.
export function BookingDialog({
  option,
  onClose,
  onConfirm,
}: {
  option: MatchedOption;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const ref = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-title"
      onClick={onClose}
    >
      <div
        ref={ref}
        tabIndex={-1}
        className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[13px] font-medium text-amber-800">
            Demo pieraksta lapa · nav īsts pieraksts
          </div>
          <button aria-label="Aizvērt" onClick={onClose} className="text-muted">
            <X size={22} />
          </button>
        </div>

        <h2 id="booking-title" className="mt-4 text-2xl font-semibold text-ink">
          {option.center.name}
        </h2>
        <p className="mt-1 text-[17px] text-muted">{option.label}</p>
        <p className="text-[15px] text-muted">
          {option.center.district} · {option.center.address}
        </p>

        <p className="mt-4 rounded-xl border border-line bg-background p-4 text-[15px] text-muted">
          Šī ir imitēta pāreja demonstrācijai. Nekādi dati netiek nosūtīti nevienai
          klīnikai, un netiek izveidots medicīnisks ieraksts. Īstā versijā šeit tu
          turpinātu uz pakalpojuma sniedzēja paša pierakstu.
        </p>

        <div className="mt-6 flex flex-col gap-2">
          <Button onClick={onConfirm}>
            Esmu pierakstījies (atzīmēt demo statusu)
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Atpakaļ
          </Button>
        </div>
      </div>
    </div>
  );
}
