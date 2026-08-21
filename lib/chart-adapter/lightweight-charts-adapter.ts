import { createChart, CandlestickSeries, HistogramSeries, type IChartApi, type ISeriesApi, type SeriesType } from "lightweight-charts";
import type { ApiOhlcBar } from "@/lib/api";
import type { ChatDrawing } from "@/lib/api/chat";
import type { SavedDrawing } from "@/lib/api/charts";
import { runPineIndicator } from "@/lib/api/pine";
import { attachPinePlotsToPane } from "./pine-render";
import type { ChartAdapter, ChartMountOptions, ManualDrawKind, PriceLevels } from "./types";

export interface PineIndicatorSpec {
  id: string;
  source: string;
  label: string;
  pane: "main" | "sub";
}

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
    const result = await runPineIndicator(spec.source, this.bars.map(b => ({ time: b.time, open: b.open, high: b.high, low: b.low, close: b.close, volume: b.volume ?? 0 })));
    if (!result.ok || !result.plots || !this.chart) return spec.id;
    const paneIndex = spec.pane === "main" ? 0 : this.chart.panes().length; // new sub-pane per non-main indicator
    const series = attachPinePlotsToPane(this.chart, paneIndex, result.plots, this.bars.map(b => b.time));
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

  addDrawings(_drawings: ChatDrawing[], _groupId: string): void { throw new Error("not implemented until Task 7"); }
  startManualDraw(_kind: ManualDrawKind, _groupId: string, _onChange: () => void): void { throw new Error("not implemented until Task 7"); }
  removeDrawingsByGroup(_groupId: string): void { throw new Error("not implemented until Task 7"); }
  removeDrawingsWhere(_predicate: (groupId: string) => boolean): void { throw new Error("not implemented until Task 7"); }
  listSavedDrawings(_groupIds: string[]): SavedDrawing[] { throw new Error("not implemented until Task 7"); }
  restoreDrawings(_drawings: SavedDrawing[]): void { throw new Error("not implemented until Task 7"); }
}
