"use client";

import * as React from "react";
import {
  MessageSquare,
  ListChecks,
  BookMarked,
  CalendarDays,
  Plug,
  Plus,
  RotateCcw,
  MessageCircle,
  MoreHorizontal,
  Trash2,
  PanelLeftClose,
} from "lucide-react";
import { useDemo } from "@/lib/store";
import { TEAM_NAME } from "@/lib/config";
import { cn } from "@/lib/cn";

export type Tab =
  | "conversation"
  | "options"
  | "plan"
  | "calendar"
  | "integrations";

const NAV: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "conversation", label: "Saruna", icon: MessageSquare },
  { id: "options", label: "Varianti", icon: ListChecks },
  { id: "plan", label: "Mans plāns", icon: BookMarked },
  { id: "calendar", label: "Kalendārs", icon: CalendarDays },
  { id: "integrations", label: "Integrācijas", icon: Plug },
];

export function Sidebar({
  tab,
  setTab,
  onClose,
}: {
  tab: Tab;
  setTab: (t: Tab) => void;
  onClose: () => void;
}) {
  const demo = useDemo();
  const [chatMenuOpen, setChatMenuOpen] = React.useState(false);

  // Go back to the start screen (it only shows for an empty conversation).
  function startNewConversation() {
    if (demo.messages.length === 0 || confirm("Sākt jaunu sarunu? Pašreizējā saruna tiks notīrīta.")) {
      demo.clearConversation();
      setTab("conversation");
    }
  }

  const firstUser = demo.messages.find((m) => m.role === "user");
  const chatTitle = firstUser
    ? firstUser.content.slice(0, 28) + (firstUser.content.length > 28 ? "…" : "")
    : null;

  return (
    <aside className="flex h-full w-56 shrink-0 flex-col border-r border-black/10 bg-neutral-100 text-black">
      <div className="flex items-center justify-between gap-2 px-3 py-3">
        <button
          onClick={startNewConversation}
          title="Uz sākumu"
          className="min-w-0 rounded-lg text-left"
        >
          <span className="text-shine block truncate pl-1 text-[24px] font-semibold leading-tight tracking-tight">
            {TEAM_NAME}
          </span>
        </button>
        <button
          onClick={onClose}
          aria-label="Aizvērt sānjoslu"
          title="Aizvērt sānjoslu"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-black transition-colors hover:bg-black/10 hover:text-black"
        >
          <PanelLeftClose size={18} />
        </button>
      </div>

      <nav className="mt-3 space-y-0.5 px-3" aria-label="Sadaļas">
        <button
          onClick={startNewConversation}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[14px] font-medium text-black transition-colors hover:bg-black/5"
        >
          <Plus className="h-4 w-4" />
          Jauna saruna
        </button>
        {NAV.map((n) => (
          <button
            key={n.id}
            onClick={() => setTab(n.id)}
            aria-current={tab === n.id ? "page" : undefined}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[14px] font-medium transition-colors",
              tab === n.id
                ? "bg-accent-soft text-accent"
                : "text-black hover:bg-black/5 hover:text-black"
            )}
          >
            <n.icon className="h-4 w-4" />
            {n.label}
          </button>
        ))}
      </nav>

      <div className="mt-4 px-3">
        <div className="mb-2 inline-flex items-center rounded-full border border-black/10 bg-black/5 px-2.5 py-1 text-[12px] text-black">
          Pēdējās sarunas
        </div>
        <div className="space-y-1">
          {chatTitle ? (
            <div className="relative flex w-full items-center rounded-lg transition-colors hover:bg-black/5">
              <button
                onClick={() => setTab("conversation")}
                className="flex min-w-0 flex-1 items-center gap-2 px-3 py-1.5 text-left text-[13px] text-black"
              >
                <MessageCircle size={15} className="shrink-0 text-black" />
                <span className="truncate">{chatTitle}</span>
              </button>
              <button
                onClick={() => setChatMenuOpen((open) => !open)}
                aria-label="Sarunas darbības"
                aria-expanded={chatMenuOpen}
                className="mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-black/60 transition-colors hover:bg-black/10 hover:text-black"
              >
                <MoreHorizontal size={16} />
              </button>
              {chatMenuOpen && (
                <div className="absolute right-0 top-full z-20 mt-1 w-36 rounded-xl border border-black/10 bg-white p-1 shadow-lg">
                  <button
                    onClick={() => {
                      setChatMenuOpen(false);
                      if (confirm("Dzēst šo sarunu?")) {
                        demo.clearConversation();
                        setTab("conversation");
                      }
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] text-red-600 transition-colors hover:bg-red-50"
                  >
                    <Trash2 size={15} /> Dzēst sarunu
                  </button>
                </div>
              )}
            </div>
          ) : (
            <p className="px-3 py-1.5 text-[13px] text-black">Vēl nav sarunu</p>
          )}
        </div>
      </div>

      <div className="mt-auto space-y-2 border-t border-black/10 p-3">
        <span className="inline-flex items-center rounded-full border border-black/10 bg-black/5 px-2.5 py-1 text-[12px] text-black">
          Demo · Paraugdati
        </span>
        <button
          onClick={() => {
            if (confirm("Atiestatīt demo uz sākuma stāvokli?")) demo.resetDemo();
          }}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-1.5 text-[13px] text-black transition-colors hover:bg-black/5 hover:text-black"
        >
          <RotateCcw size={14} /> Atiestatīt demo
        </button>
      </div>
    </aside>
  );
}
