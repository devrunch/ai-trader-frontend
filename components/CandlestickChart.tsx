"use client";

import { useCallback, useRef, useEffect, useState } from "react";
import type { ChartAdapter, ChartTypeId, PaneRect } from "@/lib/chart-adapter/types";
import { LightweightChartsAdapter } from "@/lib/chart-adapter/lightweight-charts-adapter";
import { INDICATOR_COLORS } from "@/lib/chart-adapter/palette";
import type { ApiOhlcBar } from "@/lib/api";

export type ChartSignal = {
  direction: "BUY" | "SELL" | "HOLD";
  confidence: number;
  entryPrice: number;
  targetPrice: number;
  stopLoss: number;
};

/** One row in the on-chart indicator legend -- everything currently
 *  attached, Pine indicator or Volume Profile alike, deliberately shaped so
 *  the terminal page can build it straight from the same `indicators` /
 *  `volumeProfiles` state it already diffs into the chart adapter. */
export interface LegendItem {
  id: string;
  label: string;
  hidden: boolean;
  /** For indicators whose color coding isn't self-explanatory (e.g. Volume
   *  Spread Analysis's four categories) -- renders an info icon that reveals
   *  this key on hover. Omitted entirely for a plain single-color line. */
  colorKey?: { label: string; color: string }[];
  /** True when the sandbox found real input.*() declarations in this
   *  script's last successful run -- shows the settings gear. False/absent
   *  for scripts with no adjustable inputs, or non-Pine rows (Volume
   *  Profile, VSA) that were never candidates in the first place. */
  hasSettings?: boolean;
}

// The legend's swatch is cycled by list position, not by asking the chart
// adapter what color it actually assigned each series -- the two CAN drift
// apart (e.g. a Volume Profile row sits between two Pine rows in the list
// but consumes no color slot on the chart), but sharing this same palette
// with the adapter (see palette.ts) at least keeps the same hues in play on
// both sides rather than two independently-chosen sets of colors.
const SWATCH_COLORS = INDICATOR_COLORS;

function paneRectsEqual(a: PaneRect[], b: PaneRect[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((r, i) => r.index === b[i].index && r.top === b[i].top && r.height === b[i].height && r.indicatorId === b[i].indicatorId);
}

/** Candlestick chart, rendered through a ChartAdapter (LightweightChartsAdapter
 * — see lib/chart-adapter/). This component owns only the React lifecycle
 * (mount/unmount, prop-driven effects); every chart-library call lives in the
 * adapter, never here. Default view is candle + volume only; anything else
 * attaches via ChartAdapter.attachPineIndicator, driven by the parent
 * (terminal/page.tsx owns that diffing) rather than an `indicators` prop
 * here, since there is no fixed catalog to pass names against anymore.
 * Pass `fill` to make it grow to its parent's height (terminal), or `height`
 * for a fixed size (landing demo). `onReady` hands the adapter instance to
 * the parent so a drawing-tools rail / AI agent can draw on it. */
export function CandlestickChart({
  bars, signal, height = 320, fill = false, livePrice, onReady, onLoadMore, onPollVolume, onFetchTicks,
  chartType = "candles", legendItems = [], onToggleVisible, onDelete, onOpenSettings,
}: {
  bars: ApiOhlcBar[];
  signal: ChartSignal | null;
  height?: number;
  fill?: boolean;
  livePrice?: number;
  onReady?: (adapter: ChartAdapter) => void;
  /** Main pane's chart type -- read once at mount (a symbol/interval change
   *  remounts the chart from scratch anyway, see the bars effect below) and
   *  otherwise driven live via setChartType() in its own effect further down,
   *  so switching type mid-session doesn't tear down drawings/zoom the way a
   *  full remount would. */
  chartType?: ChartTypeId;
  /** Keeps the still-forming bar's volume live for symbols whose real
   *  volume only refreshes on a fresh historical fetch otherwise -- see
   *  ChartMountOptions.onPollVolume's own docs. Omit for symbols that don't
   *  need it (equities already get live volume from Kite). */
  onPollVolume?: (bucketStartSec: number) => Promise<number | null>;
  /** Real ECN ticks for Volume Footprint/TPO -- see
   *  ChartMountOptions.onFetchTicks's own docs. Omit for symbols without
   *  tick coverage; those two chart types just render candles with no
   *  overlay instead of crashing or showing a blank pane. */
  onFetchTicks?: (sinceSec: number, untilSec: number) => Promise<{ t: number; p: number }[] | null>;
  /** Older bars than the oldest currently on the chart, for when the user
   *  scrolls/pans back past what's loaded. Returning fewer bars than asked
   *  for (including none) is read as "nothing further back exists".
   *  `oldestLoadedTime` is Unix SECONDS (the chart's own bar.time unit,
   *  passed straight through by the adapter) -- a previous "Ms" name here
   *  caused a real bug where a consumer multiplied by 1000 before comparing,
   *  which silently broke pan-back-for-more-history on every chart. */
  onLoadMore?: (oldestLoadedTime: number) => Promise<ApiOhlcBar[]>;
  /** Everything currently attached -- drives both the on-chart legend and,
   *  via getPaneRects()'s indicatorId, which pane each toolbar's delete
   *  button acts on. */
  legendItems?: LegendItem[];
  onToggleVisible?: (id: string, visible: boolean) => void;
  onDelete?: (id: string) => void;
  onOpenSettings?: (id: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const adapterRef = useRef<ChartAdapter | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  // The bar under the cursor -- null when the cursor isn't over the chart,
  // in which case the overlay below falls back to the latest bar (TradingView
  // shows the current candle's stats at rest, the hovered one while dragging).
  const [hoverBar, setHoverBar] = useState<ApiOhlcBar | null>(null);
  const [paneRects, setPaneRects] = useState<PaneRect[]>([]);
  // Latest-callback refs so the mount effect never re-runs (and so never
  // tears down the chart, losing zoom and every drawing) just because the
  // parent passed a new function identity. Assigned in an effect rather than
  // during render — writing a ref while rendering is not safe under concurrent
  // rendering, where a render can be thrown away.
  const onReadyRef = useRef(onReady);
  useEffect(() => { onReadyRef.current = onReady; }, [onReady]);
  const onLoadMoreRef = useRef(onLoadMore);
  useEffect(() => { onLoadMoreRef.current = onLoadMore; }, [onLoadMore]);
  const onPollVolumeRef = useRef(onPollVolume);
  useEffect(() => { onPollVolumeRef.current = onPollVolume; }, [onPollVolume]);
  const onFetchTicksRef = useRef(onFetchTicks);
  useEffect(() => { onFetchTicksRef.current = onFetchTicks; }, [onFetchTicks]);
  const chartTypeRef = useRef(chartType);
  useEffect(() => { chartTypeRef.current = chartType; }, [chartType]);

  const refreshPaneRects = useCallback(() => {
    const adapter = adapterRef.current;
    if (adapter) setPaneRects(adapter.getPaneRects());
  }, []);

  useEffect(() => {
    if (!containerRef.current || bars.length === 0) return;
    const el = containerRef.current;
    let cancelled = false;
    const adapter = new LightweightChartsAdapter();
    setHoverBar(null); // a stale hover from the outgoing chart shouldn't survive a remount

    adapter.mount(el, {
      bars,
      chartType: chartTypeRef.current,
      onLoadMore: (ts) => onLoadMoreRef.current?.(ts) ?? Promise.resolve([]),
      onCrosshairMove: setHoverBar,
      // Presence, not just behavior, matters here: the adapter only starts
      // its poll timer when this is set at all (see mount()'s own check),
      // so an absent onPollVolume prop must stay absent, not become a
      // wrapper that always resolves null -- that would run a 5s timer for
      // every chart, FOREX or not, for nothing. Read from the ref (same as
      // chartTypeRef above), not the raw prop, so this effect's own
      // dependency array doesn't need onPollVolume in it.
      onPollVolume: onPollVolumeRef.current ? (ts) => onPollVolumeRef.current?.(ts) ?? Promise.resolve(null) : undefined,
      // Only Volume Footprint/TPO ever call this (see their own renderer
      // files) -- a plain always-present wrapper is fine here, unlike
      // onPollVolume above: nothing starts a background timer off its mere
      // presence, so there's no "wasted for every chart" concern to guard
      // against the way there was there.
      onFetchTicks: (since, until) => onFetchTicksRef.current?.(since, until) ?? Promise.resolve(null),
    }).then(() => {
      if (cancelled) { adapter.dispose(); return; }
      adapterRef.current = adapter;
      if (signal) adapter.setPriceLevels({ entry: signal.entryPrice, target: signal.targetPrice, stopLoss: signal.stopLoss });
      const ro = new ResizeObserver(() => { adapter.resize(); refreshPaneRects(); });
      ro.observe(el);
      resizeObserverRef.current = ro;
      onReadyRef.current?.(adapter);
      refreshPaneRects();
    });

    return () => {
      cancelled = true;
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      adapterRef.current?.dispose();
      adapterRef.current = null;
      setPaneRects([]);
    };
  }, [bars, signal, height, fill, refreshPaneRects]);

  // Live tick — update the forming candle in place when the quote moves.
  useEffect(() => {
    if (!livePrice || livePrice <= 0) return;
    adapterRef.current?.pushLiveTick(livePrice);
  }, [livePrice]);

  // A chart-type change while already mounted swaps the main series in place
  // (see LightweightChartsAdapter.setChartType) instead of going through the
  // bars effect's full remount, which would otherwise blow away zoom and
  // drawings on every pick. Guarded by adapterRef so this doesn't fire before
  // the mount effect's own initial chartType (passed via chartTypeRef above)
  // has applied.
  useEffect(() => {
    adapterRef.current?.setChartType(chartType);
  }, [chartType]);

  // Pane geometry has no "layout settled" event to hook -- Pine attaches are
  // async, LWC's own reflow after adding/resizing a pane happens on its own
  // schedule, and a one-shot or two-rAF refresh raced ahead of it often
  // enough in testing that a pane's toolbar rendered at its PREVIOUS size's
  // position (caught by hand: RSI's toolbar sat mid-pane, at the pane's old,
  // taller-before-MACD-was-added top edge). Continuously reconciling instead
  // of trying to catch one right moment: cheap (a handful of
  // getBoundingClientRect() reads), and only setState's when a rect actually
  // changed, so it doesn't spin re-renders once geometry is stable.
  useEffect(() => {
    let raf = requestAnimationFrame(function tick() {
      const adapter = adapterRef.current;
      if (adapter) {
        const next = adapter.getPaneRects();
        setPaneRects((prev) => (paneRectsEqual(prev, next) ? prev : next));
      }
      raf = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  function withRefresh(fn: (adapter: ChartAdapter) => void) {
    const adapter = adapterRef.current;
    if (!adapter) return;
    fn(adapter);
    refreshPaneRects();
  }

  // The bar the OHLCV readout below shows: whatever's under the cursor, or
  // the latest bar at rest -- matches TradingView's own resting state.
  const readoutBar = hoverBar ?? bars[bars.length - 1] ?? null;

  // The chart renders into a canvas, which is opaque to assistive technology.
  // The role and label at least announce what this region is; the numbers
  // themselves are reachable through the signal and indicator panels, which are
  // real text.
  return (
    <div className={fill ? "relative w-full h-full" : "relative w-full"} style={fill ? undefined : { height }}>
      {readoutBar && <OhlcvReadout bar={readoutBar} />}
      {legendItems.length > 0 && (
        <IndicatorLegend
          items={legendItems}
          onToggleVisible={onToggleVisible}
          onDelete={onDelete}
          onOpenSettings={onOpenSettings}
        />
      )}
      {paneRects.filter((r) => r.index > 0 && r.indicatorId).map((rect) => (
        <PaneToolbar
          key={rect.index}
          rect={rect}
          isFirst={rect.index === 1}
          isLast={rect.index === paneRects.length - 1}
          onCollapse={() => withRefresh((a) => a.togglePaneCollapsed(rect.index))}
          onFullscreen={() => withRefresh((a) => a.togglePaneFullscreen(rect.index))}
          onMoveUp={() => withRefresh((a) => a.movePane(rect.index, "up"))}
          onMoveDown={() => withRefresh((a) => a.movePane(rect.index, "down"))}
          onDelete={() => { if (rect.indicatorId) onDelete?.(rect.indicatorId); }}
        />
      ))}
      {/* Pinned to its own low z-index stacking context -- LWC nests its own
          positioned canvas wrappers inside this div, and without an explicit
          z-index here those wrappers were intercepting clicks meant for the
          legend/pane-toolbar overlays above (confirmed by hand: Playwright's
          click retries failed with "subtree intercepts pointer events" on
          exactly this div). The overlays' z-10 only reliably wins once both
          sides of the comparison are explicit. */}
      <div
        ref={containerRef}
        role="img"
        aria-label="Price chart. Numeric levels are listed in the panels beside the chart."
        className="relative z-0 w-full h-full"
      />
    </div>
  );
}

function formatVolume(v: number): string {
  if (v >= 1e9) return (v / 1e9).toFixed(2) + "B";
  if (v >= 1e6) return (v / 1e6).toFixed(2) + "M";
  if (v >= 1e3) return (v / 1e3).toFixed(2) + "K";
  return String(v);
}

/** Top-left OHLCV readout, TradingView-style: shows the resting (latest) bar
 *  when idle, swaps to whatever bar is under the crosshair while hovering. */
function OhlcvReadout({ bar }: { bar: ApiOhlcBar }) {
  const up = bar.close >= bar.open;
  const change = bar.close - bar.open;
  const pct = bar.open !== 0 ? (change / bar.open) * 100 : 0;
  const color = up ? "var(--buy)" : "var(--sell)";
  const field = (label: string, value: string) => (
    <span>
      <span className="text-muted-foreground">{label} </span>
      <span style={{ color }}>{value}</span>
    </span>
  );
  return (
    <div className="absolute top-1.5 left-2 z-10 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] font-mono pointer-events-none select-none">
      {field("O", bar.open.toFixed(2))}
      {field("H", bar.high.toFixed(2))}
      {field("L", bar.low.toFixed(2))}
      {field("C", bar.close.toFixed(2))}
      <span style={{ color }}>
        {up ? "+" : ""}{change.toFixed(2)} ({up ? "+" : ""}{pct.toFixed(2)}%)
      </span>
      {field("Vol", formatVolume(bar.volume))}
    </div>
  );
}

/** TradingView-style on-chart indicator list: name + swatch, with hide/show
 *  and delete revealed on hover. Sits just under the OHLCV readout rather
 *  than floating separately per-pane -- see CandlestickChart.tsx's own
 *  header comment on that trade-off. */
function IndicatorLegend({ items, onToggleVisible, onDelete, onOpenSettings }: {
  items: LegendItem[];
  onToggleVisible?: (id: string, visible: boolean) => void;
  onDelete?: (id: string) => void;
  onOpenSettings?: (id: string) => void;
}) {
  return (
    <div className="absolute top-6 left-2 z-10 flex flex-col gap-0.5 text-[11px]">
      {items.map((item, i) => (
        <div
          key={item.id}
          className="group flex items-center gap-1.5 px-1 py-0.5 bg-(--card)/70 hover:bg-card transition-colors"
          style={{ opacity: item.hidden ? 0.5 : 1 }}
        >
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: SWATCH_COLORS[i % SWATCH_COLORS.length] }} />
          <span className="font-mono">{item.label}</span>
          {item.colorKey && <ColorKeyInfo entries={item.colorKey} />}
          <span className="hidden group-hover:flex items-center gap-1 ml-1">
            {item.hasSettings && (
              <button
                onClick={() => onOpenSettings?.(item.id)}
                aria-label={`${item.label} settings`}
                title="Settings"
                className="p-0.5 rounded-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </button>
            )}
            <button
              onClick={() => onToggleVisible?.(item.id, item.hidden)}
              aria-label={item.hidden ? `Show ${item.label}` : `Hide ${item.label}`}
              title={item.hidden ? "Show" : "Hide"}
              className="p-0.5 rounded-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              {item.hidden ? (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.5 18.5 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><path d="M1 1l22 22" />
                </svg>
              ) : (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
            <button
              onClick={() => onDelete?.(item.id)}
              aria-label={`Delete ${item.label}`}
              title="Delete"
              className="text-muted-foreground hover:text-sell"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          </span>
        </div>
      ))}
    </div>
  );
}

/** Info icon revealing a color -> meaning key on hover -- for an indicator
 *  like Volume Spread Analysis whose colors aren't self-explanatory the way
 *  a plain single-hue line's swatch is. Always visible (not hidden behind
 *  the row's own hover, unlike hide/delete): the point is discoverability
 *  at rest, not a rarely-needed action. */
function ColorKeyInfo({ entries }: { entries: { label: string; color: string }[] }) {
  return (
    <span className="relative group/info inline-flex">
      <span
        tabIndex={0}
        aria-label="What do these colors mean?"
        className="w-3.5 h-3.5 rounded-full border border-muted-foreground/50 text-muted-foreground text-[9px] leading-3.25 text-center cursor-help hover:border-foreground hover:text-foreground shrink-0"
      >
        i
      </span>
      <span className="hidden group-hover/info:block group-focus-within/info:block absolute top-full left-0 mt-1 z-20 w-64 bg-card border border-border p-2 shadow-lg">
        {entries.map((e) => (
          <span key={e.label} className="flex items-start gap-1.5 py-0.5 text-[10px] leading-snug">
            <span className="w-2 h-2 rounded-full shrink-0 mt-0.5" style={{ background: e.color }} />
            <span className="text-foreground font-sans">{e.label}</span>
          </span>
        ))}
      </span>
    </span>
  );
}

/** Floating per-pane toolbar (collapse / fullscreen / move up / move down /
 *  delete), positioned over the pane's real measured geometry -- pane 0
 *  (candle+volume) never gets one; only sub-panes, which each hold exactly
 *  one indicator (see attachPineIndicator's "own pane per sub indicator"). */
function PaneToolbar({ rect, isFirst, isLast, onCollapse, onFullscreen, onMoveUp, onMoveDown, onDelete }: {
  rect: PaneRect;
  isFirst: boolean;
  isLast: boolean;
  onCollapse: () => void;
  onFullscreen: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
}) {
  // TradingView highlights the hovered toolbar icon with a filled pill
  // behind it, not just a text-color change -- text-only hover was easy to
  // miss against the chart background.
  const btn = "p-1 rounded-sm text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30 disabled:hover:text-muted-foreground disabled:hover:bg-transparent transition-colors";
  return (
    <div
      className="absolute right-1 z-10 flex items-center gap-0.5 px-1 py-0.5 bg-(--card)/85"
      style={{ top: rect.top + 2 }}
    >
      <button onClick={onCollapse} aria-label="Collapse pane" title="Collapse" className={btn}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
      </button>
      <button onClick={onFullscreen} aria-label="Fullscreen pane" title="Fullscreen" className={btn}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" /></svg>
      </button>
      <button onClick={onMoveUp} disabled={isFirst} aria-label="Move pane up" title="Move up" className={btn}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
      </button>
      <button onClick={onMoveDown} disabled={isLast} aria-label="Move pane down" title="Move down" className={btn}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M19 12l-7 7-7-7" /></svg>
      </button>
      <button onClick={onDelete} aria-label="Delete pane" title="Delete" className="p-1 rounded-sm text-muted-foreground hover:text-sell hover:bg-secondary transition-colors">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
      </button>
    </div>
  );
}

/** Legend row for entry/target/stop + EMA color key, shown under the chart. */
export function ChartLegend({ signal }: { signal: ChartSignal | null }) {
  if (!signal) return null;
  const isBuy = signal.direction === "BUY";
  const isSell = signal.direction === "SELL";
  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap mt-2">
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
