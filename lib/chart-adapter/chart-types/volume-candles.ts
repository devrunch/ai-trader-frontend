import { CandlestickSeries } from "lightweight-charts";
import type { ApiOhlcBar } from "@/lib/api";
import type { ChartRendererFactory } from "./types";

/** TradingView's real Volume Candles varies each candle's WIDTH by its own
 *  volume -- not achievable on a plain CandlestickSeries (every bar sits in
 *  a fixed time-slot on a uniform time axis; a genuinely variable-width
 *  bar needs a custom series renderer owning its own pixel layout, real
 *  scope beyond a renderer-registry entry). This is the closest honest
 *  analog with the series LWC actually gives us: each candle's own OPACITY
 *  scales with its volume relative to the loaded range's max, so a heavy
 *  bar still reads as visually heavier without claiming a width this
 *  series type can't produce. */
function maxVolumeOf(bars: ApiOhlcBar[]): number {
  return bars.reduce((m, b) => Math.max(m, b.volume ?? 0), 0);
}

export const createVolumeCandlesRenderer: ChartRendererFactory = (chart, bars) => {
  const series = chart.addSeries(CandlestickSeries, { borderVisible: false });
  let maxVolume = maxVolumeOf(bars);

  // Floored at 0x28 so a genuinely-zero-volume bar (a vendor gap, not
  // silence) still renders as a real candle instead of vanishing.
  const alphaHex = (volume: number): string => {
    const ratio = maxVolume > 0 ? Math.min(1, volume / maxVolume) : 0;
    return Math.round(40 + ratio * 215).toString(16).padStart(2, "0");
  };
  const toPoint = (b: ApiOhlcBar) => {
    const base = b.close >= b.open ? "#16c784" : "#f0525d";
    const color = base + alphaHex(b.volume ?? 0);
    return { time: b.time as never, open: b.open, high: b.high, low: b.low, close: b.close, color, borderColor: color, wickColor: color };
  };
  series.setData(bars.map(toPoint));

  return {
    series,
    setData: (bars) => { maxVolume = maxVolumeOf(bars); series.setData(bars.map(toPoint)); },
    updateBar: (bar) => series.update(toPoint(bar)),
  };
};
