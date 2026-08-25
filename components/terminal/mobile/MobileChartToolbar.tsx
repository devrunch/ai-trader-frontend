"use client";

import { useState } from "react";
import { BottomSheet } from "./BottomSheet";
import { DRAW_TOOLS, type DrawTool } from "@/components/terminal/DrawingToolbar";
import { PERIODS } from "@/lib/periods";
import { IntervalPicker } from "@/components/terminal/IntervalPicker";
import { ChartTypePicker } from "@/components/terminal/ChartTypePicker";
import type { ChartTypeId } from "@/lib/chart-adapter/types";

export function MobileChartToolbar({
  symbol, exchange, currency, ltp, onOpenSearch,
  activeTool, onPickTool, period, onPickPeriod, candleInterval, onPickInterval,
  chartType, onPickChartType, onOpenIndicators,
}: {
  symbol: string; exchange: string; currency: string; ltp: number | null;
  onOpenSearch: () => void;
  activeTool: string; onPickTool: (tool: DrawTool) => void;
  period: string; onPickPeriod: (label: string) => void;
  candleInterval: string; onPickInterval: (interval: string) => void;
  chartType: ChartTypeId; onPickChartType: (type: ChartTypeId) => void;
  onOpenIndicators: () => void;
}) {
  const [drawingSheetOpen, setDrawingSheetOpen] = useState(false);

  return (
    <div className="border-b border-border shrink-0">
      <div className="flex items-center gap-2 px-2 py-1.5">
        <button onClick={onOpenSearch} className="flex items-baseline gap-1.5 min-w-0 flex-1 text-left">
          <span className="font-bold text-sm truncate">{symbol}</span>
          <span className="text-[10px] text-muted-foreground font-mono shrink-0">{exchange}</span>
          {ltp !== null && <span className="font-mono text-xs font-semibold ml-1 shrink-0">{currency}{ltp.toFixed(2)}</span>}
        </button>
        <IntervalPicker value={candleInterval} onChange={onPickInterval} />
        <ChartTypePicker value={chartType} onChange={onPickChartType} />
        <button aria-label="Drawing tools" onClick={() => setDrawingSheetOpen(true)}
          className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><line x1="4" y1="20" x2="20" y2="4" /></svg>
        </button>
        <button aria-label="Indicators" onClick={onOpenIndicators}
          className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 3v18h18" /><path d="M18 9l-5 5-4-4-4 4" /></svg>
        </button>
      </div>

      <div className="flex gap-1 px-2 pb-1.5 overflow-x-auto no-scrollbar">
        {PERIODS.map((p) => (
          <button key={p.label} onClick={() => onPickPeriod(p.label)}
            className={`px-2 py-1 text-[11px] font-mono font-semibold shrink-0 transition-colors ${
              period === p.label ? "bg-primary/15 text-link" : "text-muted-foreground hover:bg-secondary"
            }`}>
            {p.label}
          </button>
        ))}
      </div>

      <BottomSheet open={drawingSheetOpen} onClose={() => setDrawingSheetOpen(false)} ariaLabel="Drawing tools">
        <div className="grid grid-cols-4 gap-1 p-3">
          {DRAW_TOOLS.map((t) => (
            <button
              key={t.key}
              title={t.title}
              aria-pressed={activeTool === t.key}
              onClick={() => { onPickTool(t); setDrawingSheetOpen(false); }}
              className={`flex flex-col items-center gap-1 p-3 transition-colors ${
                activeTool === t.key ? "bg-primary/15 text-link" : "text-muted-foreground hover:bg-secondary"
              }`}
            >
              {t.icon}
              <span className="text-[10px]">{t.title}</span>
            </button>
          ))}
        </div>
      </BottomSheet>
    </div>
  );
}
