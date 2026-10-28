"use client";

import * as React from "react";
import { Trash2, CheckCircle2, ExternalLink, CalendarPlus } from "lucide-react";
import { useDemo } from "@/lib/store";
import { Card, Badge } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookingDialog } from "./BookingDialog";
import { googleCalendarUrl } from "@/lib/google-calendar";

export function PlanView() {
  const demo = useDemo();
  const [bookingSlot, setBookingSlot] = React.useState<string | null>(null);

  if (demo.plan.length === 0) {
    return (
      <div>
        <h2 className="text-2xl font-semibold text-black">Mans plāns</h2>
        <Card className="mt-4 p-6 text-[16px] text-muted">
          Vēl nekas nav saglabāts. Atrodi variantu sadaļā{" "}
          <span className="font-medium text-ink">Varianti</span> un saglabā to šeit.
        </Card>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold text-black">Mans plāns</h2>
      <p className="mt-1 text-[15px] text-black">
        Saglabātie paraugvarianti. "Pierakstīts" parādās tikai pēc tam, kad tu
        pats to apstiprini.
      </p>

      <div className="mt-4 space-y-3">
        {demo.plan.map((p) => {
          const opt = demo.optionById(p.slotId);
          if (!opt) return null;
          return (
            <Card key={p.slotId} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-[18px] font-semibold text-ink">
                    {opt.center.name}
                  </h3>
                  <p className="text-[16px] text-muted">{opt.label}</p>
                  <p className="text-[15px] text-muted">
                    {opt.center.district} · {opt.center.address}
                  </p>
                </div>
                {p.booked ? (
                  <Badge className="border-green-200 bg-green-50 text-green-700">
                    <CheckCircle2 size={14} /> Pierakstīts (tu apstiprināji)
                  </Badge>
                ) : (
                  <Badge>Saglabāts</Badge>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  variant="primary"
                  onClick={() => setBookingSlot(p.slotId)}
                >
                  <ExternalLink size={18} /> Doties uz pierakstu (demo)
                </Button>
                <a
                  href={googleCalendarUrl(opt)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 text-[17px] font-medium text-ink transition-colors hover:bg-background"
                >
                  <CalendarPlus size={18} className="text-accent" /> Pievienot Google kalendāram
                </a>
                {!p.booked && (
                  <Button
                    variant="secondary"
                    onClick={() => demo.markBooked(p.slotId)}
                  >
                    <CheckCircle2 size={18} /> Esmu pierakstījies
                  </Button>
                )}
                <Button variant="danger" onClick={() => demo.removePlan(p.slotId)}>
                  <Trash2 size={18} /> Noņemt
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {bookingSlot && (
        <BookingDialog
          option={demo.optionById(bookingSlot)!}
          onClose={() => setBookingSlot(null)}
          onConfirm={() => {
            demo.markBooked(bookingSlot);
            setBookingSlot(null);
          }}
        />
      )}
    </div>
  );
}
