import { LineSeries } from "lightweight-charts";
import type { ApiOhlcBar } from "@/lib/api";
import type { ChartRendererFactory } from "./types";

/** Same close-price line as Line, with a dot marker rendered on every point
 *  (LWC's own `pointMarkersVisible`) instead of just the line. */
export const createLineMarkersRenderer: ChartRendererFactory = (chart, bars) => {
  const series = chart.addSeries(LineSeries, { color: "#6c5ce7", lineWidth: 2, pointMarkersVisible: true });
  const toPoint = (b: ApiOhlcBar) => ({ time: b.time as never, value: b.close });
  series.setData(bars.map(toPoint));

  return {
    series,
    setData: (bars) => series.setData(bars.map(toPoint)),
    updateBar: (bar) => series.update(toPoint(bar)),
  };
};
