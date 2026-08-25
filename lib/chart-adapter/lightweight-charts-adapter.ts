import { createChart, createSeriesMarkers, HistogramSeries, TickMarkType, type IChartApi, type ISeriesApi, type ISeriesMarkersPluginApi, type ISeriesPrimitive, type IPriceLine, type PriceLineOptions, type SeriesType, type Time, type LineWidth } from "lightweight-charts";
import type { ApiOhlcBar } from "@/lib/api";
import type { ChatDrawing } from "@/lib/api/chat";
import type { SavedDrawing } from "@/lib/api/charts";
import { runPineIndicator, type PineInputMeta } from "@/lib/api/pine";
import { attachPinePlotsToPane } from "./pine-render";
import { createSegmentPrimitive, createRayPrimitive, createRectPrimitive, createFibonacciPrimitive, createTradeMarkerPrimitive, type DrawPoint } from "./drawing-primitives";
import { createVolumeProfilePrimitive, type VolumeProfileHandle, type VolumeProfileMode } from "./volume-profile-primitive";
import { computeVsaColors } from "./vsa-colors";
import { INDICATOR_COLORS } from "./palette";
import { rendererFor } from "./chart-types/registry";
import type { ChartRendererHandle, ChartTypeId } from "./chart-types/types";
import type { ChartAdapter, ChartMountOptions, ManualDrawKind, PaneRect, PineIndicatorSpec, PlotStyleOverride, PriceLevels } from "./types";

export type { PineIndicatorSpec };

type DrawingEntry = { type: "primitive"; ref: ISeriesPrimitive<Time> } | { type: "priceline"; ref: IPriceLine };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** How often the still-forming bar's volume is re-polled (see
 *  ChartMountOptions.onPollVolume) -- 5s is the floor a real stress test
 *  against Dukascopy confirmed safe (15s/10s/5s all clean, no 429s over a
 *  5-minute run; not tested faster). Not configurable per-call: every
 *  caller polling the same live symbol should hit that floor uniformly,
 *  not each pick its own rate. */
const POLL_VOLUME_MS = 5_000;

function sameCalendarDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** `bars` is always time-sorted ascending -- binary search rather than a
 *  maintained lookup map, so there's no separate cache to keep in sync
 *  across mount/loadMore/pushLiveTick. Only the crosshair readout calls
 *  this, at most once per mouse-move tick, so O(log n) is plenty. */
function findBarByTime(bars: ApiOhlcBar[], time: number): ApiOhlcBar | undefined {
  let lo = 0, hi = bars.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (bars[mid].time === time) return bars[mid];
    if (bars[mid].time < time) lo = mid + 1; else hi = mid - 1;
  }
  return undefined;
}

/** LWC's LineWidth type is the literal union 1|2|3|4, not `number` -- a
 *  style override comes from a settings form (arbitrary user input, or a
 *  saved value from before this cap existed), so it's clamped and rounded
 *  here rather than trusted. */
function clampLineWidth(width: number): LineWidth {
  return Math.min(4, Math.max(1, Math.round(width))) as LineWidth;
}

/** LWC picks a tick's TYPE by the overall visible range, not by what that
 *  individual tick actually lands on -- confirmed by hand, every tick across
 *  a whole 1D/1W/1m period (all intraday bars) came through as `DayOfMonth`,
 *  never `Time`. Branching on the type alone just reproduced LWC's own
 *  default ("21 21 21 21..." repeated across a full session of 5m/15m/1h
 *  bars). The type is trustworthy for the calendar-boundary cases
 *  (Year/Month, which only ever fire at a real boundary); for DayOfMonth
 *  specifically, what actually decides "day number or time-of-day" is
 *  whether this tick's bar is the first one on a new calendar day relative
 *  to the PREVIOUS bar in the real dataset -- not the tick's own timestamp
 *  (a midnight check would work for daily bars but says nothing about which
 *  intraday tick is the first of its session).
 *
 * `getBars` is read fresh on every call rather than closed over once: the
 * dataset grows via loadMore, and a stale snapshot would misjudge boundaries
 * in newly-prepended history. */
function makeTickMarkFormatter(getBars: () => ApiOhlcBar[]) {
  return function tickMarkFormatter(time: Time, tickMarkType: TickMarkType): string {
    const date = new Date((time as number) * 1000);
    const hhmm = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;

    switch (tickMarkType) {
      case TickMarkType.Year:
        return String(date.getFullYear());
      case TickMarkType.Month:
        return MONTHS[date.getMonth()];
      case TickMarkType.DayOfMonth: {
        const bars = getBars();
        const idx = bars.findIndex((b) => b.time === time);
        const prevBar = idx > 0 ? bars[idx - 1] : null;
        const isNewDay = !prevBar || !sameCalendarDay(new Date(prevBar.time * 1000), date);
        return isNewDay ? String(date.getDate()) : hhmm;
      }
      default: // Time / TimeWithSeconds
        return hhmm;
    }
  };
}

/** ChartAdapter implementation on Lightweight Charts. Default view is
 * candle + volume only (both native LWC series, no calc engine needed) --
 * everything beyond that is a Pine script attached lazily via
 * attachPineIndicator, never a pre-populated catalog (there is none to
 * populate from under the Pine model). */
export class LightweightChartsAdapter implements ChartAdapter {
  private chart: IChartApi | null = null;
  /** The main pane's currently-active series -- whichever type setChartType
   *  last picked. Never literally always a candlestick any more, hence the
   *  name: everything that anchors to it (price lines, drawing primitives,
   *  the marker fallback) uses the same generic ISeriesApi surface every
   *  Lightweight Charts series type shares. */
  private mainSeries: ISeriesApi<SeriesType> | null = null;
  private renderer: ChartRendererHandle | null = null;
  private chartType: ChartTypeId = "candles";
  private volumeSeries: ISeriesApi<"Histogram"> | null = null;
  private pineSeries = new Map<string, ISeriesApi<SeriesType>[]>();
  /** plotshape()/plotchar() output, one combined marker-plugin handle per
   *  indicator id (all of that indicator's boolean plots merged into one
   *  set of markers -- see attachPineIndicator). */
  private markerHandles = new Map<string, ISeriesMarkersPluginApi<Time>>();
  /** This indicator's own input.*() metadata, from its last successful
   *  attach -- what the settings-gear form reads. */
  private inputsMetaByIndicator = new Map<string, PineInputMeta[]>();
  private bars: ApiOhlcBar[] = [];
  private onLoadMoreFn?: (oldestLoadedTime: number) => Promise<ApiOhlcBar[]>;
  private loadingMore = false;
  private onPollVolumeFn?: (bucketStartSec: number) => Promise<number | null>;
  private volumePollTimer: ReturnType<typeof setInterval> | null = null;
  private onFetchTicksFn?: (sinceSec: number, untilSec: number) => Promise<{ t: number; p: number }[] | null>;
  private drawings = new Map<string, DrawingEntry[]>();
  private volumeProfileHandles = new Map<string, VolumeProfileHandle>();
  private containerEl: HTMLElement | null = null;
  /** Stretch factors saved before a pane's collapse, keyed by the pane's
   *  identity (its own series, not its index -- index shifts if another
   *  pane is added/removed/reordered while this one stays collapsed). */
  private collapsedPanes = new Map<ISeriesApi<SeriesType>, number>();
  private fullscreenPane: ISeriesApi<SeriesType> | null = null;
  private preFullscreenStretchFactors: Map<ISeriesApi<SeriesType>, number> | null = null;
  private vsaEnabled = false;
  /** Set via setActiveSymbol() -- lets attachPineIndicator pass real
   *  syminfo to the sandbox (see bars-provider.mjs) instead of leaving
   *  syminfo.* undefined for every script. */
  private activeSymbol?: string;
  private activeExchange?: string;

  setActiveSymbol(symbol: string, exchange: string): void {
    this.activeSymbol = symbol;
    this.activeExchange = exchange;
  }

  /** The volume histogram's own bar-by-bar data, colored plain up/down or by
   *  Volume Spread Analysis depending on the current toggle -- shared by
   *  mount() and loadMore() so the two never drift out of sync on which
   *  coloring is active. */
  private buildVolumeData(bars: ApiOhlcBar[]): { time: never; value: number; color: string }[] {
    const colors = this.vsaEnabled
      ? computeVsaColors(bars)
      : bars.map((b) => (b.close >= b.open ? "#16c78466" : "#f0525d66"));
    return bars.map((b, i) => ({ time: b.time as never, value: b.volume ?? 0, color: colors[i] }));
  }

  /** Overwrites just the LAST bar's volume and redraws the histogram --
   *  full setData() rather than a single-point update() because coloring
   *  (VSA especially) depends on neighboring bars' own volume, not only
   *  this one's. */
  private setLastBarVolume(volume: number): void {
    if (!this.volumeSeries || this.bars.length === 0) return;
    const last = this.bars[this.bars.length - 1];
    this.bars[this.bars.length - 1] = { ...last, volume };
    this.volumeSeries.setData(this.buildVolumeData(this.bars));
  }

  /** Re-reads the still-forming bar's own volume from onPollVolumeFn --
   *  null (a vendor gap, or a symbol this doesn't apply to) leaves the
   *  current value alone rather than zeroing out real volume the last poll
   *  or the initial historical fetch already found. */
  private async pollVolume(): Promise<void> {
    if (!this.onPollVolumeFn || this.bars.length === 0) return;
    const bucketStart = this.bars[this.bars.length - 1].time;
    const volume = await this.onPollVolumeFn(bucketStart);
    if (volume != null) this.setLastBarVolume(volume);
  }

  async mount(el: HTMLElement, options: ChartMountOptions): Promise<void> {
    this.bars = options.bars;
    this.onLoadMoreFn = options.onLoadMore;
    this.onFetchTicksFn = options.onFetchTicks;
    this.containerEl = el;
    const chart = createChart(el, {
      layout: { background: { color: "#0b0e14" }, textColor: "#8b8a9e", attributionLogo: false },
      grid: { horzLines: { color: "#1a1e28" }, vertLines: { color: "#1a1e28" } },
      timeScale: { tickMarkFormatter: makeTickMarkFormatter(() => this.bars) },
    });
    this.chart = chart;

    this.chartType = options.chartType ?? "candles";
    this.renderer = rendererFor(this.chartType)(chart, options.bars, { fetchTicks: this.onFetchTicksFn });
    this.mainSeries = this.renderer.series;

    this.volumeSeries = chart.addSeries(HistogramSeries, { priceFormat: { type: "volume" }, priceScaleId: "volume" });
    this.volumeSeries.setData(this.buildVolumeData(options.bars));
    chart.priceScale("volume").applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });

    this.onPollVolumeFn = options.onPollVolume;
    if (this.onPollVolumeFn) {
      void this.pollVolume(); // don't wait a full interval for the first real number
      this.volumePollTimer = setInterval(() => void this.pollVolume(), POLL_VOLUME_MS);
    }

    // Pans back past the loaded range -> pull more history. Mirrors
    // klinecharts' own `forward: true` DataLoader contract from
    // KlinechartsAdapter, just against LWC's own range-change event instead.
    chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
      if (!range || range.from > 5 || this.loadingMore || !this.onLoadMoreFn || this.bars.length === 0) return;
      void this.loadMore();
    });

    // TradingView-style OHLCV readout: real O/H/L/C from `this.bars`, not
    // from the main series' own crosshair payload -- that used to work
    // because the main series was always a Candlestick (open/high/low/close
    // in its own payload), but Line/Area only ever carry `value`. TradingView
    // itself keeps showing real OHLC in this readout even in Line mode, so
    // reading the underlying bar data directly is the correct behavior for
    // every chart type, not a Candlestick-specific shortcut.
    if (options.onCrosshairMove) {
      const onCrosshairMove = options.onCrosshairMove;
      chart.subscribeCrosshairMove((param) => {
        const bar = param.time ? findBarByTime(this.bars, param.time as unknown as number) : undefined;
        if (!bar) { onCrosshairMove(null); return; }
        onCrosshairMove({
          time: bar.time, open: bar.open, high: bar.high, low: bar.low, close: bar.close,
          volume: bar.volume ?? 0,
        });
      });
    }
  }

  setChartType(id: ChartTypeId): void {
    if (!this.chart || this.chartType === id) return;
    const oldSeries = this.mainSeries;
    // Drawings, price lines, and Volume Profile primitives were all created
    // against the OLD main series (see buildDrawingEntry/attachVolumeProfile)
    // -- chart.removeSeries() below tears them down along with it, so their
    // options/identity have to be captured first and re-created against the
    // new series. None of them derive from the chart TYPE itself (a trendline
    // is the same trendline whether the candles under it are candles or a
    // line), so this is what makes them actually stay put across a switch.
    const priceLineOptions = new Map<IPriceLine, PriceLineOptions>();
    for (const list of this.drawings.values()) {
      for (const entry of list) {
        if (entry.type === "priceline") priceLineOptions.set(entry.ref, entry.ref.options());
      }
    }

    if (oldSeries) this.chart.removeSeries(oldSeries);
    this.chartType = id;
    this.renderer = rendererFor(id)(this.chart, this.bars, { fetchTicks: this.onFetchTicksFn });
    this.mainSeries = this.renderer.series;

    for (const list of this.drawings.values()) {
      for (const entry of list) {
        if (entry.type === "primitive") this.mainSeries.attachPrimitive(entry.ref);
        else entry.ref = this.mainSeries.createPriceLine(priceLineOptions.get(entry.ref)!);
      }
    }
    for (const handle of this.volumeProfileHandles.values()) this.mainSeries.attachPrimitive(handle.primitive);
  }

  getChartType(): ChartTypeId {
    return this.chartType;
  }

  private async loadMore(): Promise<void> {
    if (!this.onLoadMoreFn || this.bars.length === 0) return;
    this.loadingMore = true;
    try {
      const older = await this.onLoadMoreFn(this.bars[0].time);
      if (older.length === 0) return;
      // setData() re-anchors every existing bar's logical index by however
      // many bars just got prepended, but the time scale's own visible
      // logical range doesn't shift along with it -- confirmed by hand, the
      // chart went fully blank after a pan-back fetch that DID return data,
      // because the still-old range now pointed at bars that don't exist
      // (or the wrong ones) in the newly reindexed series. Capturing the
      // range before, then re-applying it shifted by the prepended count
      // after, is what keeps the user looking at the same candles they were
      // already looking at.
      const visibleRange = this.chart?.timeScale().getVisibleLogicalRange();
      this.bars = [...older, ...this.bars];
      this.renderer!.setData(this.bars);
      this.volumeSeries!.setData(this.buildVolumeData(this.bars));
      if (visibleRange) {
        this.chart?.timeScale().setVisibleLogicalRange({ from: visibleRange.from + older.length, to: visibleRange.to + older.length });
      }
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

  /** Test-only: how many bars the adapter currently holds -- lets a test
   *  assert pushLiveTick appended a new one rather than just mutating. */
  __test_barCount(): number {
    return this.bars.length;
  }

  /** Test-only: the bar `fromEnd` positions back from the last one (0 =
   *  the same as __test_lastBar()). */
  __test_barAt(fromEnd: number): ApiOhlcBar {
    return this.bars[this.bars.length - 1 - fromEnd];
  }

  dispose(): void {
    if (this.volumePollTimer != null) { clearInterval(this.volumePollTimer); this.volumePollTimer = null; }
    this.chart?.remove();
    this.chart = null;
    this.mainSeries = null;
    this.renderer = null;
    this.volumeSeries = null;
    this.pineSeries.clear();
    this.volumeProfileHandles.clear();
    this.containerEl = null;
    this.collapsedPanes.clear();
    this.fullscreenPane = null;
    this.preFullscreenStretchFactors = null;
  }

  attachVolumeProfile(id: string, mode: VolumeProfileMode): void {
    if (!this.mainSeries || this.volumeProfileHandles.has(id)) return;
    const handle = createVolumeProfilePrimitive(() => this.bars, mode);
    this.mainSeries.attachPrimitive(handle.primitive);
    this.volumeProfileHandles.set(id, handle);
  }

  removeVolumeProfile(id: string): void {
    const handle = this.volumeProfileHandles.get(id);
    if (!handle || !this.mainSeries) return;
    this.mainSeries.detachPrimitive(handle.primitive);
    this.volumeProfileHandles.delete(id);
  }

  setIndicatorVisible(id: string, visible: boolean): void {
    const series = this.pineSeries.get(id);
    if (series) { for (const s of series) s.applyOptions({ visible }); return; }
    this.volumeProfileHandles.get(id)?.setVisible(visible);
  }

  /** Which pane (by index) currently contains this series -- computed live
   *  by scanning `chart.panes()` rather than cached, since pane membership
   *  changes on every reorder/removal. */
  private paneIndexOfSeries(series: ISeriesApi<SeriesType>): number {
    const panes = this.chart?.panes() ?? [];
    for (let i = 0; i < panes.length; i++) if (panes[i].getSeries().includes(series)) return i;
    return -1;
  }

  getPaneRects(): PaneRect[] {
    if (!this.chart || !this.containerEl) return [];
    const containerRect = this.containerEl.getBoundingClientRect();
    return this.chart.panes().map((pane, index) => {
      const el = pane.getHTMLElement();
      const rect = el?.getBoundingClientRect();
      let indicatorId: string | undefined;
      for (const [id, series] of this.pineSeries) {
        if (series.length > 0 && pane.getSeries().includes(series[0])) { indicatorId = id; break; }
      }
      return { index, top: rect ? rect.top - containerRect.top : 0, height: pane.getHeight(), indicatorId };
    });
  }

  togglePaneCollapsed(index: number): void {
    // setHeight() looked like the obvious API, but every call triggers LWC's
    // own recalculateAllPanes() -- fine for one pane in isolation, but
    // setting several panes' heights in the same tick (fullscreen, below)
    // cascades: each call redistributes based on the OTHER panes' still-old
    // state, so the panes actually meant to shrink grew instead (confirmed
    // by hand, logging real heights before/after). Panes are fundamentally
    // stretch-factor (flex-grow-like) driven -- setStretchFactor is the one
    // primitive that doesn't trigger that cascade, so it's used everywhere
    // pane sizing needs to change, collapse included even though a single
    // pane's own setHeight call alone might have been safe.
    const pane = this.chart?.panes()[index];
    const key = pane?.getSeries()[0];
    if (!pane || !key) return;
    const saved = this.collapsedPanes.get(key);
    if (saved != null) {
      pane.setStretchFactor(saved);
      this.collapsedPanes.delete(key);
    } else {
      this.collapsedPanes.set(key, pane.getStretchFactor());
      pane.setStretchFactor(0.05);
    }
  }

  togglePaneFullscreen(index: number): void {
    if (!this.chart) return;
    const panes = this.chart.panes();
    const target = panes[index];
    const targetKey = target?.getSeries()[0];
    if (!target || !targetKey) return;

    if (this.fullscreenPane === targetKey) {
      if (this.preFullscreenStretchFactors) {
        for (const pane of panes) {
          const key = pane.getSeries()[0];
          const factor = key && this.preFullscreenStretchFactors.get(key);
          if (factor != null) pane.setStretchFactor(factor);
        }
      }
      this.fullscreenPane = null;
      this.preFullscreenStretchFactors = null;
      return;
    }

    this.preFullscreenStretchFactors = new Map();
    for (const pane of panes) {
      const key = pane.getSeries()[0];
      if (key) this.preFullscreenStretchFactors.set(key, pane.getStretchFactor());
    }
    for (const pane of panes) pane.setStretchFactor(pane === target ? 1000 : 1);
    this.fullscreenPane = targetKey;
  }

  movePane(index: number, direction: "up" | "down"): void {
    const target = direction === "up" ? index - 1 : index + 1;
    const panes = this.chart?.panes() ?? [];
    if (!panes[index] || target < 0 || target >= panes.length) return;
    panes[index].moveTo(target);
  }

  setVolumeSpreadAnalysis(enabled: boolean): void {
    if (this.vsaEnabled === enabled) return;
    this.vsaEnabled = enabled;
    this.volumeSeries?.setData(this.buildVolumeData(this.bars));
  }

  resize(): void { /* LWC auto-sizes via its own container ResizeObserver when the chart is created with autoSize; explicit resize kept for interface parity */ }

  seriesCount(): number { return (this.mainSeries ? 1 : 0) + (this.volumeSeries ? 1 : 0) + [...this.pineSeries.values()].reduce((n, s) => n + s.length, 0); }

  /** Test-only: how many panes the chart currently has. */
  __test_paneCount(): number { return this.chart?.panes().length ?? 0; }

  /** Test-only: this adapter's own collapsed/fullscreen bookkeeping, not
   *  LWC's reported pane height -- jsdom runs no real layout pass, so
   *  getHeight()/setHeight() don't reflect anything meaningful there. */
  __test_isPaneCollapsed(index: number): boolean {
    const key = this.chart?.panes()[index]?.getSeries()[0];
    return key != null && this.collapsedPanes.has(key);
  }
  __test_isPaneFullscreen(index: number): boolean {
    const key = this.chart?.panes()[index]?.getSeries()[0];
    return key != null && this.fullscreenPane === key;
  }

  /** Test-only: whether a Volume Profile with this id is currently attached. */
  __test_hasVolumeProfile(id: string): boolean { return this.volumeProfileHandles.has(id); }

  /** Test-only: whether a Volume Profile with this id is currently visible. */
  __test_isVolumeProfileVisible(id: string): boolean | undefined { return this.volumeProfileHandles.get(id)?.getVisible(); }

  /** Test-only: the rendered color of a Pine indicator's first series. */
  __test_seriesColor(id: string): string | undefined {
    const series = this.pineSeries.get(id)?.[0];
    return series ? (series.options() as { color?: string }).color : undefined;
  }

  /** Test-only: the rendered color/lineWidth of this indicator's series
   *  matching a given plot title. */
  __test_seriesOptionsByTitle(id: string, title: string): { color?: string; lineWidth?: number; visible?: boolean } | undefined {
    const series = this.pineSeries.get(id)?.find((s) => s.options().title === title);
    return series ? (series.options() as { color?: string; lineWidth?: number; visible?: boolean }) : undefined;
  }

  /** Test-only: how many plotshape()/plotchar() markers this indicator has. */
  __test_markerCount(id: string): number {
    return this.markerHandles.get(id)?.markers().length ?? 0;
  }

  getIndicatorInputsMeta(id: string): PineInputMeta[] | undefined {
    return this.inputsMetaByIndicator.get(id);
  }

  getIndicatorPlotNames(id: string): string[] {
    return (this.pineSeries.get(id) ?? [])
      .map((s) => s.options().title)
      .filter((title): title is string => !!title);
  }

  setIndicatorPlotStyle(id: string, title: string, style: PlotStyleOverride): void {
    const target = this.pineSeries.get(id)?.find((s) => s.options().title === title);
    if (!target) return;
    const options: Record<string, unknown> = {};
    if (style.color != null) options.color = style.color;
    if (style.lineWidth != null) options.lineWidth = clampLineWidth(style.lineWidth);
    if (style.visible != null) options.visible = style.visible;
    target.applyOptions(options);
  }

  async attachPineIndicator(spec: PineIndicatorSpec): Promise<string | null> {
    const result = await runPineIndicator(spec.source, this.bars, this.activeSymbol, this.activeExchange, spec.params);
    // Previously returned spec.id here too -- indistinguishable from success,
    // so the caller that checks for a null return (and the one that doesn't)
    // both treated a failed sandbox run as a silent no-op attach.
    if (!result.ok || !result.plots || !this.chart) return null;
    if (result.inputsMeta && result.inputsMeta.length > 0) this.inputsMetaByIndicator.set(spec.id, result.inputsMeta);
    else this.inputsMetaByIndicator.delete(spec.id);
    // "volume" shares pane 0 with "main" (it's positioned over the volume
    // histogram's region, not a pane of its own) -- only "sub" gets a fresh
    // pane. It does NOT share the "volume" price scale itself: volume runs
    // in the tens of thousands while a plot like Spread runs in single
    // digits, and one linear scale spanning both crushes the smaller series
    // flat against the axis -- confirmed by hand, "Spread (on Volume)"
    // rendered with a real value tag but no visible line at all. Its own
    // scale, auto-ranged to its own values, with the same bottom-anchored
    // margins as the volume histogram, is what actually overlays it in the
    // same visual band instead of the same (wrong) numbers.
    const paneIndex = spec.pane === "sub" ? this.chart.panes().length : 0;
    const priceScaleId = spec.pane === "volume" ? `volume-overlay:${spec.id}` : undefined;
    // Cycled by how many Pine indicators are already attached -- every
    // series a plain LineSeries rendered in LWC's own default color
    // regardless of which indicator it was, so two single-line indicators
    // like SMA and EMA were visually identical on the chart despite the
    // legend showing them in different colors. This is what the legend's
    // own swatch colors are drawn from too (see palette.ts) -- one shared
    // source, not two independently-coincidental palettes. An indicator with
    // several of its own lines (MACD's MACD/Signal) cycles forward from this
    // starting index, one shared palette rather than shades of one hue.
    const colorIndex = this.pineSeries.size % INDICATOR_COLORS.length;
    const { series, markerPlots } = attachPinePlotsToPane(this.chart, paneIndex, result.plots, priceScaleId, colorIndex, result.fills ?? undefined);
    if (priceScaleId) this.chart.priceScale(priceScaleId).applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
    this.pineSeries.set(spec.id, series);
    // plotshape()/plotchar() (e.g. a script's own Buy/Sell signals) anchor
    // to this indicator's own first series -- the normal case, a script
    // like G-Channel pairs its signals with a real trend-line plot in the
    // same attach. A script with ONLY boolean output (no numeric plot of
    // its own) falls back to the main candle series; for a "sub" pane that
    // means the markers land on the main pane instead of a sub pane that
    // was never actually created (attachPinePlotsToPane made zero series,
    // so no pane exists there to anchor to) -- a rare case, not a crash.
    const allMarkers = markerPlots.flatMap((m) => m.markers);
    if (allMarkers.length > 0) {
      const anchor = series[0] ?? this.mainSeries;
      if (anchor) this.markerHandles.set(spec.id, createSeriesMarkers(anchor, allMarkers));
    }
    // Style overrides are per-plot rendering settings, saved separately from
    // the sandbox run itself -- re-apply them to the freshly-created series
    // every attach (a fresh attach always gets fresh series with the default
    // palette color, so this has to run every time, not just once).
    if (spec.style) {
      for (const s of series) {
        const title = s.options().title;
        const override = title ? spec.style[title] : undefined;
        if (override) this.setIndicatorPlotStyle(spec.id, title!, override);
      }
    }
    return spec.id;
  }

  removeIndicator(id: string): void {
    const series = this.pineSeries.get(id);
    if (!series || !this.chart) return;
    // Captured before removal: once the series are gone there's nothing left
    // to look up the pane by.
    const paneIndex = series[0] ? this.paneIndexOfSeries(series[0]) : -1;
    const markerHandle = this.markerHandles.get(id);
    if (markerHandle) {
      markerHandle.detach();
      this.markerHandles.delete(id);
    }
    for (const s of series) this.chart.removeSeries(s);
    this.pineSeries.delete(id);
    this.inputsMetaByIndicator.delete(id);
    // Sub-pane indicators each own their pane exclusively (see
    // attachPineIndicator) -- an indicator's removal is that pane's last
    // series going away, so clean the now-empty pane up rather than leaving
    // a ghost strip behind. Pane 0 (candle+volume) is never a candidate:
    // paneIndexOfSeries only matches pine indicator series, and a "main"
    // indicator never has a pane to itself.
    if (paneIndex > 0) {
      const pane = this.chart.panes()[paneIndex];
      if (pane && pane.getSeries().length === 0) this.chart.removePane(paneIndex);
    }
  }

  setPriceLevels(levels: PriceLevels): void {
    if (!this.mainSeries) return;
    const line = (value: number | undefined, color: string) => value != null && this.mainSeries!.createPriceLine({ price: value, color, lineStyle: 2, lineWidth: 1 });
    line(levels.entry, "#8b8a9e");
    line(levels.target, "#16c784");
    line(levels.stopLoss, "#f0525d");
  }

  /** A tick landing within the forming candle's own period updates it in
   *  place (open/high/low mutate, chart doesn't grow a new bar every
   *  second). A tick landing AFTER that period must start a fresh bar
   *  instead -- without this check the forming candle absorbed every tick
   *  forever, however many real minutes actually passed, since nothing
   *  here re-fetches until the user changes symbol/period/reloads. Found
   *  live watching Deriv's ~1/sec ticks (frequent enough to make the chart
   *  visibly frozen on one candle within minutes) -- same bug for every
   *  exchange, just far less obvious against Kite's slower cadence. */
  pushLiveTick(price: number, nowSec: number = Math.floor(Date.now() / 1000)): void {
    if (!this.renderer || !this.volumeSeries || this.bars.length === 0) return;
    const last = this.bars[this.bars.length - 1];
    const intervalSec = this.bars.length >= 2
      ? this.bars[this.bars.length - 1].time - this.bars[this.bars.length - 2].time
      : 60; // No second bar to measure from yet -- 1m, this app's shortest real interval.

    if (nowSec >= last.time + intervalSec) {
      // Snapped to the interval grid from the last bar's own time, not raw
      // nowSec, so a slightly-late tick still lands in the period that's
      // actually forming rather than one that's subtly off-grid. A real
      // gap (tab backgrounded, market reopening) skips straight to the
      // current period -- never backfills fabricated flat candles for
      // periods with no real tick data.
      const bucketStart = last.time + Math.floor((nowSec - last.time) / intervalSec) * intervalSec;
      const newBar = { time: bucketStart, open: price, high: price, low: price, close: price, volume: 0 };
      this.bars.push(newBar);
      this.renderer.updateBar(newBar);
      return;
    }

    const updated = { ...last, close: price, high: Math.max(last.high, price), low: Math.min(last.low, price) };
    this.bars[this.bars.length - 1] = updated;
    this.renderer.updateBar(updated);
  }

  addDrawings(drawings: ChatDrawing[], groupId: string): void {
    if (!this.mainSeries) return;
    const list = this.drawings.get(groupId) ?? [];
    for (const d of drawings) {
      const entry = this.buildDrawingEntry(d);
      if (entry) list.push(entry);
    }
    this.drawings.set(groupId, list);
  }

  private buildDrawingEntry(d: ChatDrawing): DrawingEntry | null {
    if (!this.mainSeries) return null;
    const toPoints = (pts?: { timestamp: number; value: number }[]): [DrawPoint, DrawPoint] | null =>
      pts && pts.length >= 2 ? [{ time: pts[0].timestamp, value: pts[0].value }, { time: pts[1].timestamp, value: pts[1].value }] : null;

    if (d.kind === "segment") {
      const points = toPoints(d.points);
      if (!points) return null;
      const primitive = createSegmentPrimitive({ points, color: d.color || "#6c5ce7" });
      this.mainSeries.attachPrimitive(primitive);
      return { type: "primitive", ref: primitive };
    }
    if (d.kind === "priceline" && d.value != null) {
      const ref = this.mainSeries.createPriceLine({ price: d.value, color: d.color || "#8b8a9e", lineStyle: 2, lineWidth: 1 });
      return { type: "priceline", ref };
    }
    if (d.kind === "fibonacci") {
      const points = toPoints(d.points);
      if (!points) return null;
      const primitive = createFibonacciPrimitive({ points, color: d.color });
      this.mainSeries.attachPrimitive(primitive);
      return { type: "primitive", ref: primitive };
    }
    if (d.kind === "trade_marker" && d.timestamp != null && d.value != null) {
      const primitive = createTradeMarkerPrimitive({ point: { time: d.timestamp, value: d.value }, side: d.side ?? "BUY", color: d.color });
      this.mainSeries.attachPrimitive(primitive);
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
    if (!list || !this.mainSeries) return;
    for (const entry of list) {
      if (entry.type === "primitive") this.mainSeries.detachPrimitive(entry.ref);
      else this.mainSeries.removePriceLine(entry.ref);
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
