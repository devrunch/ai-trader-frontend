// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { LightweightChartsAdapter } from "./lightweight-charts-adapter";

vi.mock("@/lib/api/pine", () => ({
  runPineIndicator: vi.fn().mockResolvedValue({ ok: true, plots: { "SMA5": [100, 101, 102] }, error: null }),
}));

describe("LightweightChartsAdapter", () => {
  it("mounts with only candle + volume series, no indicator pre-attached", async () => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    const adapter = new LightweightChartsAdapter();
    await adapter.mount(el, { bars: [
      { time: 1767000900, open: 100, high: 101, low: 99, close: 100.5, volume: 1000 },
      { time: 1767000960, open: 100.5, high: 102, low: 100, close: 101.5, volume: 1200 },
    ] });
    expect(adapter.seriesCount()).toBe(2); // candle + volume, nothing else
    adapter.dispose();
  });

  it("attachPineIndicator adds a series only when actually called", async () => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    const adapter = new LightweightChartsAdapter();
    await adapter.mount(el, { bars: [
      { time: 1767000900, open: 100, high: 101, low: 99, close: 100.5, volume: 1000 },
      { time: 1767000960, open: 100.5, high: 102, low: 100, close: 101.5, volume: 1200 },
      { time: 1767001020, open: 101.5, high: 103, low: 101, close: 102.5, volume: 1300 },
    ] }); // matches the mocked runPineIndicator's 3-value response -- PineTS always returns one value per bar given
    const before = adapter.seriesCount();
    await adapter.attachPineIndicator({ id: "ind1", source: "//@version=5\nindicator(\"t\")\nplot(ta.sma(close,5))", label: "SMA5", pane: "main" });
    expect(adapter.seriesCount()).toBeGreaterThan(before);
    adapter.dispose();
  });
});
