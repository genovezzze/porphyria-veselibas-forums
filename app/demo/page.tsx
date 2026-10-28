"use client";

import * as React from "react";
import { PanelLeftOpen } from "lucide-react";
import { DemoProvider, useDemo } from "@/lib/store";
import { Chat } from "@/components/Chat";
import { VoicePanel } from "@/components/VoicePanel";
import { OptionCard } from "@/components/OptionCard";
import { PlanView } from "@/components/PlanView";
import { CalendarView } from "@/components/CalendarView";
import { IntegrationsView } from "@/components/IntegrationsView";
import { Sidebar, type Tab } from "@/components/Sidebar";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { TEAM_NAME } from "@/lib/config";

function OptionsView() {
  const demo = useDemo();
  if (demo.options.length === 0) {
    return (
      <div>
        <h2 className="text-2xl font-semibold text-black">Varianti</h2>
        <Card className="mt-4 p-6 text-[16px] text-muted">
          Neviens paraugvariants neatbilst tavai pašreizējai vēlmei. Pamēģini citu
          diennakts daļu sadaļā{" "}
          <span className="font-medium text-ink">Kalendārs</span> vai pasaki
          asistentam, kad tev ir laiks.
        </Card>
      </div>
    );
  }
  return (
    <div>
      <h2 className="text-2xl font-semibold text-black">Varianti</h2>
      <p className="mt-1 text-[15px] text-black">
        Izdomāti paraugvarianti, kas atbilst tavām vēlmēm.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {demo.options.map((o) => (
          <OptionCard
            key={o.id}
            option={o}
            saved={demo.plan.some((p) => p.slotId === o.id)}
            onSave={demo.savePlan}
          />
        ))}
      </div>
    </div>
  );
}

function Cabinet() {
  const demo = useDemo();
  const [tab, setTab] = React.useState<Tab>("conversation");
  // Slide-out sidebar: open by default on desktop, closed on small screens.
  const [open, setOpen] = React.useState(true);

  React.useEffect(() => {
    if (window.innerWidth < 1024) setOpen(false);
    const requestedTab = new URLSearchParams(window.location.search).get("tab");
    if (
      requestedTab === "conversation" ||
      requestedTab === "options" ||
      requestedTab === "plan" ||
      requestedTab === "calendar" ||
      requestedTab === "integrations"
    ) {
      setTab(requestedTab);
    }
  }, []);

  function selectTab(t: Tab) {
    setTab(t);
    if (window.innerWidth < 1024) setOpen(false);
  }

  return (
    <div className="app-dark relative flex h-dvh overflow-hidden bg-white text-black">

      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Slide-out sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-40 h-full shrink-0 overflow-hidden transition-[width,transform] duration-300 ease-out lg:relative lg:z-10",
          open
            ? "w-56 translate-x-0"
            : "w-56 -translate-x-full lg:w-0 lg:translate-x-0"
        )}
      >
        <Sidebar tab={tab} setTab={selectTab} onClose={() => setOpen(false)} />
      </div>

      {/* Main */}
      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        {!open && (
          <div className="absolute left-3 top-3 z-20 flex items-center gap-3">
            <button
              onClick={() => setOpen(true)}
              aria-label="Atvērt sānjoslu"
              title="Atvērt sānjoslu"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-black/10 bg-black/5 text-black transition-colors hover:bg-black/10 hover:text-black"
            >
              <PanelLeftOpen size={18} />
            </button>
            {/* Team wordmark; like the sidebar logo, it returns to the start screen. */}
            <button
              onClick={() => {
                if (demo.messages.length === 0 || confirm("Sākt jaunu sarunu? Pašreizējā saruna tiks notīrīta.")) {
                  demo.clearConversation();
                  setTab("conversation");
                }
              }}
              title="Uz sākumu"
              className="rounded-lg"
            >
              <span className="text-shine block text-[24px] font-semibold leading-tight tracking-tight">
                {TEAM_NAME}
              </span>
            </button>
          </div>
        )}

        {tab === "conversation" ? (
          <div className="flex min-h-0 flex-1 items-center overflow-y-auto px-4 py-4 sm:px-6">
            {/* One row: both cards stretch to the taller one, so their heights always match. */}
            <div className="flex w-full items-stretch gap-6">
              <div className="flex min-w-0 flex-1">
                <Chat onOptions={() => setTab("options")} />
              </div>
              <div className="hidden w-[390px] shrink-0 xl:flex">
                <div className="flex min-h-[68vh] w-full flex-col overflow-hidden rounded-3xl border border-black/[0.08] bg-white text-black shadow-[0_10px_40px_rgba(0,0,0,0.08)]">
                  <VoicePanel />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div
            className={cn(
              "min-h-0 flex-1 px-4 sm:px-6",
              tab === "calendar"
                ? "overflow-hidden py-3"
                : "overflow-y-auto py-6 pt-14"
            )}
          >
            <div
              className={cn(
                "mx-auto",
                tab === "calendar" ? "h-full max-w-[1400px]" : "max-w-4xl"
              )}
            >
              {tab === "options" && <OptionsView />}
              {tab === "plan" && <PlanView />}
              {tab === "calendar" && <CalendarView />}
              {tab === "integrations" && <IntegrationsView />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DemoPage() {
  return (
    <DemoProvider>
      <Cabinet />
    </DemoProvider>
  );
}
