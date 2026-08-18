"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Which indicators are drawn on the chart.
 *
 * Owns its own open/closed state and the click-outside handler, because those
 * are facts about a dropdown and not about the terminal. The catalog lives here
 * too: it describes what KLineChart can draw and which pane it draws in, which
 * is the menu's subject, not the page's.
 */

/* Overlays draw on the price pane; oscillators get their own pane below. */
export const INDICATOR_CATALOG: {
  name: string;
  label: string;
  group: "Overlays" | "Oscillators";
}[] = [
  { name: "EMA",  label: "EMA (20, 50)",       group: "Overlays" },
  { name: "MA",   label: "Moving Average",     group: "Overlays" },
  { name: "BOLL", label: "Bollinger Bands",    group: "Overlays" },
  { name: "SAR",  label: "Parabolic SAR",      group: "Overlays" },
  { name: "BBI",  label: "BBI",                group: "Overlays" },
  { name: "VOL",  label: "Volume",             group: "Oscillators" },
  { name: "MACD", label: "MACD",               group: "Oscillators" },
  { name: "RSI",  label: "RSI (14)",           group: "Oscillators" },
  { name: "KDJ",  label: "Stochastic (KDJ)",   group: "Oscillators" },
  // Defined as diascript formulas (lib/diascript-indicators.ts) instead of
  // klinecharts' own built-in catalog — proves the same toggle/pane
  // machinery works unchanged for a script-defined indicator.
  { name: "DIA_EMA20", label: "EMA 20 (diascript)", group: "Overlays" },
  { name: "DIA_RSI14", label: "RSI 14 (diascript)", group: "Oscillators" },
];

export interface IndicatorMenuProps {
  /** Indicator names currently shown. */
  active: string[];
  onToggle: (name: string) => void;
}

export function IndicatorMenu({ active, onToggle }: IndicatorMenuProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  /* Click-outside and Escape. A dropdown that only closes by clicking its own
     button traps a user who has moved on. */
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={wrapRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        className="flex items-center gap-1.5 px-2.5 py-1.5 border border-border text-muted-foreground text-xs font-semibold hover:text-foreground hover:border-primary/50 transition-colors"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 3v18h18"/><path d="M18.7 8l-5.1 5.2-3.6-3.6L4 15.6"/>
        </svg>
        <span className="hidden sm:inline">Indicators</span>
        {active.length > 0 && (
          <span className="px-1 bg-primary/15 text-link text-[9px] font-mono">{active.length}</span>
        )}
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1.5 w-56 bg-card border border-border shadow-lg z-30 py-1">
          {(["Overlays", "Oscillators"] as const).map((group) => (
            <div key={group}>
              <div className="px-3 pt-2 pb-1 text-[10px] font-bold text-muted-foreground uppercase tracking-widest font-mono">
                {group}
              </div>
              {INDICATOR_CATALOG.filter((i) => i.group === group).map((ind) => {
                const on = active.includes(ind.name);
                return (
                  <button
                    key={ind.name}
                    onClick={() => onToggle(ind.name)}
                    role="menuitemcheckbox"
                    aria-checked={on}
                    className="w-full flex items-center justify-between px-3 py-1.5 text-sm hover:bg-secondary transition-colors"
                  >
                    <span className={on ? "text-foreground" : "text-muted-foreground"}>
                      {ind.label}
                    </span>
                    <span className={`w-4 h-4 border flex items-center justify-center ${
                      on ? "bg-primary border-primary" : "border-border"
                    }`}>
                      {on && (
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                             stroke="var(--primary-foreground)" strokeWidth="3"
                             strokeLinecap="round" aria-hidden="true">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
