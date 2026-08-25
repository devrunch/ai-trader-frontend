import { LineSeries, LineType } from "lightweight-charts";
import type { ApiOhlcBar } from "@/lib/api";
import type { ChartRendererFactory } from "./types";

/** Same close-price line as Line, drawn as horizontal-then-vertical steps
 *  (LWC's own LineType.WithSteps) instead of a straight diagonal between
 *  points. */
export const createStepLineRenderer: ChartRendererFactory = (chart, bars) => {
  const series = chart.addSeries(LineSeries, { color: "#6c5ce7", lineWidth: 2, lineType: LineType.WithSteps });
  const toPoint = (b: ApiOhlcBar) => ({ time: b.time as never, value: b.close });
  series.setData(bars.map(toPoint));

  return {
    series,
    setData: (bars) => series.setData(bars.map(toPoint)),
    updateBar: (bar) => series.update(toPoint(bar)),
  };
};
