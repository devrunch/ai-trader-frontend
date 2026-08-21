// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { createChart } from "lightweight-charts";
import { attachPinePlotsToPane } from "./pine-render";
import type { PinePlotPoint } from "@/lib/api/pine";

// PineTS's own per-point time, in ms -- ms/1000 must land on the same
// second as the fixture's other tests use in seconds (1767000900 etc).
const pts = (...values: (number | null)[]): PinePlotPoint[] =>
  values.map((value, i) => ({ time: (1767000900 + i * 60) * 1000, value }));

describe("attachPinePlotsToPane", () => {
  it("draws one line series per plain plot, in order, with matching data length", () => {
    const el = document.createElement("div"); document.body.appendChild(el);
    const chart = createChart(el, { width: 400, height: 300, layout: { attributionLogo: false } });
    const plots = { "SMA5": pts(100.1, 100.4, 100.9) };

    const series = attachPinePlotsToPane(chart, 0, plots);

    expect(series).toHaveLength(1);
    expect(series[0].data()).toHaveLength(3);
    chart.remove();
  });

  it("draws a filled band for '<name> Upper'/'<name> Lower' paired plots", () => {
    const el = document.createElement("div"); document.body.appendChild(el);
    const chart = createChart(el, { width: 400, height: 300, layout: { attributionLogo: false } });
    const plots = { "Band Upper": pts(105, 106), "Band Lower": pts(95, 96) };

    const series = attachPinePlotsToPane(chart, 0, plots);

    expect(series).toHaveLength(2);
    chart.remove();
  });

  it("skips a one-sided Upper/Lower pair rather than guessing", () => {
    const el = document.createElement("div"); document.body.appendChild(el);
    const chart = createChart(el, { width: 400, height: 300, layout: { attributionLogo: false } });
    const plots = { "Band Upper": pts(105) }; // no matching Lower

    const series = attachPinePlotsToPane(chart, 0, plots);

    expect(series).toHaveLength(0);
    chart.remove();
  });

  it("drops warmup-period null values instead of passing them to the series (real gap, not a garbage point)", () => {
    const el = document.createElement("div"); document.body.appendChild(el);
    const chart = createChart(el, { width: 400, height: 300, layout: { attributionLogo: false } });
    // ta.sma's first few bars are genuinely null (na) until enough history exists.
    const plots = { "SMA5": pts(null, null, 100.4, 100.9) };

    const series = attachPinePlotsToPane(chart, 0, plots);

    expect(series).toHaveLength(1);
    expect(series[0].data()).toHaveLength(2); // only the two real points
    chart.remove();
  });
});
