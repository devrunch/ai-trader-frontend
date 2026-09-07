import { CandlestickSeries } from "lightweight-charts";
import type { ApiOhlcBar } from "@/lib/api";
import type { ChartRendererFactory } from "./types";
import { UP_COLOR, DOWN_COLOR } from "./colors";

/** TradingView's own Hollow Candles convention: up candles are outline-only
 *  (their fill pinned to the chart's own background so the body reads as
 *  empty), down candles stay solid -- plain CandlestickSeries options, no
 *  custom primitive needed. `upColor` must match the chart's real
 *  background (see lightweight-charts-adapter.ts's own layout.background.color)
 *  or the "hollow" look breaks. */
export const createHollowCandlesRenderer: ChartRendererFactory = (chart, bars) => {
  const series = chart.addSeries(CandlestickSeries, {
    upColor: "#0b0e14", downColor: DOWN_COLOR, borderVisible: true,
    borderUpColor: UP_COLOR, borderDownColor: DOWN_COLOR,
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
