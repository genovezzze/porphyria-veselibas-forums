"use client";

import { MapPin, Clock, Tag, Info } from "lucide-react";
import { Card, Badge } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { MatchedOption } from "@/lib/types";

export function OptionCard({
  option,
  saved,
  onSave,
}: {
  option: MatchedOption;
  saved: boolean;
  onSave: (slotId: string) => void;
}) {
  const { center } = option;
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[19px] font-semibold text-ink">{center.name}</h3>
          <p className="text-[16px] text-muted">{center.service}</p>
        </div>
        <Badge>Paraugdati</Badge>
      </div>

      <div className="mt-4 space-y-2 text-[16px] text-ink">
        <div className="flex items-center gap-2">
          <Clock size={18} className="text-primary" />
          <span className="font-medium">{option.label}</span>
        </div>
        <div className="flex items-center gap-2 text-muted">
          <MapPin size={18} className="text-primary" />
          {center.district} · {center.address}
        </div>
        <div className="flex items-center gap-2 text-muted">
          <Clock size={18} className="text-primary" />
          ~{option.travelMinutes} min ceļā (tikai piemērs)
        </div>
        <div className="flex items-center gap-2 text-muted">
          <Tag size={18} className="text-primary" />
          {center.priceEur === null
            ? "Iekļauts uzaicinājumā (paraugs)"
            : center.priceEur === 0
            ? "Bez maksas (paraugs)"
            : `€${center.priceEur} piemēra līdzmaksājums`}
        </div>
        <div className="flex items-start gap-2 text-[14px] text-muted">
          <Info size={16} className="mt-0.5 text-muted" />
          {center.conditions} · {center.source}
        </div>
      </div>

      <div className="mt-5">
        <Button
          variant={saved ? "secondary" : "primary"}
          onClick={() => onSave(option.id)}
          disabled={saved}
          className="w-full"
        >
          {saved ? "Saglabāts plānā" : "Saglabāt plānā"}
        </Button>
      </div>
    </Card>
  );
}
