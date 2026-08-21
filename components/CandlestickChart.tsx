"use client";

import { useRef, useEffect, useState } from "react";
import type { ChartAdapter } from "@/lib/chart-adapter/types";
import { KlinechartsAdapter } from "@/lib/chart-adapter/klinecharts-adapter";
import type { ApiOhlcBar } from "@/lib/api";

const C = { ema20: "#6c5ce7", ema50: "#e0ab4a" };

export type ChartSignal = {
  direction: "BUY" | "SELL" | "HOLD";
  confidence: number;
  entryPrice: number;
  targetPrice: number;
  stopLoss: number;
};

/** Candlestick chart, rendered through a ChartAdapter (currently
 * KlinechartsAdapter — see lib/chart-adapter/). This component owns only the
 * React lifecycle (mount/unmount, prop-driven effects); every chart-library
 * call lives in the adapter, never here.
 * Pass `fill` to make it grow to its parent's height (terminal), or `height`
 * for a fixed size (landing demo). `onReady` hands the adapter instance to
 * the parent so a drawing-tools rail / AI agent can draw on it. */
export function CandlestickChart({ bars, signal, height = 320, fill = false, indicators = ["EMA", "VOL"], livePrice, onReady, onLoadMore }: {
  bars: ApiOhlcBar[];
  signal: ChartSignal | null;
  height?: number;
  fill?: boolean;
  indicators?: string[];
  livePrice?: number;
  onReady?: (adapter: ChartAdapter) => void;
  /** Older bars than the oldest currently on the chart, for when the user
   *  scrolls/pans back past what's loaded. Returning fewer bars than asked
   *  for (including none) is read as "nothing further back exists". */
  onLoadMore?: (oldestTimestampMs: number) => Promise<ApiOhlcBar[]>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const adapterRef = useRef<ChartAdapter | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  /* Adapter mount is async (the chart library is dynamically imported to keep
     it out of SSR), so the indicator effect below would run against a null
     ref on first mount and silently apply nothing. This flips once the
     instance exists and re-triggers it. */
  const [chartReady, setChartReady] = useState(0);
  // Latest-callback refs so the mount effect never re-runs (and so never
  // tears down the chart, losing zoom and every drawing) just because the
  // parent passed a new function identity. Assigned in an effect rather than
  // during render — writing a ref while rendering is not safe under concurrent
  // rendering, where a render can be thrown away.
  const onReadyRef = useRef(onReady);
  useEffect(() => { onReadyRef.current = onReady; }, [onReady]);
  const onLoadMoreRef = useRef(onLoadMore);
  useEffect(() => { onLoadMoreRef.current = onLoadMore; }, [onLoadMore]);

  useEffect(() => {
    if (!containerRef.current || bars.length === 0) return;
    const el = containerRef.current;
    let cancelled = false;
    const adapter = new KlinechartsAdapter();

    adapter.mount(el, { bars, onLoadMore: (ts) => onLoadMoreRef.current?.(ts) ?? Promise.resolve([]) }).then(() => {
      if (cancelled) { adapter.dispose(); return; }
      adapterRef.current = adapter;
      if (signal) adapter.setPriceLevels({ entry: signal.entryPrice, target: signal.targetPrice, stopLoss: signal.stopLoss });
      const ro = new ResizeObserver(() => adapter.resize());
      ro.observe(el);
      resizeObserverRef.current = ro;
      onReadyRef.current?.(adapter);
      setChartReady(n => n + 1);
    });

    return () => {
      cancelled = true;
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      adapterRef.current?.dispose();
      adapterRef.current = null;
    };
  // `indicators` is deliberately NOT a dependency — see the effect below.
  }, [bars, signal, height, fill]);

  /**
   * Apply indicator changes INCREMENTALLY to the existing chart.
   *
   * `chartReady` (not `bars`) is the dependency: it ticks whenever the mount
   * effect has produced a NEW adapter instance, which is exactly when the
   * indicators need re-applying. Keying off `bars` instead would re-run this
   * on every price refresh, before the new instance necessarily exists.
   */
  useEffect(() => {
    adapterRef.current?.setIndicators(indicators);
  }, [indicators, chartReady]);

  // Live tick — update the forming candle in place when the quote moves.
  useEffect(() => {
    if (!livePrice || livePrice <= 0) return;
    adapterRef.current?.pushLiveTick(livePrice);
  }, [livePrice]);

  // The chart renders into a canvas, which is opaque to assistive technology.
  // The role and label at least announce what this region is; the numbers
  // themselves are reachable through the signal and indicator panels, which are
  // real text.
  return (
    <div
      ref={containerRef}
      role="img"
      aria-label="Price chart. Numeric levels are listed in the panels beside the chart."
      className={fill ? "w-full h-full" : "w-full"}
      style={fill ? undefined : { height }}
    />
  );
}

/** Legend row for entry/target/stop + EMA color key, shown under the chart. */
export function ChartLegend({ signal }: { signal: ChartSignal | null }) {
  if (!signal) return null;
  const isBuy = signal.direction === "BUY";
  const isSell = signal.direction === "SELL";
  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap mt-2">
      <span className="flex items-center gap-1.5"><span className="inline-block w-4 h-0.5 rounded" style={{ background: C.ema20 }} /> EMA20</span>
      <span className="flex items-center gap-1.5"><span className="inline-block w-4 h-0.5 rounded" style={{ background: C.ema50 }} /> EMA50</span>
      <span className="flex items-center gap-1.5"><span className="inline-block w-4 border-t border-dashed border-muted-foreground" /> Entry ₹{signal.entryPrice}</span>
      <span className="flex items-center gap-1.5"><span className="inline-block w-4 border-t-2 border-dashed" style={{ borderColor: "var(--buy)" }} /> Target ₹{signal.targetPrice}</span>
      <span className="flex items-center gap-1.5"><span className="inline-block w-4 border-t-2 border-dashed" style={{ borderColor: "var(--sell)" }} /> Stop ₹{signal.stopLoss}</span>
      <span
        className="ml-auto px-2 py-0.5 font-bold text-[10px]"
        style={{
          background: isBuy ? "var(--buy)" : isSell ? "var(--sell)" : "var(--muted)",
          color: isBuy || isSell ? "#0b0e14" : "var(--muted-foreground)",
        }}
      >
        {signal.direction} · {Math.round(signal.confidence * 100)}%
      </span>
    </div>
  );
}
