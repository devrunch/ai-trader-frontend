import { CandlestickSeries } from "lightweight-charts";
import type { ApiOhlcBar } from "@/lib/api";
import type { ChartRendererFactory } from "./types";
import { type Brick, strictlyIncreasingTime, appendOrReplaceBar } from "./brick-utils";
import { UP_COLOR, DOWN_COLOR } from "./colors";

/** Standard 3-line break: a new UP block forms only when price closes above
 *  the highest close of the last N blocks; a new DOWN block only when it
 *  closes below their lowest close. Anything in between produces no new
 *  block at all -- unlike Renko/Range, price staying inside that band can
 *  mean long stretches with nothing new to draw, which is the real,
 *  expected behavior (Line Break exists specifically to filter out that
 *  noise). */
const LINES = 3;

function computeLineBreak(bars: ApiOhlcBar[]): Brick[] {
  if (bars.length === 0) return [];
  const blocks: Brick[] = [];

  for (const b of bars) {
    const price = b.close;
    if (blocks.length === 0) {
      const open = b.open;
      blocks.push({ time: b.time, open, high: Math.max(open, price), low: Math.min(open, price), close: price });
      continue;
    }
    const last = blocks[blocks.length - 1];
    const recent = blocks.slice(-LINES);
    let highestClose = -Infinity, lowestClose = Infinity;
    for (const l of recent) { if (l.close > highestClose) highestClose = l.close; if (l.close < lowestClose) lowestClose = l.close; }

    if (price > highestClose) {
      blocks.push({ time: b.time, open: last.close, high: price, low: last.close, close: price });
    } else if (price < lowestClose) {
      blocks.push({ time: b.time, open: last.close, high: last.close, low: price, close: price });
    }
    // else: inside the last N blocks' range -- no new block, matches the real algorithm.
  }
  return blocks;
}

const toPoint = (b: Brick) => ({ time: b.time as never, open: b.open, high: b.high, low: b.low, close: b.close });

export const createLineBreakRenderer: ChartRendererFactory = (chart, bars) => {
  let liveBars = bars;
  const series = chart.addSeries(CandlestickSeries, {
    upColor: UP_COLOR, downColor: DOWN_COLOR, borderVisible: false,
    wickUpColor: UP_COLOR, wickDownColor: DOWN_COLOR,
  });
  series.setData(strictlyIncreasingTime(computeLineBreak(bars)).map(toPoint));

  return {
    series,
    setData: (newBars) => {
      liveBars = newBars;
      series.setData(strictlyIncreasingTime(computeLineBreak(newBars)).map(toPoint));
    },
    updateBar: (bar) => {
      liveBars = appendOrReplaceBar(liveBars, bar);
      series.setData(strictlyIncreasingTime(computeLineBreak(liveBars)).map(toPoint));
    },
  };
};
