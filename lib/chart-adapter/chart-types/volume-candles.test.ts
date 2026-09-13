// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { createChart, type CandlestickData, type Time } from "lightweight-charts";
import { createVolumeCandlesRenderer } from "./volume-candles";
import type { ApiOhlcBar } from "@/lib/api";

const bar = (time: number, volume: number | null): ApiOhlcBar => ({
  time, open: 100, high: 101, low: 99, close: 100.5, volume,
});

function colorsOf(bars: ApiOhlcBar[]): string[] {
  const el = document.createElement("div");
  document.body.appendChild(el);
  const chart = createChart(el);
  const { series } = createVolumeCandlesRenderer(chart, bars);
  const colors = series.data().map((d) => (d as CandlestickData<Time> & { color: string }).color);
  chart.remove();
  return colors;
}

describe("createVolumeCandlesRenderer", () => {
  it("scales opacity with volume when there is volume to scale by", () => {
    const [light, heavy] = colorsOf([bar(1000, 100), bar(2000, 1000)]);
    expect(light).not.toBe(heavy);
    expect(heavy.endsWith("ff")).toBe(true);
  });

  it("renders a symbol with no volume at full opacity, not uniformly faint", () => {
    // Forex and metals have none at all -- their vendor publishes no volume.
    // Scaling every candle to the opacity floor washed the whole chart out at
    // 16%, which reads as a dead market rather than as an unanswerable
    // question. This chart type simply has nothing to say about such a symbol.
    const colors = colorsOf([bar(1000, null), bar(2000, null)]);
    expect(colors.every((c) => c.endsWith("ff"))).toBe(true);
  });
});
