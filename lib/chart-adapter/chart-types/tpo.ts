import { CandlestickSeries } from "lightweight-charts";
import type { IPrimitivePaneView } from "lightweight-charts";
import type { CanvasRenderingTarget2D } from "fancy-canvas";
import type { ApiTick } from "@/lib/api";
import type { ChartRendererFactory } from "./types";
import { createTickFetchLifecycle } from "./footprint-data";
import { UP_COLOR, DOWN_COLOR } from "./colors";

/** Standard 30-minute TPO period -- the conventional Market Profile letter
 *  period (TradingView's own default). Not user-configurable here (no
 *  settings UI wired for this chart-type family yet, same gap the
 *  Renko/Kagi/etc. box-size default already has). */
const TPO_PERIOD_SECONDS = 30 * 60;
const BUCKETS = 24;
const MAX_BAR_WIDTH_FRACTION = 0.22;

interface TpoHistogram { lo: number; hi: number; bucketSize: number; counts: number[] }

/** How many DISTINCT time periods touched each price level -- the real
 *  statistical definition of a Market/TPO profile (conventionally drawn as
 *  a letter per period; this draws the same count as a bar's width
 *  instead, the same simplification Session Volume Profile's "count
 *  instead of literal glyphs" choice already makes elsewhere in this
 *  file). Built from real ticks (FOREX/metals only, via Dukascopy) -- never
 *  approximated from bar OHLC, unlike this app's own (bar-close-bucketed)
 *  Volume Profile, because a real letter-count needs real intraperiod
 *  price touches, which OHLC alone can't give. */
function buildTpoHistogram(ticks: ApiTick[]): TpoHistogram | null {
  if (ticks.length === 0) return null;
  let lo = Infinity, hi = -Infinity;
  for (const t of ticks) { if (t.p < lo) lo = t.p; if (t.p > hi) hi = t.p; }
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || hi <= lo) return null;
  const bucketSize = (hi - lo) / BUCKETS;

  const touchedByPeriod = new Map<number, Set<number>>();
  for (const t of ticks) {
    const periodIdx = Math.floor(t.t / 1000 / TPO_PERIOD_SECONDS);
    const bucketIdx = Math.min(BUCKETS - 1, Math.max(0, Math.floor((t.p - lo) / bucketSize)));
    let set = touchedByPeriod.get(periodIdx);
    if (!set) { set = new Set(); touchedByPeriod.set(periodIdx, set); }
    set.add(bucketIdx);
  }

  const counts = new Array(BUCKETS).fill(0);
  for (const set of touchedByPeriod.values()) for (const b of set) counts[b] += 1;
  return { lo, hi, bucketSize, counts };
}

function createTpoPrimitive(
  fetchTicks: ((sinceSec: number, untilSec: number) => Promise<{ t: number; p: number }[] | null>) | undefined,
) {
  let hist: TpoHistogram | null = null;
  const lifecycle = createTickFetchLifecycle(fetchTicks, (ticks) => {
    hist = buildTpoHistogram(ticks);
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
                if (!attached || !hist) return;
                const { series, chart } = attached;
                const ctx = scope.context;
                ctx.save();
                ctx.scale(scope.horizontalPixelRatio, scope.verticalPixelRatio);

                const maxCount = Math.max(...hist.counts, 1);
                const paneWidth = chart.paneSize().width;
                const maxBarWidth = paneWidth * MAX_BAR_WIDTH_FRACTION;
                for (let i = 0; i < hist.counts.length; i++) {
                  const count = hist.counts[i];
                  if (count <= 0) continue;
                  const yTop = series.priceToCoordinate(hist.lo + (i + 1) * hist.bucketSize);
                  const yBottom = series.priceToCoordinate(hist.lo + i * hist.bucketSize);
                  if (yTop == null || yBottom == null) continue;
                  const width = (count / maxCount) * maxBarWidth;
                  ctx.fillStyle = "#f0b90b77";
                  ctx.fillRect(paneWidth - width, Math.min(yTop, yBottom), width, Math.max(1, Math.abs(yBottom - yTop) - 1));
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

/** TPO / Market Profile: real candles, with a right-anchored horizontal
 *  histogram of how many distinct 30-minute periods touched each price
 *  level -- see buildTpoHistogram's own docs for why this needs real ticks
 *  (FOREX/metals only) rather than the bar-level approximation this app's
 *  ordinary Volume Profile already accepts. */
export const createTpoRenderer: ChartRendererFactory = (chart, bars, ctx) => {
  const series = chart.addSeries(CandlestickSeries, {
    upColor: UP_COLOR, downColor: DOWN_COLOR, borderVisible: false,
    wickUpColor: UP_COLOR, wickDownColor: DOWN_COLOR,
  });
  const toPoint = (b: typeof bars[number]) => ({ time: b.time as never, open: b.open, high: b.high, low: b.low, close: b.close });
  series.setData(bars.map(toPoint));
  series.attachPrimitive(createTpoPrimitive(ctx?.fetchTicks));

  return {
    series,
    setData: (newBars) => series.setData(newBars.map(toPoint)),
    updateBar: (bar) => series.update(toPoint(bar)),
  };
};
