"use client";

import { useState } from "react";
import { INTERVALS } from "@/lib/periods";
import { parseCustomInterval } from "@/lib/customInterval";
import { ResponsiveModal } from "@/components/ResponsiveModal";

/** Candle-size control, independent of the period pills (which only zoom
 *  the visible range -- see periods.ts). Placed beside the symbol badge,
 *  the same spot TradingView puts its own interval label. `value` is either
 *  one of the 6 native presets or a user-typed custom string like "3m" --
 *  the caller (page.tsx) resolves either into a fetch via resolveInterval. */
export function IntervalPicker({ value, onChange }: {
  value: string;
  onChange: (interval: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [customText, setCustomText] = useState("");
  const [customError, setCustomError] = useState("");

  function pick(interval: string) {
    onChange(interval);
    setOpen(false);
    setCustomText("");
    setCustomError("");
  }

  function applyCustom() {
    const parsed = parseCustomInterval(customText);
    if (!parsed) {
      setCustomError("Use a number plus m/h/d/w, e.g. 3m, 2h, 4d, 1w");
      return;
    }
    pick(`${parsed.value}${parsed.unit}`);
  }

  const isCustomActive = !(INTERVALS as readonly string[]).includes(value);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Change candle interval"
        className="text-[10px] font-mono font-semibold text-muted-foreground hover:text-foreground px-1 py-0.5 border border-transparent hover:border-border transition-colors"
      >
        {value}
      </button>

      <ResponsiveModal open={open} onClose={() => setOpen(false)} ariaLabel="Change interval" maxWidthClass="max-w-xs" maxHeightClass="max-h-[70vh]">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="font-heading font-semibold text-base">Interval</h2>
          <button onClick={() => setOpen(false)} aria-label="Close" className="text-muted-foreground hover:text-foreground">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-4 flex flex-col gap-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-3 gap-1.5">
            {INTERVALS.map((i) => (
              <button
                key={i}
                onClick={() => pick(i)}
                className={`px-2 py-1.5 text-xs font-mono font-semibold transition-colors ${
                  value === i ? "bg-primary/15 text-link" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                {i}
              </button>
            ))}
          </div>

          <div className="border-t border-border pt-3">
            <label className="block text-[11px] font-semibold text-muted-foreground mb-1.5">
              Custom {isCustomActive && <span className="text-link">(current: {value})</span>}
            </label>
            <div className="flex items-center gap-1.5">
              <input
                value={customText}
                onChange={(e) => { setCustomText(e.target.value); setCustomError(""); }}
                onKeyDown={(e) => { if (e.key === "Enter") applyCustom(); }}
                placeholder="e.g. 3m, 2h, 4d, 1w"
                aria-label="Custom interval"
                className="flex-1 bg-secondary/40 border border-border px-2 py-1.5 text-xs font-mono placeholder-muted-foreground focus:outline-none focus:border-primary"
              />
              <button
                onClick={applyCustom}
                className="shrink-0 px-2.5 py-1.5 text-xs font-semibold border border-border hover:border-primary hover:text-primary text-muted-foreground transition-colors"
              >
                Apply
              </button>
            </div>
            {customError && <p className="text-[11px] text-sell mt-1.5">{customError}</p>}
          </div>
        </div>
      </ResponsiveModal>
    </>
  );
}
