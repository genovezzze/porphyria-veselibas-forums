"use client";

import * as React from "react";

// Cycles through phrases with a typing effect: type, pause, erase, next.
// Pass a module-level (stable) array. Under prefers-reduced-motion the phrases
// simply swap every few seconds without the per-letter animation.
export function useTypewriter(phrases: readonly string[], active: boolean): string {
  const [text, setText] = React.useState("");

  React.useEffect(() => {
    if (!active || phrases.length === 0) return;

    let i = 0;
    let pos = 0;
    let deleting = false;
    let timer: ReturnType<typeof setTimeout>;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setText(phrases[0]);
      const swap = () => {
        i = (i + 1) % phrases.length;
        setText(phrases[i]);
        timer = setTimeout(swap, 4000);
      };
      timer = setTimeout(swap, 4000);
      return () => clearTimeout(timer);
    }

    const tick = () => {
      const full = phrases[i];
      if (!deleting) {
        pos++;
        setText(full.slice(0, pos));
        if (pos === full.length) {
          deleting = true;
          timer = setTimeout(tick, 1800); // hold the full question
          return;
        }
        timer = setTimeout(tick, 45 + Math.random() * 40);
      } else {
        pos--;
        setText(full.slice(0, pos));
        if (pos === 0) {
          deleting = false;
          i = (i + 1) % phrases.length;
          timer = setTimeout(tick, 400);
          return;
        }
        timer = setTimeout(tick, 22);
      }
    };

    setText("");
    timer = setTimeout(tick, 300);
    return () => clearTimeout(timer);
  }, [active, phrases]);

  return text;
}
