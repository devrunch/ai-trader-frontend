import { CandlestickSeries } from "lightweight-charts";
import type { IPrimitivePaneView, Time } from "lightweight-charts";
import type { CanvasRenderingTarget2D } from "fancy-canvas";
import type { ApiOhlcBar } from "@/lib/api";
import type { ChartRendererFactory } from "./types";
import { bucketTicksByBar, createTickFetchLifecycle, type BarFootprint } from "./footprint-data";
import { appendOrReplaceBar } from "./brick-utils";
import { UP_COLOR, DOWN_COLOR } from "./colors";

const BUY_COLOR = `${UP_COLOR}99`;
const SELL_COLOR = `${DOWN_COLOR}99`;

/** Volume Footprint: real candles, with each bar's own buy/sell tick
 *  counts per price level drawn as a small two-sided bar (sell to the
 *  left of center, buy to the right) -- the real per-bar ladder look,
 *  built from real Dukascopy ticks (FOREX/metals only). Re-fetches
 *  whenever the visible time range settles (debounced, via
 *  createTickFetchLifecycle -- shared with TPO's own primitive), clamped
 *  to the backend's own max window -- this is a LIVE view of whatever's
 *  on screen, not the whole loaded history at once (a multi-day footprint
 *  would mean fetching millions of ticks for no visual gain at that zoom). */
function createFootprintPrimitive(
  fetchTicks: ((sinceSec: number, untilSec: number) => Promise<{ t: number; p: number }[] | null>) | undefined,
  getBars: () => ApiOhlcBar[],
) {
  let footprints = new Map<number, BarFootprint>();
  const lifecycle = createTickFetchLifecycle(fetchTicks, (ticks) => {
    footprints = bucketTicksByBar(getBars(), ticks);
  });

  return {
    attached: lifecycle.attached,
    detached: lifecycle.detached,
    paneViews(): readonly IPrimitivePaneView[] {
      return [{
        renderer() {
          return {
            draw(target: CanvasRenderingTarget2D) {
              target.useBitmapCoordinateSpace((scope) => {
                const attached = lifecycle.getAttached();
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
    upColor: `${UP_COLOR}55`, downColor: `${DOWN_COLOR}55`, borderVisible: false,
    wickUpColor: `${UP_COLOR}55`, wickDownColor: `${DOWN_COLOR}55`,
  });
  const toPoint = (b: ApiOhlcBar) => ({ time: b.time as never, open: b.open, high: b.high, low: b.low, close: b.close });
  series.setData(bars.map(toPoint));
  series.attachPrimitive(createFootprintPrimitive(ctx?.fetchTicks, () => liveBars));

  return {
    series,
    setData: (newBars) => { liveBars = newBars; series.setData(newBars.map(toPoint)); },
    updateBar: (bar) => {
      liveBars = appendOrReplaceBar(liveBars, bar);
      series.update(toPoint(bar));
    },
  };
};
