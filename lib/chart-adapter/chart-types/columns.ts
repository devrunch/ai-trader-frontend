import { HistogramSeries } from "lightweight-charts";
import type { ApiOhlcBar } from "@/lib/api";
import type { ChartRendererFactory } from "./types";
import { UP_COLOR, DOWN_COLOR } from "./colors";

/** Close price as a column, up/down colored -- LWC's Histogram series draws
 *  every column from one shared `base` up to its own value, so an
 *  untouched `base: 0` would dwarf the real price variation for anything
 *  not already near zero (confirmed by hand: a ~4600 XAUUSD chart rendered
 *  as one solid block). Pinned to the lowest close in the CURRENT bars at
 *  creation instead -- same "pin once, don't re-derive on every setData"
 *  reasoning as Baseline's own base value, for the same jumpiness reason. */
function minClose(bars: ApiOhlcBar[]): number {
  // A manual loop, not `Math.min(...bars.map(...))` -- spreading a call
  // argument list blows V8's stack past ~65k-125k elements, and this app's
  // own pan-back loading has no upper bound on how many bars end up loaded
  // in one session.
  let min = Infinity;
  for (const b of bars) if (b.close < min) min = b.close;
  return Number.isFinite(min) ? min : 0;
}

export const createColumnsRenderer: ChartRendererFactory = (chart, bars) => {
  const base = minClose(bars);
  const series = chart.addSeries(HistogramSeries, { color: "#6c5ce788", base });
  const toPoint = (b: ApiOhlcBar) => ({
    time: b.time as never, value: b.close,
    color: b.close >= b.open ? `${UP_COLOR}88` : `${DOWN_COLOR}88`,
  });
  series.setData(bars.map(toPoint));

  return {
    series,
    setData: (bars) => series.setData(bars.map(toPoint)),
    updateBar: (bar) => series.update(toPoint(bar)),
  };
};
