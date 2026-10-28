"use client";

import * as React from "react";
import { RefreshCw, Unplug } from "lucide-react";
import { useDemo } from "@/lib/store";
import { Card, Badge } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { addDays, demoWeekDates } from "@/lib/date";
import { buildBusyIntervals } from "@/lib/fixtures";

type ConnectionState =
  | "loading"
  | "not-configured"
  | "disconnected"
  | "upgrade-required"
  | "connected"
  | "error";

function GoogleG({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.62-2.43l-3.24-2.54c-.9.6-2.05.96-3.38.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.39 13.86A6.02 6.02 0 0 1 6.07 12c0-.65.11-1.28.32-1.86V7.52H3.04A10 10 0 0 0 2 12c0 1.61.38 3.14 1.04 4.48l3.35-2.62Z" />
      <path fill="#EA4335" d="M12 6.01c1.47 0 2.79.51 3.83 1.5l2.87-2.88A9.64 9.64 0 0 0 12 2a10 10 0 0 0-8.96 5.52l3.35 2.62C7.18 7.77 9.39 6.01 12 6.01Z" />
    </svg>
  );
}

function GoogleCalendarLogo() {
  return (
    <svg className="h-9 w-9" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#fff" d="M35 8H13a5 5 0 0 0-5 5v22a5 5 0 0 0 5 5h22a5 5 0 0 0 5-5V13a5 5 0 0 0-5-5Z" />
      <path fill="#4285F4" d="M40 20 24 18 8 20v15a5 5 0 0 0 5 5h22a5 5 0 0 0 5-5V20Z" />
      <path fill="#34A853" d="M8 20h16V8H13a5 5 0 0 0-5 5v7Z" />
      <path fill="#FBBC04" d="M24 8v12h16v-7a5 5 0 0 0-5-5H24Z" />
      <path fill="#EA4335" d="M8 20h32v6H8z" />
      <path fill="#fff" d="M17.2 34.9c-.9-.6-1.5-1.5-1.7-2.6l2.1-.9c.1.6.4 1.1.8 1.5.4.4.9.6 1.5.6s1.1-.2 1.5-.5c.4-.4.6-.8.6-1.4s-.2-1.1-.7-1.4c-.5-.4-1.1-.5-1.8-.5h-1.2v-2h1.1c.6 0 1.1-.2 1.5-.5.4-.3.6-.7.6-1.3 0-.5-.2-.9-.5-1.2-.3-.3-.8-.5-1.3-.5s-.9.2-1.3.5c-.3.3-.6.7-.7 1.2l-2-.9c.2-.8.7-1.5 1.4-2.1.7-.6 1.6-.9 2.7-.9 1.2 0 2.2.3 3 .9.8.6 1.2 1.5 1.2 2.5 0 1.2-.6 2.1-1.7 2.7v.1c1.4.6 2.1 1.7 2.1 3.1 0 1.2-.4 2.2-1.3 3-.8.8-1.9 1.2-3.3 1.2-1 0-1.9-.2-2.7-.7Zm10.9-9.5-2.3 1.7-1.1-1.7 4-2.9h1.7v12.8h-2.3V25.4Z" />
    </svg>
  );
}

export function IntegrationsView() {
  const demo = useDemo();
  const days = demoWeekDates(demo.today);
  const [connection, setConnection] =
    React.useState<ConnectionState>("loading");
  const [syncing, setSyncing] = React.useState(false);
  const [lastSync, setLastSync] = React.useState<string | null>(null);
  const [oauthMessage, setOauthMessage] = React.useState<string | null>(null);

  async function syncCalendar() {
    setSyncing(true);
    try {
      const response = await fetch("/api/google-calendar/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: days[0],
          endDate: addDays(days[days.length - 1], 1),
        }),
      });
      if (response.status === 401) {
        setConnection("disconnected");
        return;
      }
      if (response.status === 403) {
        setConnection("upgrade-required");
        return;
      }
      if (!response.ok) throw new Error("calendar sync failed");
      const data = await response.json();
      demo.setBusy(
        (data.events || []).map(
          (event: { start: string; end: string; title: string }) => ({
            start: event.start,
            end: event.end,
            label: event.title,
          })
        )
      );
      setConnection("connected");
      setLastSync(
        new Intl.DateTimeFormat("lv-LV", {
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date())
      );
    } catch {
      setConnection("error");
    } finally {
      setSyncing(false);
    }
  }

  React.useEffect(() => {
    const oauthStatus = new URLSearchParams(window.location.search).get("calendar");
    if (oauthStatus && oauthStatus !== "connected") {
      const messages: Record<string, string> = {
        denied: "Google piekļuve netika apstiprināta.",
        "flow-missing": "Savienojuma sesija beidzās. Mēģini pieslēgt vēlreiz.",
        "flow-invalid": "Savienojuma sesiju neizdevās pārbaudīt. Mēģini vēlreiz.",
        "state-mismatch": "Drošības pārbaude neizdevās. Mēģini pieslēgt vēlreiz.",
        "token-invalid_grant":
          "Google autorizācijas kodu neizdevās apmainīt. Mēģini pieslēgt vēlreiz.",
        "token-invalid_client":
          "Google Client ID vai Client Secret nav pareizs.",
        "scope-missing":
          "Google nepiešķīra kalendāra pieejamības atļauju.",
        "not-configured": "Google OAuth iestatījumi nav pabeigti.",
      };
      setOauthMessage(
        messages[oauthStatus] ||
          `Google Calendar savienojums neizdevās (${oauthStatus}).`
      );
    }

    async function loadConnection() {
      try {
        const response = await fetch("/api/google-calendar/status", {
          cache: "no-store",
        });
        const data = await response.json();
        if (!data.configured) {
          setConnection("not-configured");
        } else if (!data.connected) {
          setConnection("disconnected");
        } else if (data.needsReconnect) {
          setConnection("upgrade-required");
        } else {
          setConnection("connected");
          await syncCalendar();
        }
      } catch {
        setConnection("error");
      }
    }
    void loadConnection();
    // Check once when the integrations screen opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function disconnectCalendar() {
    const response = await fetch("/api/google-calendar/disconnect", {
      method: "POST",
    });
    if (!response.ok) {
      setConnection("error");
      return;
    }
    demo.setBusy(buildBusyIntervals(demo.today));
    setLastSync(null);
    setConnection("disconnected");
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold text-black">Integrācijas</h2>
      <p className="mt-1 text-[15px] text-black">
        Pieslēdz pakalpojumus, kurus asistents drīkst izmantot, lai atrastu tev
        piemērotu pieraksta laiku.
      </p>

      <div className="mt-5 grid gap-4">
        {oauthMessage && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-800"
          >
            {oauthMessage}
          </div>
        )}
        <Card className="overflow-hidden border-[#dadce0] bg-white p-0 shadow-[0_1px_2px_rgba(60,64,67,0.08),0_2px_6px_rgba(60,64,67,0.08)]">
          <div className="grid h-[3px] grid-cols-4" aria-hidden="true">
            <span className="bg-[#4285f4]" />
            <span className="bg-[#ea4335]" />
            <span className="bg-[#fbbc04]" />
            <span className="bg-[#34a853]" />
          </div>
          <div className="flex flex-col gap-3 p-4 [font-family:Arial,sans-serif] sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#f8fafd] ring-1 ring-[#e8eaed]">
                <GoogleCalendarLogo />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-[18px] font-medium tracking-[-0.01em] text-[#202124]">
                    Google Calendar
                  </h3>
                  {connection === "connected" ? (
                    <Badge className="border-[#ceead6] bg-[#e6f4ea] font-medium text-[#137333]">
                      Pieslēgts
                    </Badge>
                  ) : connection === "upgrade-required" ? (
                    <Badge className="border-[#fdd663] bg-[#fef7e0] font-medium text-[#b06000]">
                      Jāatjaunina atļauja
                    </Badge>
                  ) : (
                    <Badge className="border-[#dadce0] bg-[#f8f9fa] font-medium text-[#5f6368]">
                      Notikumu piekļuve
                    </Badge>
                  )}
                </div>
                <p className="mt-0.5 max-w-xl text-[13px] leading-[18px] text-[#5f6368]">
                  Platformā tiek iegults oficiālais Google Calendar skats. API
                  lasa notikumu laikus un pēc tavas darbības var pievienot testa
                  ierakstus.
                </p>
                {lastSync && (
                  <p className="mt-0.5 text-[12px] text-muted">
                    Pieejamība atjaunota plkst. {lastSync}
                  </p>
                )}
                {connection === "loading" && (
                  <p className="mt-2 text-[13px] text-muted">
                    Pārbauda savienojumu…
                  </p>
                )}
                {connection === "not-configured" && (
                  <p className="mt-2 text-[13px] text-amber-700">
                    Administratoram vispirms jānorāda Google OAuth iestatījumi.
                  </p>
                )}
                {connection === "upgrade-required" && (
                  <p className="mt-2 text-[13px] text-amber-700">
                    Pieslēdz vēlreiz, lai atļautu sagatavot oficiālo iegulto
                    kalendāra skatu.
                  </p>
                )}
                {connection === "error" && (
                  <p className="mt-2 text-[13px] text-red-700">
                    Neizdevās ielādēt kalendāru. Mēģini vēlreiz.
                  </p>
                )}
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2">
              {connection === "connected" ? (
                <>
                  <Button
                    variant="secondary"
                    className="h-10 rounded-2xl border border-[#dadce0] bg-white px-4 text-[14px] font-medium text-[#202124] shadow-none hover:bg-[#f8fafd]"
                    onClick={syncCalendar}
                    disabled={syncing}
                  >
                    <RefreshCw
                      size={17}
                      className={syncing ? "animate-spin" : ""}
                    />
                    {syncing ? "Atjauno…" : "Atjaunot laikus"}
                  </Button>
                  <Button
                    variant="secondary"
                    className="h-10 rounded-2xl border border-[#dadce0] bg-white px-4 text-[14px] font-medium text-[#202124] shadow-none hover:bg-[#f8f9fa]"
                    onClick={disconnectCalendar}
                  >
                    <Unplug size={17} /> Atvienot
                  </Button>
                </>
              ) : (
                <a
                  href="/api/google-calendar/connect"
                  aria-disabled={connection === "loading"}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-[#dadce0] bg-white px-4 text-[14px] font-medium text-[#202124] shadow-none transition-colors hover:bg-[#f8fafd] aria-disabled:pointer-events-none aria-disabled:opacity-50"
                >
                  <GoogleG />
                  {connection === "upgrade-required"
                    ? "Atjaunināt Google piekļuvi"
                    : "Pieslēgt ar Google"}
                </a>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
