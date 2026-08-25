import { HistogramSeries } from "lightweight-charts";
import type { ApiOhlcBar } from "@/lib/api";
import type { ChartRendererFactory } from "./types";

/** Close price as a column, up/down colored -- LWC's Histogram series draws
 *  every column from one shared `base` up to its own value, so an
 *  untouched `base: 0` would dwarf the real price variation for anything
 *  not already near zero (confirmed by hand: a ~4600 XAUUSD chart rendered
 *  as one solid block). Pinned to the lowest close in the CURRENT bars at
 *  creation instead -- same "pin once, don't re-derive on every setData"
 *  reasoning as Baseline's own base value, for the same jumpiness reason. */
export const createColumnsRenderer: ChartRendererFactory = (chart, bars) => {
  const base = bars.length ? Math.min(...bars.map((b) => b.close)) : 0;
  const series = chart.addSeries(HistogramSeries, { color: "#6c5ce788", base });
  const toPoint = (b: ApiOhlcBar) => ({
    time: b.time as never, value: b.close,
    color: b.close >= b.open ? "#16c78488" : "#f0525d88",
  });
  series.setData(bars.map(toPoint));

  return {
    series,
    setData: (bars) => series.setData(bars.map(toPoint)),
    updateBar: (bar) => series.update(toPoint(bar)),
  };
};
