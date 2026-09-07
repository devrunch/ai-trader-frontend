import { BaselineSeries } from "lightweight-charts";
import type { ApiOhlcBar } from "@/lib/api";
import type { ChartRendererFactory } from "./types";
import { UP_COLOR, DOWN_COLOR } from "./colors";

/** A single close-price line, colored by which side of a base value it's
 *  on -- green above, red below. The base is pinned to the FIRST bar's
 *  close at creation and never moves after (matches TradingView's own
 *  behavior: switching type or symbol picks a fresh base, but panning or a
 *  live tick doesn't yank it around). */
export const createBaselineRenderer: ChartRendererFactory = (chart, bars) => {
  const series = chart.addSeries(BaselineSeries, {
    baseValue: { type: "price", price: bars[0]?.close ?? 0 },
    topLineColor: UP_COLOR, topFillColor1: `${UP_COLOR}48`, topFillColor2: `${UP_COLOR}08`,
    bottomLineColor: DOWN_COLOR, bottomFillColor1: `${DOWN_COLOR}08`, bottomFillColor2: `${DOWN_COLOR}48`,
  });
  const toPoint = (b: ApiOhlcBar) => ({ time: b.time as never, value: b.close });
  series.setData(bars.map(toPoint));

  return {
    series,
    setData: (bars) => series.setData(bars.map(toPoint)),
    updateBar: (bar) => series.update(toPoint(bar)),
  };
};
