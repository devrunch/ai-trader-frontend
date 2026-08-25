import { CandlestickSeries } from "lightweight-charts";
import type { ISeriesPrimitive, IPrimitivePaneView, Time, SeriesAttachedParameter } from "lightweight-charts";
import type { CanvasRenderingTarget2D } from "fancy-canvas";
import type { ApiOhlcBar } from "@/lib/api";
import type { ChartRendererFactory } from "./types";
import { bucketTicksByBar, clampFetchWindow, FETCH_DEBOUNCE_MS, type BarFootprint } from "./footprint-data";

const BUY_COLOR = "#16c78499";
const SELL_COLOR = "#f0525d99";

/** Volume Footprint: real candles, with each bar's own buy/sell tick
 *  counts per price level drawn as a small two-sided bar (sell to the
 *  left of center, buy to the right) -- the real per-bar ladder look,
 *  built from real Dukascopy ticks (FOREX/metals only). Re-fetches
 *  whenever the visible time range settles (debounced), clamped to the
 *  backend's own max window -- this is a LIVE view of whatever's on
 *  screen, not the whole loaded history at once (a multi-day footprint
 *  would mean fetching millions of ticks for no visual gain at that zoom). */
function createFootprintPrimitive(
  fetchTicks: ((sinceSec: number, untilSec: number) => Promise<{ t: number; p: number }[] | null>) | undefined,
  getBars: () => ApiOhlcBar[],
): ISeriesPrimitive<Time> {
  let attached: SeriesAttachedParameter<Time> | null = null;
  let footprints = new Map<number, BarFootprint>();
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let unsubscribe: (() => void) | null = null;

  function refetch() {
    if (!fetchTicks || !attached) return;
    const visible = attached.chart.timeScale().getVisibleRange();
    if (!visible) return;
    const { since, until } = clampFetchWindow(visible.from as unknown as number, visible.to as unknown as number);
    fetchTicks(since, until).then((ticks) => {
      if (!attached || !ticks) return;
      footprints = bucketTicksByBar(getBars(), ticks);
      attached.requestUpdate();
    });
  }

  function scheduleRefetch() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(refetch, FETCH_DEBOUNCE_MS);
  }

  return {
    attached(param) {
      attached = param;
      const handler = () => scheduleRefetch();
      param.chart.timeScale().subscribeVisibleTimeRangeChange(handler);
      unsubscribe = () => param.chart.timeScale().unsubscribeVisibleTimeRangeChange(handler);
      refetch();
    },
    detached() {
      unsubscribe?.();
      unsubscribe = null;
      if (debounceTimer) clearTimeout(debounceTimer);
      attached = null;
    },
    paneViews(): readonly IPrimitivePaneView[] {
      return [{
        renderer() {
          return {
            draw(target: CanvasRenderingTarget2D) {
              target.useBitmapCoordinateSpace((scope) => {
                if (!attached || footprints.size === 0) return;
                const { series, chart } = attached;
                const ctx = scope.context;
                ctx.save();
                ctx.scale(scope.horizontalPixelRatio, scope.verticalPixelRatio);

                let maxCount = 1;
                for (const fp of footprints.values()) for (const c of fp.levels.values()) maxCount = Math.max(maxCount, c.buy, c.sell);

                const bars = getBars();
                const barWidthPx = bars.length >= 2
                  ? Math.abs((chart.timeScale().timeToCoordinate(bars[1].time as Time) ?? 0) - (chart.timeScale().timeToCoordinate(bars[0].time as Time) ?? 0))
                  : 10;
                const maxHalfWidth = Math.max(2, barWidthPx * 0.4);

                for (const [barTime, fp] of footprints) {
                  const x = chart.timeScale().timeToCoordinate(barTime as Time);
                  if (x == null) continue;
                  for (const [levelIdx, counts] of fp.levels) {
                    const priceLo = fp.low + levelIdx * fp.bucketSize;
                    const priceHi = priceLo + fp.bucketSize;
                    const yLo = series.priceToCoordinate(priceLo);
                    const yHi = series.priceToCoordinate(priceHi);
                    if (yLo == null || yHi == null) continue;
                    const top = Math.min(yLo, yHi), height = Math.max(1, Math.abs(yLo - yHi) - 1);

                    const buyW = (counts.buy / maxCount) * maxHalfWidth;
                    const sellW = (counts.sell / maxCount) * maxHalfWidth;
                    ctx.fillStyle = BUY_COLOR;
                    ctx.fillRect(x, top, buyW, height);
                    ctx.fillStyle = SELL_COLOR;
                    ctx.fillRect(x - sellW, top, sellW, height);
                  }
                }
                ctx.restore();
              });
            },
          };
        },
      }];
    },
  };
}

export const createVolumeFootprintRenderer: ChartRendererFactory = (chart, bars, ctx) => {
  let liveBars = bars;
  const series = chart.addSeries(CandlestickSeries, {
    upColor: "#16c78455", downColor: "#f0525d55", borderVisible: false,
    wickUpColor: "#16c78455", wickDownColor: "#f0525d55",
  });
  const toPoint = (b: ApiOhlcBar) => ({ time: b.time as never, open: b.open, high: b.high, low: b.low, close: b.close });
  series.setData(bars.map(toPoint));
  series.attachPrimitive(createFootprintPrimitive(ctx?.fetchTicks, () => liveBars));

  return {
    series,
    setData: (newBars) => { liveBars = newBars; series.setData(newBars.map(toPoint)); },
    updateBar: (bar) => {
      liveBars = liveBars.length > 0 && liveBars[liveBars.length - 1].time === bar.time
        ? [...liveBars.slice(0, -1), bar]
        : [...liveBars, bar];
      series.update(toPoint(bar));
    },
  };
};
