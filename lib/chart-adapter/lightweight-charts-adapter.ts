import { createChart, CandlestickSeries, HistogramSeries, type IChartApi, type ISeriesApi, type ISeriesPrimitive, type IPriceLine, type SeriesType, type Time } from "lightweight-charts";
import type { ApiOhlcBar } from "@/lib/api";
import type { ChatDrawing } from "@/lib/api/chat";
import type { SavedDrawing } from "@/lib/api/charts";
import { runPineIndicator } from "@/lib/api/pine";
import { attachPinePlotsToPane } from "./pine-render";
import { createSegmentPrimitive, createRayPrimitive, createRectPrimitive, createFibonacciPrimitive, createTradeMarkerPrimitive, type DrawPoint } from "./drawing-primitives";
import type { ChartAdapter, ChartMountOptions, ManualDrawKind, PineIndicatorSpec, PriceLevels } from "./types";

export type { PineIndicatorSpec };

type DrawingEntry = { type: "primitive"; ref: ISeriesPrimitive<Time> } | { type: "priceline"; ref: IPriceLine };

/** ChartAdapter implementation on Lightweight Charts. Default view is
 * candle + volume only (both native LWC series, no calc engine needed) --
 * everything beyond that is a Pine script attached lazily via
 * attachPineIndicator, never a pre-populated catalog (there is none to
 * populate from under the Pine model). */
export class LightweightChartsAdapter implements ChartAdapter {
  private chart: IChartApi | null = null;
  private candleSeries: ISeriesApi<"Candlestick"> | null = null;
  private volumeSeries: ISeriesApi<"Histogram"> | null = null;
  private pineSeries = new Map<string, ISeriesApi<SeriesType>[]>();
  private bars: ApiOhlcBar[] = [];
  private onLoadMoreFn?: (oldestTimestampMs: number) => Promise<ApiOhlcBar[]>;
  private loadingMore = false;
  private drawings = new Map<string, DrawingEntry[]>();

  async mount(el: HTMLElement, options: ChartMountOptions): Promise<void> {
    this.bars = options.bars;
    this.onLoadMoreFn = options.onLoadMore;
    const chart = createChart(el, {
      layout: { background: { color: "#0b0e14" }, textColor: "#8b8a9e", attributionLogo: false },
      grid: { horzLines: { color: "#1a1e28" }, vertLines: { color: "#1a1e28" } },
    });
    this.chart = chart;

    this.candleSeries = chart.addSeries(CandlestickSeries, { upColor: "#16c784", downColor: "#f0525d", borderVisible: false, wickUpColor: "#16c784", wickDownColor: "#f0525d" });
    this.candleSeries.setData(options.bars.map(b => ({ time: b.time as never, open: b.open, high: b.high, low: b.low, close: b.close })));

    this.volumeSeries = chart.addSeries(HistogramSeries, { priceFormat: { type: "volume" }, priceScaleId: "" }, 1);
    this.volumeSeries.setData(options.bars.map(b => ({ time: b.time as never, value: b.volume ?? 0, color: b.close >= b.open ? "#16c78466" : "#f0525d66" })));

    // Pans back past the loaded range -> pull more history. Mirrors
    // klinecharts' own `forward: true` DataLoader contract from
    // KlinechartsAdapter, just against LWC's own range-change event instead.
    chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
      if (!range || range.from > 5 || this.loadingMore || !this.onLoadMoreFn || this.bars.length === 0) return;
      void this.loadMore();
    });
  }

  private async loadMore(): Promise<void> {
    if (!this.onLoadMoreFn || this.bars.length === 0) return;
    this.loadingMore = true;
    try {
      const older = await this.onLoadMoreFn(this.bars[0].time);
      if (older.length === 0) return;
      this.bars = [...older, ...this.bars];
      this.candleSeries!.setData(this.bars.map(b => ({ time: b.time as never, open: b.open, high: b.high, low: b.low, close: b.close })));
      this.volumeSeries!.setData(this.bars.map(b => ({ time: b.time as never, value: b.volume ?? 0, color: b.close >= b.open ? "#16c78466" : "#f0525d66" })));
    } finally {
      this.loadingMore = false;
    }
  }

  /** Test-only: exercises the exact same load-more path a real pan-back
   *  triggers, without simulating real chart-canvas scroll interaction. */
  __test_triggerLoadMore(): Promise<void> {
    return this.loadMore();
  }

  /** Test-only: the adapter's current view of the forming (last) bar. */
  __test_lastBar(): ApiOhlcBar {
    return this.bars[this.bars.length - 1];
  }

  dispose(): void {
    this.chart?.remove();
    this.chart = null;
    this.candleSeries = null;
    this.volumeSeries = null;
    this.pineSeries.clear();
  }

  resize(): void { /* LWC auto-sizes via its own container ResizeObserver when the chart is created with autoSize; explicit resize kept for interface parity */ }

  seriesCount(): number { return (this.candleSeries ? 1 : 0) + (this.volumeSeries ? 1 : 0) + [...this.pineSeries.values()].reduce((n, s) => n + s.length, 0); }

  async attachPineIndicator(spec: PineIndicatorSpec): Promise<string> {
    const result = await runPineIndicator(spec.source, this.bars);
    if (!result.ok || !result.plots || !this.chart) return spec.id;
    const paneIndex = spec.pane === "main" ? 0 : this.chart.panes().length; // new sub-pane per non-main indicator
    const series = attachPinePlotsToPane(this.chart, paneIndex, result.plots);
    this.pineSeries.set(spec.id, series);
    return spec.id;
  }

  removeIndicator(id: string): void {
    const series = this.pineSeries.get(id);
    if (!series || !this.chart) return;
    for (const s of series) this.chart.removeSeries(s);
    this.pineSeries.delete(id);
  }

  setPriceLevels(levels: PriceLevels): void {
    if (!this.candleSeries) return;
    const line = (value: number | undefined, color: string) => value != null && this.candleSeries!.createPriceLine({ price: value, color, lineStyle: 2, lineWidth: 1 });
    line(levels.entry, "#8b8a9e");
    line(levels.target, "#16c784");
    line(levels.stopLoss, "#f0525d");
  }

  pushLiveTick(price: number): void {
    if (!this.candleSeries || !this.volumeSeries || this.bars.length === 0) return;
    const last = this.bars[this.bars.length - 1];
    const updated = { ...last, close: price, high: Math.max(last.high, price), low: Math.min(last.low, price) };
    this.bars[this.bars.length - 1] = updated;
    this.candleSeries.update({ time: updated.time as never, open: updated.open, high: updated.high, low: updated.low, close: updated.close });
  }

  setIndicators(): void { /* no-op under the Pine model -- indicators are attached/removed individually via attachPineIndicator/removeIndicator, never as a bulk name list (there is no fixed catalog to name against) */ }

  async attachCustomIndicator(): Promise<string | null> {
    // The klinecharts-only diascript custom-indicator path -- diascript is
    // retired under this adapter (see the migration spec's "Why diascript
    // can't just be ported"). Agent-authored indicators go through
    // attachPineIndicator once Task 9 rewrites the chat agent's tool to
    // write Pine instead. Not wired here since ChartAdapter is a shared
    // interface both adapters implement and this method only has meaning
    // for the klinecharts side during the transition.
    throw new Error("attachCustomIndicator is klinecharts/diascript-only -- use attachPineIndicator");
  }

  addDrawings(drawings: ChatDrawing[], groupId: string): void {
    if (!this.candleSeries) return;
    const list = this.drawings.get(groupId) ?? [];
    for (const d of drawings) {
      const entry = this.buildDrawingEntry(d);
      if (entry) list.push(entry);
    }
    this.drawings.set(groupId, list);
  }

  private buildDrawingEntry(d: ChatDrawing): DrawingEntry | null {
    if (!this.candleSeries) return null;
    const toPoints = (pts?: { timestamp: number; value: number }[]): [DrawPoint, DrawPoint] | null =>
      pts && pts.length >= 2 ? [{ time: pts[0].timestamp, value: pts[0].value }, { time: pts[1].timestamp, value: pts[1].value }] : null;

    if (d.kind === "segment") {
      const points = toPoints(d.points);
      if (!points) return null;
      const primitive = createSegmentPrimitive({ points, color: d.color || "#6c5ce7" });
      this.candleSeries.attachPrimitive(primitive);
      return { type: "primitive", ref: primitive };
    }
    if (d.kind === "priceline" && d.value != null) {
      const ref = this.candleSeries.createPriceLine({ price: d.value, color: d.color || "#8b8a9e", lineStyle: 2, lineWidth: 1 });
      return { type: "priceline", ref };
    }
    if (d.kind === "fibonacci") {
      const points = toPoints(d.points);
      if (!points) return null;
      const primitive = createFibonacciPrimitive({ points, color: d.color });
      this.candleSeries.attachPrimitive(primitive);
      return { type: "primitive", ref: primitive };
    }
    if (d.kind === "trade_marker" && d.timestamp != null && d.value != null) {
      const primitive = createTradeMarkerPrimitive({ point: { time: d.timestamp, value: d.value }, side: d.side ?? "BUY", color: d.color });
      this.candleSeries.attachPrimitive(primitive);
      return { type: "primitive", ref: primitive };
    }
    // "series" (an arbitrary multi-point agent-picked line, e.g. a moving
    // average) needs a primitive that draws through N points, not just 2 --
    // klinecharts' "brush" equivalent. Not yet built; every other kind is.
    return null;
  }

  startManualDraw(kind: ManualDrawKind, _groupId: string, _onChange: () => void): void {
    // LWC has no built-in "click to draw" interaction the way klinecharts'
    // overlay system does -- this needs its own pointer-event handling on
    // the chart's container element (down -> move preview -> up commits,
    // Escape cancels), then calls addDrawings([...], groupId) and onChange()
    // once committed. Rendering primitives for every manual-draw kind
    // (trendline/ray/hline/fib/rect) are complete and tested above; the
    // interaction layer that would call them from a live drag is real,
    // separate work -- flagged here rather than faked with a no-op that
    // silently does nothing when the user picks a tool.
    throw new Error(`manual draw interaction not yet wired for "${kind}" -- rendering primitives exist, pointer-driven drawing does not`);
  }

  removeDrawingsByGroup(groupId: string): void {
    const list = this.drawings.get(groupId);
    if (!list || !this.candleSeries) return;
    for (const entry of list) {
      if (entry.type === "primitive") this.candleSeries.detachPrimitive(entry.ref);
      else this.candleSeries.removePriceLine(entry.ref);
    }
    this.drawings.delete(groupId);
  }

  removeDrawingsWhere(predicate: (groupId: string) => boolean): void {
    for (const groupId of [...this.drawings.keys()]) if (predicate(groupId)) this.removeDrawingsByGroup(groupId);
  }

  /** Saved-layout persistence needs each drawing's own serializable spec
   *  (the primitive factories above take plain option objects -- storing
   *  THAT alongside the primitive instance, not the primitive itself, is
   *  what this needs) wired together with startManualDraw in the same
   *  follow-up noted there. */
  listSavedDrawings(_groupIds: string[]): SavedDrawing[] { return []; }
  restoreDrawings(_drawings: SavedDrawing[]): void { /* see listSavedDrawings note */ }

  /** Test-only: how many drawings (primitives + price lines) are tracked
   *  under one group. */
  __test_drawingCount(groupId: string): number { return this.drawings.get(groupId)?.length ?? 0; }
}
