import { CandlestickSeries } from "lightweight-charts";
import type { ApiOhlcBar } from "@/lib/api";
import type { ChartRendererFactory } from "./types";
import { type Brick, strictlyIncreasingTime, defaultBoxSize } from "./brick-utils";

/** Traditional Renko: a fixed brick size, a new brick every time price
 *  closes a full brick beyond the running base -- in EITHER direction,
 *  reversal costs the same one box as continuation (the simple/traditional
 *  convention; some platforms default to a 2-box reversal instead, not
 *  implemented here). Built from each real bar's own CLOSE (one signal per
 *  bar, since that's all OHLC history gives us) -- a real tick-by-tick feed
 *  would produce more bricks intraday, same "coarser than a true tick
 *  feed" tradeoff this app's Volume Profile already accepts for its own
 *  per-bar bucketing. */
function computeRenkoBricks(bars: ApiOhlcBar[]): Brick[] {
  if (bars.length === 0) return [];
  const boxSize = defaultBoxSize(bars);
  const bricks: Brick[] = [];
  let base = bars[0].close;

  for (const b of bars) {
    const price = b.close;
    // A single bar can cross several brick boundaries at once -- keep
    // emitting bricks off this one bar's price until it's within one box
    // of the running base, same as a real Renko engine would across
    // several real ticks landing between two chart updates.
    for (let guard = 0; guard < 1000; guard++) {
      if (price >= base + boxSize) {
        const open = base, close = base + boxSize;
        bricks.push({ time: b.time, open, high: close, low: open, close });
        base = close;
      } else if (price <= base - boxSize) {
        const open = base, close = base - boxSize;
        bricks.push({ time: b.time, open, high: open, low: close, close });
        base = close;
      } else break;
    }
  }
  return bricks;
}

const toPoint = (b: Brick) => ({ time: b.time as never, open: b.open, high: b.high, low: b.low, close: b.close });

export const createRenkoRenderer: ChartRendererFactory = (chart, bars) => {
  let liveBars = bars;
  const series = chart.addSeries(CandlestickSeries, {
    upColor: "#16c784", downColor: "#f0525d", borderVisible: false,
    wickUpColor: "#16c784", wickDownColor: "#f0525d",
  });
  series.setData(strictlyIncreasingTime(computeRenkoBricks(bars)).map(toPoint));

  return {
    series,
    setData: (newBars) => {
      liveBars = newBars;
      series.setData(strictlyIncreasingTime(computeRenkoBricks(newBars)).map(toPoint));
    },
    // A live tick can add zero, one, or several new bricks -- a single
    // series.update() can't express that, so every tick recomputes the
    // whole sequence and replaces it. Bounded and cheap: real chart history
    // here tops out in the low thousands of bars, and this is O(bars), not
    // O(bars^2) -- only runs once per real price update, not per frame.
    updateBar: (bar) => {
      liveBars = liveBars.length > 0 && liveBars[liveBars.length - 1].time === bar.time
        ? [...liveBars.slice(0, -1), bar]
        : [...liveBars, bar];
      series.setData(strictlyIncreasingTime(computeRenkoBricks(liveBars)).map(toPoint));
    },
  };
};
