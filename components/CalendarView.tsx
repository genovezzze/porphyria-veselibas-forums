"use client";

import * as React from "react";
import { CalendarPlus, ExternalLink, RefreshCw } from "lucide-react";
import { useDemo } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type CalendarSource = "loading" | "google" | "disconnected" | "upgrade" | "error";

export function CalendarView() {
  const demo = useDemo();
  const monthStart = `${demo.today.slice(0, 7)}-01`;
  const [year, month] = monthStart.split("-").map(Number);
  const monthEnd = `${month === 12 ? year + 1 : year}-${String(
    month === 12 ? 1 : month + 1
  ).padStart(2, "0")}-01`;
  const [source, setSource] = React.useState<CalendarSource>("loading");
  const [syncing, setSyncing] = React.useState(false);
  const [seeding, setSeeding] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [embedUrl, setEmbedUrl] = React.useState<string | null>(null);
  const [openUrl, setOpenUrl] = React.useState("https://calendar.google.com/calendar/u/0/r/week");
  const [frameKey, setFrameKey] = React.useState(0);

  async function loadGoogleCalendar() {
    setSyncing(true);
    try {
      const statusResponse = await fetch("/api/google-calendar/status", { cache: "no-store" });
      const status = await statusResponse.json();
      if (!status.connected) {
        setSource("disconnected");
        return;
      }
      if (status.needsReconnect) {
        setSource("upgrade");
        return;
      }

      const [eventsResponse, embedResponse] = await Promise.all([
        fetch("/api/google-calendar/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            startDate: monthStart,
            endDate: monthEnd,
          }),
        }),
        fetch("/api/google-calendar/embed", { cache: "no-store" }),
      ]);
      if (eventsResponse.status === 403 || embedResponse.status === 403) {
        setSource("upgrade");
        return;
      }
      if (!eventsResponse.ok || !embedResponse.ok) throw new Error("calendar loading failed");

      const [data, embed] = await Promise.all([eventsResponse.json(), embedResponse.json()]);
      demo.setBusy(
        (data.events || []).map((event: { start: string; end: string; title: string }) => ({
          start: event.start,
          end: event.end,
          label: event.title,
        }))
      );
      setEmbedUrl(embed.embedUrl);
      setOpenUrl(embed.openUrl);
      setSource("google");
      setFrameKey((key) => key + 1);
    } catch {
      setSource("error");
    } finally {
      setSyncing(false);
    }
  }

  async function addTestEvents() {
    setSeeding(true);
    setMessage(null);
    try {
      const response = await fetch("/api/google-calendar/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monthStart }),
      });
      if (response.status === 403) {
        setSource("upgrade");
        return;
      }
      if (!response.ok) throw new Error("seed failed");
      const data = await response.json();
      setMessage(
        data.created > 0
          ? `Pievienoti ${data.created} testa ieraksti.`
          : "Testa ieraksti šim mēnesim jau ir kalendārā."
      );
      await loadGoogleCalendar();
    } catch {
      setMessage("Testa ierakstus neizdevās pievienot.");
    } finally {
      setSeeding(false);
    }
  }

  React.useEffect(() => {
    void loadGoogleCalendar();
    // Load the calendar once when the tab opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (source !== "google" || !embedUrl) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center">
        <Card className="w-full max-w-md p-6 text-center">
          <h2 className="text-xl font-semibold text-black">Google Calendar</h2>
          <p className="mt-2 text-[14px] text-muted">
            {source === "loading" && "Ielādē kalendāru…"}
            {source === "disconnected" && "Pieslēdz Google Calendar, lai šeit redzētu savus ierakstus."}
            {source === "upgrade" && "Atjaunini Google piekļuvi, lai varētu rādīt un pievienot testa ierakstus."}
            {source === "error" && "Google Calendar neizdevās ielādēt."}
          </p>
          {(source === "disconnected" || source === "upgrade") && (
            <a
              href="/api/google-calendar/connect?return=calendar"
              className="mt-4 inline-flex h-10 items-center justify-center rounded-2xl border border-line bg-white px-4 text-[14px] font-medium text-black hover:bg-background"
            >
              {source === "upgrade" ? "Atjaunināt Google piekļuvi" : "Pieslēgt Google Calendar"}
            </a>
          )}
          {source === "error" && (
            <Button
              variant="secondary"
              onClick={loadGoogleCalendar}
              className="mt-4 h-10 min-h-0 rounded-2xl px-4 text-[14px]"
            >
              Mēģināt vēlreiz
            </Button>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
        {message && <p className="mr-auto text-[13px] text-muted">{message}</p>}
        <Button
          variant="secondary"
          onClick={addTestEvents}
          disabled={seeding}
          className="h-10 min-h-0 rounded-2xl px-4 text-[14px]"
        >
          <CalendarPlus size={16} />
          {seeding ? "Pievieno…" : "Pievienot testa ierakstus"}
        </Button>
        <Button
          variant="secondary"
          onClick={loadGoogleCalendar}
          disabled={syncing}
          className="h-10 min-h-0 rounded-2xl px-4 text-[14px]"
        >
          <RefreshCw size={16} className={syncing ? "animate-spin" : ""} />
          Atjaunot
        </Button>
      </div>

      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
        <iframe
          key={frameKey}
          title="Mans Google Calendar"
          src={embedUrl}
          className="block min-h-0 w-full flex-1 border-0 bg-white"
          loading="eager"
          referrerPolicy="strict-origin-when-cross-origin"
        />
        <div className="flex shrink-0 justify-end border-t border-line px-3 py-1.5">
          <a
            href={openUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[12px] font-medium text-accent hover:underline"
          >
            Atvērt Google Calendar <ExternalLink size={13} />
          </a>
        </div>
      </Card>
    </div>
  );
}
