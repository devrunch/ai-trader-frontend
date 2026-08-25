import { CandlestickSeries } from "lightweight-charts";
import type { ApiOhlcBar } from "@/lib/api";
import type { ChartRendererFactory } from "./types";
import { type Brick, strictlyIncreasingTime, defaultBoxSize } from "./brick-utils";

/** Range bars: a real O/H/L/C bar, same as a normal candle, except a new
 *  one starts once the CURRENT bar's own high-low range reaches a fixed
 *  size -- price-driven bar boundaries instead of time-driven ones. Unlike
 *  Renko (fixed brick increments, not real O/H/L/C), a range bar keeps its
 *  own real open/high/low/close, just accumulated over however many real
 *  bars' worth of price movement it took to fill the range. */
function computeRangeBars(bars: ApiOhlcBar[]): Brick[] {
  if (bars.length === 0) return [];
  const rangeSize = defaultBoxSize(bars);
  const out: Brick[] = [];
  let cur: Brick | null = null;

  for (const b of bars) {
    const price = b.close;
    if (!cur) { cur = { time: b.time, open: price, high: price, low: price, close: price }; continue; }
    cur.high = Math.max(cur.high, price);
    cur.low = Math.min(cur.low, price);
    cur.close = price;
    cur.time = b.time;
    if (cur.high - cur.low >= rangeSize) { out.push(cur); cur = null; }
  }
  if (cur) out.push(cur); // still-forming range bar -- shown same as any forming candle
  return out;
}

const toPoint = (b: Brick) => ({ time: b.time as never, open: b.open, high: b.high, low: b.low, close: b.close });

export const createRangeRenderer: ChartRendererFactory = (chart, bars) => {
  let liveBars = bars;
  const series = chart.addSeries(CandlestickSeries, {
    upColor: "#16c784", downColor: "#f0525d", borderVisible: false,
    wickUpColor: "#16c784", wickDownColor: "#f0525d",
  });
  series.setData(strictlyIncreasingTime(computeRangeBars(bars)).map(toPoint));

  return {
    series,
    setData: (newBars) => {
      liveBars = newBars;
      series.setData(strictlyIncreasingTime(computeRangeBars(newBars)).map(toPoint));
    },
    updateBar: (bar) => {
      liveBars = liveBars.length > 0 && liveBars[liveBars.length - 1].time === bar.time
        ? [...liveBars.slice(0, -1), bar]
        : [...liveBars, bar];
      series.setData(strictlyIncreasingTime(computeRangeBars(liveBars)).map(toPoint));
    },
  };
};
