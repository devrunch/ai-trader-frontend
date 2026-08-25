import { BaselineSeries } from "lightweight-charts";
import type { ApiOhlcBar } from "@/lib/api";
import type { ChartRendererFactory } from "./types";

/** A single close-price line, colored by which side of a base value it's
 *  on -- green above, red below. The base is pinned to the FIRST bar's
 *  close at creation and never moves after (matches TradingView's own
 *  behavior: switching type or symbol picks a fresh base, but panning or a
 *  live tick doesn't yank it around). */
export const createBaselineRenderer: ChartRendererFactory = (chart, bars) => {
  const series = chart.addSeries(BaselineSeries, {
    baseValue: { type: "price", price: bars[0]?.close ?? 0 },
    topLineColor: "#16c784", topFillColor1: "#16c78448", topFillColor2: "#16c78408",
    bottomLineColor: "#f0525d", bottomFillColor1: "#f0525d08", bottomFillColor2: "#f0525d48",
  });
  const toPoint = (b: ApiOhlcBar) => ({ time: b.time as never, value: b.close });
  series.setData(bars.map(toPoint));

  return {
    series,
    setData: (bars) => series.setData(bars.map(toPoint)),
    updateBar: (bar) => series.update(toPoint(bar)),
  };
};
