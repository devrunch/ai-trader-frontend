import { CandlestickSeries } from "lightweight-charts";
import type { ApiOhlcBar } from "@/lib/api";
import type { ChartRendererFactory } from "./types";
import { UP_COLOR, DOWN_COLOR } from "./colors";

/** The default, and the only type with real historical behavior to match
 *  (the colors below are the exact values the chart already used before
 *  chart-type selection existed). */
export const createCandlesRenderer: ChartRendererFactory = (chart, bars) => {
  const series = chart.addSeries(CandlestickSeries, {
    upColor: UP_COLOR, downColor: DOWN_COLOR, borderVisible: false,
    wickUpColor: UP_COLOR, wickDownColor: DOWN_COLOR,
  });
  const toPoint = (b: ApiOhlcBar) => ({ time: b.time as never, open: b.open, high: b.high, low: b.low, close: b.close });
  series.setData(bars.map(toPoint));

  return {
    series,
    setData: (bars) => series.setData(bars.map(toPoint)),
    updateBar: (bar) => series.update(toPoint(bar)),
  };
};
