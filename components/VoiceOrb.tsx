"use client";

import { cn } from "@/lib/cn";

export type VoiceState =
  | "off"
  | "connecting"
  | "listening"
  | "speaking"
  | "lost"
  | "unavailable";

// Smooth drifting monochrome "cloud" orb. Built from soft radial-gradient
// layers that fade fully to transparent, so there are no hard edges.
// Motion intensifies when active; neutralized under prefers-reduced-motion.
export function VoiceOrb({ state }: { state: VoiceState }) {
  const active = state === "listening" || state === "speaking";
  const speaking = state === "speaking";
  const idle = state === "off" || state === "unavailable" || state === "lost";

  return (
    <div
      className="relative mx-auto flex h-40 w-40 items-center justify-center"
      aria-hidden="true"
    >
      {/* Outer glow halo */}
      <span
        className={cn(
          "absolute h-36 w-36 rounded-full bg-accent/40 blur-2xl transition-opacity duration-700",
          idle ? "opacity-20" : speaking ? "opacity-80" : "opacity-55"
        )}
      />

      {/* Sphere */}
      <div
        className={cn(
          "relative h-28 w-28 overflow-hidden rounded-full border border-black/10 transition-transform duration-700",
          speaking && "scale-110",
          active && !speaking && "scale-105"
        )}
        style={{
          background: "radial-gradient(circle at 50% 50%, #262626 0%, #0a0a0a 72%)",
        }}
      >
        <span
          className={cn("absolute inset-0", !idle && "orb-blob-a")}
          style={{
            background:
              "radial-gradient(circle at 38% 40%, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.3) 28%, transparent 55%)",
          }}
        />
        <span
          className={cn("absolute inset-0", !idle && "orb-blob-b")}
          style={{
            background:
              "radial-gradient(circle at 62% 58%, rgba(36,116,245,0.85) 0%, rgba(36,116,245,0.3) 30%, transparent 58%)",
          }}
        />
        <span
          className={cn("absolute inset-0", !idle && "orb-blob-c")}
          style={{
            background:
              "radial-gradient(circle at 55% 35%, rgba(120,120,120,0.7) 0%, rgba(120,120,120,0.2) 26%, transparent 52%)",
          }}
        />
        <span
          className={cn("absolute inset-0", !idle && "orb-rotate")}
          style={{
            background:
              "radial-gradient(circle at 34% 24%, rgba(255,255,255,0.45) 0%, transparent 42%)",
          }}
        />
      </div>
    </div>
  );
}
