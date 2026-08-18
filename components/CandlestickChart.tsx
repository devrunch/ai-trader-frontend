"use client";

import { useRef, useEffect, useState } from "react";
import type { Chart } from "klinecharts";
import type { ApiOhlcBar } from "@/lib/api";

export type { Chart };

/* Dark palette aligned with globals.css tokens */
/**
 * The chart paints its text onto a canvas, so it inherits nothing from CSS —
 * the family has to be named explicitly, and it has to be one the browser has
 * already loaded or the canvas silently falls back to a system face.
 * `--font-poppins` is declared in `app/layout.tsx` for exactly that reason.
 */
const FONT = "Poppins, ui-sans-serif, system-ui, sans-serif";

const C = {
  buy: "#16c784",
  sell: "#f0525d",
  grid: "#1a1e28",
  axisText: "#8b8a9e",
  ema20: "#6c5ce7",
  ema50: "#e0ab4a",
  entry: "#8b8a9e",
};

/* ── Tooltip formatting ───────────────────────────────────────────────────
   The candle legend is written here rather than left to the defaults, which
   showed the time (already on the crosshair and the x-axis) and the volume
   (already a pane of its own), and omitted the one number a trader reads
   first: how far the bar moved. */

const inr = (n: number) =>
  n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Rupee prices, aligned to two decimals — never a bare float. */
const price = (n: unknown) =>
  typeof n === "number" && Number.isFinite(n) ? `₹${inr(n)}` : "—";

const signedPct = (n: number) => `${n >= 0 ? "+" : "−"}${Math.abs(n).toFixed(2)}%`;

type Bar = { open: number; high: number; low: number; close: number };

function candleLegend(data: { current?: unknown }) {
  const bar = data?.current as Bar | null | undefined;
  if (!bar) return [];

  const up = bar.close >= bar.open;
  const colour = up ? C.buy : C.sell;
  // Against this bar's own open: "how did this candle behave", which is what
  // the colour is already saying and what the number should agree with.
  const changePct = bar.open ? ((bar.close - bar.open) / bar.open) * 100 : 0;

  return [
    { title: "O", value: { text: price(bar.open), color: C.axisText } },
    { title: "H", value: { text: price(bar.high), color: C.buy } },
    { title: "L", value: { text: price(bar.low), color: C.sell } },
    { title: "C", value: { text: price(bar.close), color: colour } },
    // Explicit sign: colour reinforces direction, it never carries it.
    { title: "", value: { text: signedPct(changePct), color: colour } },
  ];
}

export type ChartSignal = {
  direction: "BUY" | "SELL" | "HOLD";
  confidence: number;
  entryPrice: number;
  targetPrice: number;
  stopLoss: number;
};

/** Candlestick chart on KLineChart v10 — candles, volume, EMA20/50, and
 * AI signal overlays (entry/target/stop price lines). Dark-themed.
 * Pass `fill` to make it grow to its parent's height (terminal), or `height`
 * for a fixed size (landing demo). `onReady` hands the chart instance to the
 * parent so a drawing-tools rail / AI agent can draw on it. */
/** Indicators that draw over the candles (vs. their own sub-pane below). */
const MAIN_PANE_INDICATORS = new Set([
  "EMA", "MA", "SMA", "BOLL", "SAR", "BBI", "DIA_EMA20",
  // Price-scale diascript indicators from the Trend/Volume expansion —
  // everything else new (ADX, Aroon, oscillators, volatility ratios,
  // volume-only series) is unbounded/percentage-scale and belongs in its
  // own sub-pane, the same as MACD/RSI/KDJ already do.
  "DIA_DONCHIAN_UPPER", "DIA_DONCHIAN_MID", "DIA_DONCHIAN_LOWER",
  "DIA_ENVELOPE_UPPER", "DIA_ENVELOPE_LOWER",
  "DIA_ICHIMOKU_TENKAN", "DIA_ICHIMOKU_KIJUN", "DIA_ICHIMOKU_SENKOU_A", "DIA_ICHIMOKU_SENKOU_B",
  "DIA_KELTNER_UPPER", "DIA_KELTNER_MID", "DIA_KELTNER_LOWER",
  "DIA_HMA", "DIA_DEMA", "DIA_TEMA", "DIA_SUPERTREND",
  "DIA_VWAP", "DIA_VWMA",
]);

export function CandlestickChart({ bars, signal, height = 320, fill = false, indicators = ["EMA", "VOL"], livePrice, onReady, onLoadMore }: {
  bars: ApiOhlcBar[];
  signal: ChartSignal | null;
  height?: number;
  fill?: boolean;
  indicators?: string[];
  livePrice?: number;
  onReady?: (chart: Chart) => void;
  /** Older bars than the oldest currently on the chart, for when the user
   *  scrolls/pans back past what's loaded. Returning fewer bars than asked
   *  for (including none) is read as "nothing further back exists". */
  onLoadMore?: (oldestTimestampMs: number) => Promise<ApiOhlcBar[]>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<Chart | null>(null);
  /** Indicator name -> id returned by createIndicator, so it can be removed.
   *  NOT a pane id — createIndicator returns the indicator's own instance id,
   *  and removeIndicator has to be filtered on that same id. Filtering by
   *  paneId instead (as this used to) silently matches nothing, because the
   *  value stored here was never a real pane id to begin with. */
  const appliedRef = useRef<Map<string, string>>(new Map());
  /* Chart init is async (klinecharts is dynamically imported to keep it out of
     SSR), so the indicator effect below would run against a null ref on first
     mount and silently apply nothing. This flips once the instance exists and
     re-triggers it. */
  const [chartReady, setChartReady] = useState(0);
  // Latest-callback ref so the chart-init effect never re-runs (and so never
  // tears down the chart, losing zoom and every drawing) just because the
  // parent passed a new function identity. Assigned in an effect rather than
  // during render — writing a ref while rendering is not safe under concurrent
  // rendering, where a render can be thrown away.
  const onReadyRef = useRef(onReady);
  useEffect(() => { onReadyRef.current = onReady; }, [onReady]);
  const onLoadMoreRef = useRef(onLoadMore);
  useEffect(() => { onLoadMoreRef.current = onLoadMore; }, [onLoadMore]);

  // Live-tick plumbing: KLineChart pushes a callback via the DataLoader's
  // subscribeBar; we invoke it with an updated last candle when livePrice moves.
  const barCallbackRef = useRef<((bar: { timestamp: number; open: number; high: number; low: number; close: number; volume?: number }) => void) | null>(null);
  const lastBarRef = useRef<{ timestamp: number; open: number; high: number; low: number; close: number; volume?: number } | null>(null);

  useEffect(() => {
    if (!containerRef.current || bars.length === 0) return;
    const el = containerRef.current;
    let cancelled = false;
    let cleanup: (() => void) | null = null;

    // Dynamic import — klinecharts touches browser APIs, so it must never be
    // evaluated during SSR/prerender. diascript-indicators.ts's own module
    // scope is SSR-safe (its DIASCRIPT_CATALOG data is also imported
    // statically elsewhere, by IndicatorMenu.tsx, for the search modal),
    // but registerDiascriptIndicators() itself lazily imports the real
    // klinecharts package internally — awaited here for the same reason.
    Promise.all([
      import("klinecharts"),
      import("@/lib/diascript-indicators"),
    ]).then(async ([{ init, dispose }, { registerDiascriptIndicators }]) => {
      if (cancelled || !el) return;
      await registerDiascriptIndicators();
      if (cancelled || !el) return;
      const chart = init(el) as Chart;
      chartRef.current = chart;

    chart.setStyles({
      grid: {
        horizontal: { color: C.grid },
        vertical: { color: C.grid },
      },
      candle: {
        bar: {
          upColor: C.buy, downColor: C.sell,
          upBorderColor: C.buy, downBorderColor: C.sell,
          upWickColor: C.buy, downWickColor: C.sell,
        },
        priceMark: {
          // `textFamily`, not `family` — the price marks predate the shared
          // text style and keep their own prefixed keys.
          high: { color: C.axisText, textFamily: FONT },
          low: { color: C.axisText, textFamily: FONT },
          last: { upColor: C.buy, downColor: C.sell, text: { family: FONT } },
        },
        tooltip: {
          // The default title renders "SYM · 5" — KLineChart's placeholder
          // ticker and the bar period in raw minutes. It was never given real
          // values, and the header above the chart already says which symbol
          // and timeframe this is.
          title: { show: false },
          legend: { family: FONT, template: candleLegend },
        },
      },
      indicator: { tooltip: { title: { family: FONT }, legend: { family: FONT } } },
      xAxis: {
        axisLine: { color: C.grid },
        tickLine: { color: C.grid },
        tickText: { color: C.axisText, family: FONT },
      },
      yAxis: {
        axisLine: { color: C.grid },
        tickLine: { color: C.grid },
        tickText: { color: C.axisText, family: FONT },
      },
      crosshair: {
        horizontal: {
          line: { color: C.axisText },
          text: { backgroundColor: "#2a2f3d", family: FONT },
        },
        vertical: {
          line: { color: C.axisText },
          text: { backgroundColor: "#2a2f3d", family: FONT },
        },
      },
      overlay: { text: { family: FONT }, rectText: { family: FONT } },
    });

    const klineData = bars.map(b => ({
      timestamp: b.time > 2e9 ? b.time : b.time * 1000,
      open: b.open, high: b.high, low: b.low, close: b.close, volume: b.volume,
    }));

    // Infer the bar period from timestamp spacing so axis labels are correct
    // (intraday views show times, daily views show dates).
    let pType: "minute" | "hour" | "day" | "week" | "month" = "day";
    let pSpan = 1;
    if (klineData.length > 2) {
      const deltas: number[] = [];
      for (let i = 1; i < Math.min(klineData.length, 30); i++) deltas.push(klineData[i].timestamp - klineData[i - 1].timestamp);
      deltas.sort((a, b) => a - b);
      const md = deltas[Math.floor(deltas.length / 2)] || 86400000;
      const MIN = 60000;
      if (md <= MIN) { pType = "minute"; pSpan = 1; }
      else if (md <= 5 * MIN) { pType = "minute"; pSpan = 5; }
      else if (md <= 15 * MIN) { pType = "minute"; pSpan = 15; }
      else if (md <= 60 * MIN) { pType = "hour"; pSpan = 1; }
      else if (md <= 24 * 60 * MIN) { pType = "day"; pSpan = 1; }
      else if (md <= 7 * 24 * 60 * MIN) { pType = "week"; pSpan = 1; }
      else { pType = "month"; pSpan = 1; }
    }

    lastBarRef.current = klineData.length ? { ...klineData[klineData.length - 1] } : null;

    chart.setSymbol({ ticker: "SYM", pricePrecision: 2, volumePrecision: 0 });
    chart.setPeriod({ span: pSpan, type: pType });

    // Grows as the user pans back past what's currently loaded — `getBars`
    // below reads/writes this closure variable, not the `bars` prop, so
    // panning-in-more data doesn't require a re-render to keep working.
    let allBars = klineData;

    function toKLineData(raw: ApiOhlcBar[]) {
      return raw.map(b => ({
        timestamp: b.time > 2e9 ? b.time : b.time * 1000,
        open: b.open, high: b.high, low: b.low, close: b.close, volume: b.volume,
      }));
    }

    function getBars({ type, callback }: { type: string; callback: (data: typeof allBars, more?: boolean | { forward?: boolean; backward?: boolean }) => void }) {
      if (type === "init") {
        // `forward: true` is what makes klinecharts call back into this
        // loader with type "forward" once the user pans to the oldest
        // loaded bar — without it, panning past the loaded range just
        // shows empty space. "backward" (future/live data) isn't used;
        // live ticks arrive through subscribeBar below instead.
        callback(allBars, { forward: true, backward: false });
        return;
      }
      if (type !== "forward" || !onLoadMoreRef.current || allBars.length === 0) {
        callback([], false);
        return;
      }
      onLoadMoreRef.current(allBars[0].timestamp)
        .then((older) => {
          const mapped = toKLineData(older);
          if (mapped.length) allBars = [...mapped, ...allBars];
          callback(mapped, mapped.length > 0);
        })
        .catch(() => callback([], false));
    }

    chart.setDataLoader({
      getBars,
      subscribeBar: ({ callback }) => { barCallbackRef.current = callback; },
      unsubscribeBar: () => { barCallbackRef.current = null; },
    });
    // Snaps the view to the latest bar at the right edge (with the chart's
    // own configured padding) instead of whatever position a prior render
    // left the viewport at — without this the chart can show mostly empty
    // space on load.
    chart.scrollToRealTime();

      // Indicators are applied by their own effect below, so toggling one
      // does not rebuild the chart.

    // AI signal overlays — horizontal price lines
    if (signal) {
      const line = (value: number, color: string) =>
        chart.createOverlay({
          name: "priceLine",
          points: [{ value }],
          lock: true,
          styles: {
            line: { color, style: "dashed", size: 1 },
            text: { color: "#0b0e14", backgroundColor: color },
          },
        });
      line(signal.entryPrice, C.entry);
      line(signal.targetPrice, C.buy);
      line(signal.stopLoss, C.sell);
    }

      const ro = new ResizeObserver(() => chart.resize());
      ro.observe(el);

      onReadyRef.current?.(chart);
      setChartReady(n => n + 1);

      cleanup = () => {
        ro.disconnect();
        chartRef.current = null;
        appliedRef.current.clear();
        dispose(el);
      };
    });

    return () => { cancelled = true; if (cleanup) cleanup(); };
  // `indicators` is deliberately NOT a dependency — see the effect below.
  }, [bars, signal, height, fill]);

  /**
   * Apply indicator changes INCREMENTALLY to the existing chart.
   *
   * These used to be created inside the init effect with `indicators` in its
   * dependency array, so toggling a single indicator tore the whole chart down
   * and rebuilt it — losing the zoom level and every drawing the user or the AI
   * had placed. On a charting product that is the most annoying interaction
   * there is: experiment with indicators, lose your analysis.
   *
   * Now only the difference is applied: add what is new, remove what is gone.
   */
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const applied = appliedRef.current;
    const wanted = new Set(indicators);
    // A fresh instance carries no indicators, so any stale bookkeeping from the
    // previous one would make us skip creating them.


    for (const [name, id] of [...applied]) {
      if (wanted.has(name)) continue;
      chart.removeIndicator({ id });
      applied.delete(name);
    }

    for (const name of wanted) {
      if (applied.has(name)) continue;
      // isStack: true — without it, klinecharts' createIndicator evicts
      // every OTHER indicator already on that pane before adding this one
      // (StoreImp.addIndicator calls removeIndicator({paneId}) first when
      // isStack is falsy), not just its own tooltip row. Checking two
      // main-pane overlays silently dropped whichever was added first.
      const id = MAIN_PANE_INDICATORS.has(name)
        ? chart.createIndicator(
            name === "EMA"
              ? { name, calcParams: [20, 50], paneId: "candle_pane" }
              : { name, paneId: "candle_pane" },
            true,
          )
        : chart.createIndicator(name);
      if (id) applied.set(name, id);
    }
    // `chartReady` (not `bars`) is the second dependency: it ticks whenever the
    // init effect has produced a NEW chart instance, which is exactly when the
    // indicators need re-applying. Keying off `bars` instead would re-run this
    // on every price refresh, before the new instance necessarily exists.
  }, [indicators, chartReady]);

  // Live tick — update the forming candle in place when the quote moves.
  useEffect(() => {
    const cb = barCallbackRef.current;
    const last = lastBarRef.current;
    if (!cb || !last || !livePrice || livePrice <= 0) return;
    const updated = {
      ...last,
      close: livePrice,
      high: Math.max(last.high, livePrice),
      low: Math.min(last.low, livePrice),
    };
    lastBarRef.current = updated;
    cb(updated);
  }, [livePrice]);

  // KLineChart renders into a canvas, which is opaque to assistive technology.
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
