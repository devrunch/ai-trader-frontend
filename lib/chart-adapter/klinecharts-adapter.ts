import type { Chart } from "klinecharts";
import type { ApiOhlcBar } from "@/lib/api";
import type { ChatDrawing } from "@/lib/api/chat";
import type { SavedDrawing } from "@/lib/api/charts";
import type { ChartAdapter, ChartMountOptions, ManualDrawKind, PriceLevels } from "./types";

const FONT = "Poppins, ui-sans-serif, system-ui, sans-serif";
const C = { buy: "#16c784", sell: "#f0525d", grid: "#1a1e28", axisText: "#8b8a9e", entry: "#8b8a9e" };

const inr = (n: number) => n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const price = (n: unknown) => (typeof n === "number" && Number.isFinite(n) ? `₹${inr(n)}` : "—");
const signedPct = (n: number) => `${n >= 0 ? "+" : "−"}${Math.abs(n).toFixed(2)}%`;

type LegendBar = { open: number; high: number; low: number; close: number };

function candleLegend(data: { current?: unknown }) {
  const bar = data?.current as LegendBar | null | undefined;
  if (!bar) return [];
  const up = bar.close >= bar.open;
  const colour = up ? C.buy : C.sell;
  const changePct = bar.open ? ((bar.close - bar.open) / bar.open) * 100 : 0;
  return [
    { title: "O", value: { text: price(bar.open), color: C.axisText } },
    { title: "H", value: { text: price(bar.high), color: C.buy } },
    { title: "L", value: { text: price(bar.low), color: C.sell } },
    { title: "C", value: { text: price(bar.close), color: colour } },
    { title: "", value: { text: signedPct(changePct), color: colour } },
  ];
}

const MAIN_PANE_INDICATORS = new Set([
  "EMA", "MA", "SMA", "BOLL", "SAR", "BBI", "DIA_EMA20",
  "DIA_DONCHIAN_UPPER", "DIA_DONCHIAN_MID", "DIA_DONCHIAN_LOWER",
  "DIA_ENVELOPE_UPPER", "DIA_ENVELOPE_LOWER",
  "DIA_ICHIMOKU_TENKAN", "DIA_ICHIMOKU_KIJUN", "DIA_ICHIMOKU_SENKOU_A", "DIA_ICHIMOKU_SENKOU_B",
  "DIA_KELTNER_UPPER", "DIA_KELTNER_MID", "DIA_KELTNER_LOWER",
  "DIA_HMA", "DIA_DEMA", "DIA_TEMA", "DIA_SUPERTREND", "DIA_VWAP", "DIA_VWMA",
  "DIA_LINREG", "DIA_CHANDE_KROLL_LONG", "DIA_CHANDE_KROLL_SHORT",
  "DIA_AVG_PRICE", "DIA_MEDIAN_PRICE", "DIA_GAUSSIAN_FILTER",
]);

type Bar = { timestamp: number; open: number; high: number; low: number; close: number; volume?: number };

const MANUAL_OVERLAY_NAME: Record<ManualDrawKind, string> = {
  trendline: "segment", ray: "rayLine", hline: "horizontalStraightLine", fib: "fibonacciLine", rect: "rect",
};

/** Everything CandlestickChart.tsx used to do directly against klinecharts,
 * relocated behind ChartAdapter -- no new behavior, only a new boundary. */
export class KlinechartsAdapter implements ChartAdapter {
  private chart: Chart | null = null;
  private applied = new Map<string, string>();
  private barCallback: ((bar: Bar) => void) | null = null;
  private lastBar: Bar | null = null;
  private onLoadMore?: (oldestTimestampMs: number) => Promise<ApiOhlcBar[]>;
  private allBars: Bar[] = [];
  private resizeObserver: ResizeObserver | null = null;
  private mountedEl: HTMLElement | null = null;

  async mount(el: HTMLElement, options: ChartMountOptions): Promise<void> {
    const { init } = await import("klinecharts");
    const { registerDiascriptIndicators } = await import("@/lib/diascript-indicators");
    await registerDiascriptIndicators();

    this.onLoadMore = options.onLoadMore;
    this.mountedEl = el;
    const chart = init(el) as Chart;
    this.chart = chart;

    chart.setStyles({
      grid: { horizontal: { color: C.grid }, vertical: { color: C.grid } },
      candle: {
        bar: { upColor: C.buy, downColor: C.sell, upBorderColor: C.buy, downBorderColor: C.sell, upWickColor: C.buy, downWickColor: C.sell },
        priceMark: {
          high: { color: C.axisText, textFamily: FONT },
          low: { color: C.axisText, textFamily: FONT },
          last: { upColor: C.buy, downColor: C.sell, text: { family: FONT } },
        },
        tooltip: { title: { show: false }, legend: { family: FONT, template: candleLegend } },
      },
      indicator: { tooltip: { title: { family: FONT }, legend: { family: FONT } } },
      xAxis: { axisLine: { color: C.grid }, tickLine: { color: C.grid }, tickText: { color: C.axisText, family: FONT } },
      yAxis: { axisLine: { color: C.grid }, tickLine: { color: C.grid }, tickText: { color: C.axisText, family: FONT } },
      crosshair: {
        horizontal: { line: { color: C.axisText }, text: { backgroundColor: "#2a2f3d", family: FONT } },
        vertical: { line: { color: C.axisText }, text: { backgroundColor: "#2a2f3d", family: FONT } },
      },
      overlay: { text: { family: FONT }, rectText: { family: FONT } },
    });

    const klineData: Bar[] = options.bars.map(b => ({
      timestamp: b.time > 2e9 ? b.time : b.time * 1000,
      open: b.open, high: b.high, low: b.low, close: b.close, volume: b.volume,
    }));
    this.allBars = klineData;
    this.lastBar = klineData.length ? { ...klineData[klineData.length - 1] } : null;

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

    chart.setSymbol({ ticker: "SYM", pricePrecision: 2, volumePrecision: 0 });
    chart.setPeriod({ span: pSpan, type: pType });

    chart.setDataLoader({
      getBars: ({ type, callback }) => {
        if (type === "init") { callback(this.allBars, { forward: true, backward: false }); return; }
        if (type !== "forward" || !this.onLoadMore || this.allBars.length === 0) { callback([], false); return; }
        this.onLoadMore(this.allBars[0].timestamp)
          .then((older) => {
            const mapped: Bar[] = older.map(b => ({
              timestamp: b.time > 2e9 ? b.time : b.time * 1000,
              open: b.open, high: b.high, low: b.low, close: b.close, volume: b.volume,
            }));
            if (mapped.length) this.allBars = [...mapped, ...this.allBars];
            callback(mapped, mapped.length > 0);
          })
          .catch(() => callback([], false));
      },
      subscribeBar: ({ callback }) => { this.barCallback = callback; },
      unsubscribeBar: () => { this.barCallback = null; },
    });
    chart.scrollToRealTime();

    this.resizeObserver = new ResizeObserver(() => chart.resize());
    this.resizeObserver.observe(el);
  }

  dispose(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    const el = this.mountedEl;
    this.chart = null;
    this.applied.clear();
    if (el) import("klinecharts").then(({ dispose }) => dispose(el));
    this.mountedEl = null;
  }

  resize(): void { this.chart?.resize(); }

  setPriceLevels(levels: PriceLevels): void {
    const chart = this.chart;
    if (!chart) return;
    const line = (value: number | undefined, color: string) => {
      if (value == null) return;
      chart.createOverlay({
        name: "priceLine", points: [{ value }], lock: true,
        styles: { line: { color, style: "dashed", size: 1 }, text: { color: "#0b0e14", backgroundColor: color } },
      });
    };
    line(levels.entry, C.entry);
    line(levels.target, C.buy);
    line(levels.stopLoss, C.sell);
  }

  pushLiveTick(price: number): void {
    if (!this.barCallback || !this.lastBar || price <= 0) return;
    const updated = { ...this.lastBar, close: price, high: Math.max(this.lastBar.high, price), low: Math.min(this.lastBar.low, price) };
    this.lastBar = updated;
    this.barCallback(updated);
  }

  setIndicators(names: string[]): void {
    const chart = this.chart;
    if (!chart) return;
    const wanted = new Set(names);
    for (const [name, id] of [...this.applied]) {
      if (wanted.has(name)) continue;
      chart.removeIndicator({ id });
      this.applied.delete(name);
    }
    for (const name of wanted) {
      if (this.applied.has(name)) continue;
      const id = MAIN_PANE_INDICATORS.has(name)
        ? chart.createIndicator(name === "EMA" ? { name, calcParams: [20, 50], paneId: "candle_pane" } : { name, paneId: "candle_pane" }, true)
        : chart.createIndicator(name);
      if (id) this.applied.set(name, id);
    }
  }

  async attachCustomIndicator(spec: { name: string; source: string; outputName: string; pane: "main" | "sub" }): Promise<string | null> {
    const chart = this.chart;
    if (!chart) return null;
    const [{ registerDiascriptIndicator }, { noopAdapter }] = await Promise.all([
      import("diascript/klinecharts"),
      import("@/lib/diascript-indicators"),
    ]);
    registerDiascriptIndicator(spec.name, { source: spec.source, outputName: spec.outputName, adapter: noopAdapter, symbolTicker: "" });
    // klinecharts only overlays on the price pane when given an object with
    // paneId: "candle_pane" -- a bare name always gets a fresh sub-pane.
    const id = spec.pane === "main"
      ? chart.createIndicator({ name: spec.name, paneId: "candle_pane" }, true)
      : chart.createIndicator(spec.name, true);
    return id ?? null;
  }

  addDrawings(drawings: ChatDrawing[], groupId: string): void {
    const chart = this.chart;
    if (!chart) return;
    for (const d of drawings) {
      try {
        if (d.kind === "segment" && d.points) {
          chart.createOverlay({ name: "segment", points: d.points, groupId, lock: true, styles: { line: { color: d.color || "#6c5ce7", size: 2 } } });
        } else if (d.kind === "priceline" && d.value != null) {
          chart.createOverlay({ name: "priceLine", points: [{ value: d.value }], groupId, lock: true,
            styles: { line: { color: d.color || "#8b8a9e", style: "dashed" }, text: { color: "#0b0e14", backgroundColor: d.color || "#8b8a9e" } } });
        } else if (d.kind === "fibonacci" && d.points) {
          chart.createOverlay({ name: "fibonacciLine", points: d.points, groupId, lock: true });
        } else if (d.kind === "series" && d.points) {
          chart.createOverlay({ name: "brush", points: d.points, groupId, lock: true, styles: { line: { color: d.color || "#e0ab4a", size: 2 } } });
        } else if (d.kind === "trade_marker" && d.timestamp != null && d.value != null) {
          chart.createOverlay({ name: "simpleAnnotation", points: [{ timestamp: d.timestamp, value: d.value }], groupId, lock: true,
            extendData: d.side === "BUY" ? "▲" : "▼", styles: { text: { color: d.color || "#8b8a9e", size: 12 } } });
        }
      } catch { /* ignore unknown overlay */ }
    }
  }

  startManualDraw(kind: ManualDrawKind, groupId: string, onChange: () => void): void {
    this.chart?.createOverlay({ name: MANUAL_OVERLAY_NAME[kind], groupId, onDrawEnd: () => { onChange(); return false; }, onRemoved: () => { onChange(); return false; } });
  }

  removeDrawingsByGroup(groupId: string): void { this.chart?.removeOverlay({ groupId }); }

  removeDrawingsWhere(predicate: (groupId: string) => boolean): void {
    const chart = this.chart;
    if (!chart) return;
    for (const o of chart.getOverlays()) if (predicate(String(o.groupId ?? ""))) chart.removeOverlay({ id: o.id });
  }

  listSavedDrawings(groupIds: string[]): SavedDrawing[] {
    const chart = this.chart;
    if (!chart) return [];
    const out: SavedDrawing[] = [];
    for (const groupId of groupIds) {
      for (const overlay of chart.getOverlays({ groupId })) {
        out.push({ name: overlay.name, points: overlay.points as SavedDrawing["points"], styles: overlay.styles as Record<string, unknown> | undefined, extendData: overlay.extendData, groupId });
      }
    }
    return out;
  }

  restoreDrawings(drawings: SavedDrawing[]): void {
    const chart = this.chart;
    if (!chart) return;
    for (const drawing of drawings) {
      try { chart.createOverlay({ ...drawing, lock: true } as Parameters<Chart["createOverlay"]>[0]); } catch { /* unknown overlay type */ }
    }
  }
}
