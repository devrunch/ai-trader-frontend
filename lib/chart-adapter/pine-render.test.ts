// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { createChart } from "lightweight-charts";
import { attachPinePlotsToPane } from "./pine-render";
import type { PinePlotPoint } from "@/lib/api/pine";

// PineTS's own per-point time, in ms -- ms/1000 must land on the same
// second as the fixture's other tests use in seconds (1767000900 etc).
const pts = (...values: (number | null)[]): PinePlotPoint[] =>
  values.map((value, i) => ({ time: (1767000900 + i * 60) * 1000, value }));

const boolPts = (...values: boolean[]): PinePlotPoint[] =>
  values.map((value, i) => ({ time: (1767000900 + i * 60) * 1000, value }));

describe("attachPinePlotsToPane", () => {
  it("draws one line series per plain plot, in order, with matching data length", () => {
    const el = document.createElement("div"); document.body.appendChild(el);
    const chart = createChart(el, { width: 400, height: 300, layout: { attributionLogo: false } });
    const plots = { "SMA5": pts(100.1, 100.4, 100.9) };

    const { series } = attachPinePlotsToPane(chart, 0, plots);

    expect(series).toHaveLength(1);
    expect(series[0].data()).toHaveLength(3);
    chart.remove();
  });

  it("draws a filled band for '<name> Upper'/'<name> Lower' paired plots", () => {
    const el = document.createElement("div"); document.body.appendChild(el);
    const chart = createChart(el, { width: 400, height: 300, layout: { attributionLogo: false } });
    const plots = { "Band Upper": pts(105, 106), "Band Lower": pts(95, 96) };

    const { series } = attachPinePlotsToPane(chart, 0, plots);

    expect(series).toHaveLength(2);
    chart.remove();
  });

  it("skips a one-sided Upper/Lower pair rather than guessing", () => {
    const el = document.createElement("div"); document.body.appendChild(el);
    const chart = createChart(el, { width: 400, height: 300, layout: { attributionLogo: false } });
    const plots = { "Band Upper": pts(105) }; // no matching Lower

    const { series } = attachPinePlotsToPane(chart, 0, plots);

    expect(series).toHaveLength(0);
    chart.remove();
  });

  it("drops warmup-period null values instead of passing them to the series (real gap, not a garbage point)", () => {
    const el = document.createElement("div"); document.body.appendChild(el);
    const chart = createChart(el, { width: 400, height: 300, layout: { attributionLogo: false } });
    // ta.sma's first few bars are genuinely null (na) until enough history exists.
    const plots = { "SMA5": pts(null, null, 100.4, 100.9) };

    const { series } = attachPinePlotsToPane(chart, 0, plots);

    expect(series).toHaveLength(1);
    expect(series[0].data()).toHaveLength(2); // only the two real points
    chart.remove();
  });

  it("gives an indicator's own plain plots genuinely different colors, not shades of one hue", () => {
    const el = document.createElement("div"); document.body.appendChild(el);
    const chart = createChart(el, { width: 400, height: 300, layout: { attributionLogo: false } });
    // MACD's own shape: two real lines plus a histogram.
    const plots = { MACD: pts(1.2, 1.4), Signal: pts(0.9, 1.0) };

    const { series } = attachPinePlotsToPane(chart, 0, plots, undefined, 0);

    const macdColor = (series[0].options() as { color?: string }).color;
    const signalColor = (series[1].options() as { color?: string }).color;
    expect(macdColor).toBeTruthy();
    expect(signalColor).toBeTruthy();
    expect(macdColor).not.toBe(signalColor);
    chart.remove();
  });

  it("renders a plot named 'Histogram' as colored bars, not a line", () => {
    const el = document.createElement("div"); document.body.appendChild(el);
    const chart = createChart(el, { width: 400, height: 300, layout: { attributionLogo: false } });
    const plots = { Histogram: pts(0.5, 0.8, -0.3, -0.6) };

    const { series } = attachPinePlotsToPane(chart, 0, plots, undefined, 0);

    expect(series).toHaveLength(1);
    const data = series[0].data() as unknown as { color?: string }[];
    expect(data).toHaveLength(4);
    // Positive bars are green-ish, negative bars are red-ish -- exact
    // shade (bright/dim) depends on direction, checked loosely here.
    expect(data[0].color).toMatch(/^#16c784/);
    expect(data[2].color).toMatch(/^#f0525d/);
  });

  it("keeps both sides of an Upper/Lower band the same color", () => {
    const el = document.createElement("div"); document.body.appendChild(el);
    const chart = createChart(el, { width: 400, height: 300, layout: { attributionLogo: false } });
    const plots = { "Band Upper": pts(105, 106), "Band Lower": pts(95, 96) };

    const { series } = attachPinePlotsToPane(chart, 0, plots, undefined, 0);

    const upperColor = (series[0].options() as { color?: string }).color;
    const lowerColor = (series[1].options() as { color?: string }).color;
    expect(upperColor).toBe(lowerColor);
    chart.remove();
  });

  it("draws overbought/oversold guide lines for a known oscillator (RSI 30/70)", () => {
    const el = document.createElement("div"); document.body.appendChild(el);
    const chart = createChart(el, { width: 400, height: 300, layout: { attributionLogo: false } });
    const plots = { RSI: pts(45, 50, 55) };

    const { series } = attachPinePlotsToPane(chart, 0, plots);

    const levels = series[0].priceLines().map((l) => l.options().price);
    expect(levels.sort()).toEqual([30, 70]);
    chart.remove();
  });

  it("plots Parabolic SAR as dots, not a connected line", () => {
    const el = document.createElement("div"); document.body.appendChild(el);
    const chart = createChart(el, { width: 400, height: 300, layout: { attributionLogo: false } });
    const plots = { SAR: pts(101, 99, 102) };

    const { series } = attachPinePlotsToPane(chart, 0, plots);

    const opts = series[0].options() as { lineVisible?: boolean; pointMarkersVisible?: boolean };
    expect(opts.lineVisible).toBe(false);
    expect(opts.pointMarkersVisible).toBe(true);
    chart.remove();
  });

  it("colors Supertrend's up/down segments green/red regardless of the palette index", () => {
    const el = document.createElement("div"); document.body.appendChild(el);
    const chart = createChart(el, { width: 400, height: 300, layout: { attributionLogo: false } });
    const plots = { "Supertrend Up": pts(99, 98), "Supertrend Down": pts(null, null) };

    // colorIndex 3 would normally pick a very different hue -- Supertrend
    // ignores it, it's a fixed trend-direction convention, not a palette pick.
    const { series } = attachPinePlotsToPane(chart, 0, plots, undefined, 3);

    const upTrend = series.find((s) => s.options().title === "Supertrend Up");
    const downTrend = series.find((s) => s.options().title === "Supertrend Down");
    expect((upTrend?.options() as { color?: string }).color).toBe("#16c784");
    expect((downTrend?.options() as { color?: string }).color).toBe("#f0525d");
    chart.remove();
  });

  it("attaches a fill primitive between an Upper/Lower band without throwing", () => {
    const el = document.createElement("div"); document.body.appendChild(el);
    const chart = createChart(el, { width: 400, height: 300, layout: { attributionLogo: false } });
    const plots = { "BB Upper": pts(105, 106), "BB Lower": pts(95, 96), "BB Basis": pts(100, 101) };

    expect(() => attachPinePlotsToPane(chart, 0, plots, undefined, 0)).not.toThrow();
    chart.remove();
  });

  it("treats a boolean-valued plot (plotshape()/plotchar()) as markers, not a line series", () => {
    const el = document.createElement("div"); document.body.appendChild(el);
    const chart = createChart(el, { width: 400, height: 300, layout: { attributionLogo: false } });
    const plots = { Buy: boolPts(false, true, false, true) };

    const { series, markerPlots } = attachPinePlotsToPane(chart, 0, plots);

    expect(series).toHaveLength(0); // no LineSeries created for a boolean plot
    expect(markerPlots).toHaveLength(1);
    expect(markerPlots[0].markers).toHaveLength(2); // only the two true bars
    chart.remove();
  });

  it("infers buy/sell direction, shape, and color from the plot's own title", () => {
    const el = document.createElement("div"); document.body.appendChild(el);
    const chart = createChart(el, { width: 400, height: 300, layout: { attributionLogo: false } });
    const plots = { Buy: boolPts(true), Sell: boolPts(true) };

    const { markerPlots } = attachPinePlotsToPane(chart, 0, plots);

    const buy = markerPlots.find((m) => m.name === "Buy")!.markers[0];
    const sell = markerPlots.find((m) => m.name === "Sell")!.markers[0];
    expect(buy.shape).toBe("arrowUp");
    expect(buy.position).toBe("belowBar");
    expect(sell.shape).toBe("arrowDown");
    expect(sell.position).toBe("aboveBar");
    expect(buy.color).not.toBe(sell.color);
    chart.remove();
  });

  it("falls back to a neutral circle marker when the title gives no buy/sell hint", () => {
    const el = document.createElement("div"); document.body.appendChild(el);
    const chart = createChart(el, { width: 400, height: 300, layout: { attributionLogo: false } });
    const plots = { Signal: boolPts(true) };

    const { markerPlots } = attachPinePlotsToPane(chart, 0, plots);

    expect(markerPlots[0].markers[0].shape).toBe("circle");
    chart.remove();
  });

  it("keeps a numeric plot alongside a boolean plot in the same indicator (the G-Channel shape)", () => {
    const el = document.createElement("div"); document.body.appendChild(el);
    const chart = createChart(el, { width: 400, height: 300, layout: { attributionLogo: false } });
    const plots = { Average: pts(100, 101, 102), Buy: boolPts(false, true, false) };

    const { series, markerPlots } = attachPinePlotsToPane(chart, 0, plots, undefined, 0);

    expect(series).toHaveLength(1); // the numeric "Average" line
    expect(series[0].options().title).toBe("Average");
    expect(markerPlots).toHaveLength(1);
    chart.remove();
  });
});
