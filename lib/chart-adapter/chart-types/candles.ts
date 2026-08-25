import { CandlestickSeries } from "lightweight-charts";
import type { ApiOhlcBar } from "@/lib/api";
import type { ChartRendererFactory } from "./types";

/** The default, and the only type with real historical behavior to match
 *  (the colors below are the exact values the chart already used before
 *  chart-type selection existed). */
export const createCandlesRenderer: ChartRendererFactory = (chart, bars) => {
  const series = chart.addSeries(CandlestickSeries, {
    upColor: "#16c784", downColor: "#f0525d", borderVisible: false,
    wickUpColor: "#16c784", wickDownColor: "#f0525d",
  });
  const toPoint = (b: ApiOhlcBar) => ({ time: b.time as never, open: b.open, high: b.high, low: b.low, close: b.close });
  series.setData(bars.map(toPoint));

  return {
    series,
    setData: (bars) => series.setData(bars.map(toPoint)),
    updateBar: (bar) => series.update(toPoint(bar)),
  };
};
