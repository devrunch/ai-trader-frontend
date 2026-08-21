// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { createChart } from "lightweight-charts";
import { attachPinePlotsToPane } from "./pine-render";

describe("attachPinePlotsToPane", () => {
  it("draws one line series per plain plot, in order, with matching data length", () => {
    const el = document.createElement("div"); document.body.appendChild(el);
    const chart = createChart(el, { width: 400, height: 300, layout: { attributionLogo: false } });
    const times = [1767000900, 1767000960, 1767001020];
    const plots = { "SMA5": [100.1, 100.4, 100.9] };

    const series = attachPinePlotsToPane(chart, 0, plots, times);

    expect(series).toHaveLength(1);
    expect(series[0].data()).toHaveLength(3);
    chart.remove();
  });

  it("draws a filled band for '<name> Upper'/'<name> Lower' paired plots", () => {
    const el = document.createElement("div"); document.body.appendChild(el);
    const chart = createChart(el, { width: 400, height: 300, layout: { attributionLogo: false } });
    const times = [1767000900, 1767000960];
    const plots = { "Band Upper": [105, 106], "Band Lower": [95, 96] };

    const series = attachPinePlotsToPane(chart, 0, plots, times);

    expect(series).toHaveLength(2);
  });

  it("skips a one-sided Upper/Lower pair rather than guessing", () => {
    const el = document.createElement("div"); document.body.appendChild(el);
    const chart = createChart(el, { width: 400, height: 300, layout: { attributionLogo: false } });
    const times = [1767000900];
    const plots = { "Band Upper": [105] }; // no matching Lower

    const series = attachPinePlotsToPane(chart, 0, plots, times);

    expect(series).toHaveLength(0);
  });
});
