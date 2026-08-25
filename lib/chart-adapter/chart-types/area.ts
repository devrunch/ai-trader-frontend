import { AreaSeries } from "lightweight-charts";
import type { ApiOhlcBar } from "@/lib/api";
import type { ChartRendererFactory } from "./types";

/** Same single close-price line as Line, filled down to the bottom of the
 *  pane -- --primary again, at low opacity for the fill so it reads as a
 *  shaded region rather than competing with the line itself. */
export const createAreaRenderer: ChartRendererFactory = (chart, bars) => {
  const series = chart.addSeries(AreaSeries, {
    lineColor: "#6c5ce7", topColor: "#6c5ce766", bottomColor: "#6c5ce700",
  });
  const toPoint = (b: ApiOhlcBar) => ({ time: b.time as never, value: b.close });
  series.setData(bars.map(toPoint));

  return {
    series,
    setData: (bars) => series.setData(bars.map(toPoint)),
    updateBar: (bar) => series.update(toPoint(bar)),
  };
};
