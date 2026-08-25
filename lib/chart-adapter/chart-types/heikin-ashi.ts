import { CandlestickSeries } from "lightweight-charts";
import type { ApiOhlcBar } from "@/lib/api";
import type { ChartRendererFactory } from "./types";

interface HaPoint { time: never; open: number; high: number; low: number; close: number }
interface HaRef { time: number; haOpen: number; haClose: number }

/** One real Heikin-Ashi bar from a real OHLC bar plus the PREVIOUS HA bar's
 *  own open/close (undefined for the very first bar, which seeds itself
 *  from its own real open/close -- the standard HA definition). */
function heikinAshiBar(b: ApiOhlcBar, prev: HaRef | null): HaPoint {
  const haClose = (b.open + b.high + b.low + b.close) / 4;
  const haOpen = prev ? (prev.haOpen + prev.haClose) / 2 : (b.open + b.close) / 2;
  return {
    time: b.time as never,
    open: haOpen, close: haClose,
    high: Math.max(b.high, haOpen, haClose),
    low: Math.min(b.low, haOpen, haClose),
  };
}

/** Heikin Ashi is a DATA TRANSFORM, not a different series type -- real HA
 *  candles rendered through the same CandlestickSeries every plain Candles
 *  chart uses. The transform is sequential (each bar's HA_open depends on
 *  the PREVIOUS bar's own HA values, recursively back to the first bar), so
 *  this closure tracks two things across calls: `cache` (the last bar
 *  rendered, forming or closed) and `committed` (the last bar that's
 *  actually CLOSED, i.e. what the currently-forming bar's own HA_open
 *  derives from). Without separating those two, a live tick updating the
 *  still-forming bar in place would recompute its own HA_open against
 *  itself on every tick and drift further from the correct value each time. */
export const createHeikinAshiRenderer: ChartRendererFactory = (chart, bars) => {
  const series = chart.addSeries(CandlestickSeries, {
    upColor: "#16c784", downColor: "#f0525d", borderVisible: false,
    wickUpColor: "#16c784", wickDownColor: "#f0525d",
  });

  let cache: HaRef | null = null;
  let committed: HaRef | null = null;

  function transformAll(bars: ApiOhlcBar[]): HaPoint[] {
    cache = null;
    committed = null;
    return bars.map((b) => {
      if (cache) committed = cache;
      const p = heikinAshiBar(b, committed);
      cache = { time: b.time, haOpen: p.open, haClose: p.close };
      return p;
    });
  }

  series.setData(transformAll(bars));

  return {
    series,
    setData: (bars) => series.setData(transformAll(bars)),
    updateBar: (bar) => {
      // A different time than what's cached means the bar that WAS forming
      // has now closed for real -- promote it to `committed` before this
      // new bar derives its own HA_open from it. The same time means this
      // is just an in-place update to the still-forming bar: reuse the
      // existing `committed` (the bar BEFORE it), not the forming bar's own
      // half-formed values.
      if (cache && cache.time !== bar.time) committed = cache;
      const p = heikinAshiBar(bar, committed);
      cache = { time: bar.time, haOpen: p.open, haClose: p.close };
      series.update(p);
    },
  };
};
