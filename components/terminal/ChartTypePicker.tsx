"use client";

import { useState } from "react";
import { CHART_TYPES } from "@/lib/chart-adapter/chart-types/registry";
import type { ChartTypeId } from "@/lib/chart-adapter/types";
import { ResponsiveModal } from "@/components/ResponsiveModal";
import { CHART_TYPE_ICONS } from "./chartTypeIcons";

/** Main-pane chart-type control, beside IntervalPicker in the same header
 *  row. An icon-only trigger, same as TradingView's own chart-type button --
 *  the other pickers next to it (period pills, IntervalPicker) are already
 *  compact text, so this one carrying its own "Candles"/"Line" label too
 *  crowded the row; the icon alone reads fine once you know the row is
 *  chart controls. Only lists types with a real registered renderer
 *  (CHART_TYPES) -- the full TradingView-style target list lives in
 *  ChartTypeId itself, but a not-yet-built type has nothing to pick here
 *  until its own renderer file lands in the registry. */
export function ChartTypePicker({ value, onChange }: {
  value: ChartTypeId;
  onChange: (type: ChartTypeId) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = CHART_TYPES.find((t) => t.id === value);
  const currentIcon = CHART_TYPE_ICONS[value];

  function pick(id: ChartTypeId) {
    onChange(id);
    setOpen(false);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title={`Chart type: ${current?.label ?? value}`}
        aria-label="Change chart type"
        className="w-6 h-6 flex items-center justify-center text-muted-foreground hover:text-foreground border border-transparent hover:border-border transition-colors shrink-0"
      >
        {currentIcon ?? <span className="text-[10px] font-mono font-semibold">{value}</span>}
      </button>

      <ResponsiveModal open={open} onClose={() => setOpen(false)} ariaLabel="Change chart type" maxWidthClass="max-w-xs" maxHeightClass="max-h-[70vh]">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="font-heading font-semibold text-base">Chart Type</h2>
          <button onClick={() => setOpen(false)} aria-label="Close" className="text-muted-foreground hover:text-foreground">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-2 flex flex-col gap-0.5 overflow-y-auto flex-1">
          {CHART_TYPES.map((t) => (
            <button
              key={t.id}
              onClick={() => pick(t.id)}
              className={`flex items-center gap-2.5 px-3 py-2 text-left text-sm font-medium transition-colors ${
                value === t.id ? "bg-primary/15 text-link" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              <span className="shrink-0">{CHART_TYPE_ICONS[t.id]}</span>
              {t.label}
            </button>
          ))}
        </div>
      </ResponsiveModal>
    </>
  );
}
