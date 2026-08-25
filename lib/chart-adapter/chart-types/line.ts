import { LineSeries } from "lightweight-charts";
import type { ApiOhlcBar } from "@/lib/api";
import type { ChartRendererFactory } from "./types";

/** A single line through each bar's close -- no open/high/low to show, so
 *  that's the only field this reads. */
export const createLineRenderer: ChartRendererFactory = (chart, bars) => {
  const series = chart.addSeries(LineSeries, { color: "#6c5ce7", lineWidth: 2 }); // --primary, matches the app's accent
  const toPoint = (b: ApiOhlcBar) => ({ time: b.time as never, value: b.close });
  series.setData(bars.map(toPoint));

  return {
    series,
    setData: (bars) => series.setData(bars.map(toPoint)),
    updateBar: (bar) => series.update(toPoint(bar)),
  };
};
