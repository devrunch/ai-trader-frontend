import { BarSeries } from "lightweight-charts";
import type { ApiOhlcBar } from "@/lib/api";
import type { ChartRendererFactory } from "./types";

/** OHLC bars -- open/close as left/right ticks off a vertical high-low line,
 *  no body fill. Same up/down palette as Candles. */
export const createBarsRenderer: ChartRendererFactory = (chart, bars) => {
  const series = chart.addSeries(BarSeries, {
    upColor: "#16c784", downColor: "#f0525d",
  });
  const toPoint = (b: ApiOhlcBar) => ({ time: b.time as never, open: b.open, high: b.high, low: b.low, close: b.close });
  series.setData(bars.map(toPoint));

  return {
    series,
    setData: (bars) => series.setData(bars.map(toPoint)),
    updateBar: (bar) => series.update(toPoint(bar)),
  };
};
