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

  it("calls onLoadMore when the visible range approaches the oldest loaded bar", async () => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    const onLoadMore = vi.fn().mockResolvedValue([
      { time: 1767000840, open: 99, high: 100, low: 98, close: 99.5, volume: 900 },
    ]);
    const adapter = new LightweightChartsAdapter();
    await adapter.mount(el, {
      bars: [{ time: 1767000900, open: 100, high: 101, low: 99, close: 100.5, volume: 1000 }],
      onLoadMore,
    });
    await adapter.__test_triggerLoadMore();
    expect(onLoadMore).toHaveBeenCalledWith(1767000900);
    adapter.dispose();
  });

  it("prepends loaded-more bars so a subsequent load-more asks even further back", async () => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    // Realistic mock: each call returns bars strictly older than the
    // timestamp it was asked for, matching what a real onLoadMore does --
    // a mock that always returns the same bar regardless of input would
    // make a second call re-prepend a duplicate timestamp, which LWC
    // correctly rejects as non-ascending.
    const onLoadMore = vi.fn(async (oldestMs: number) => [
      { time: oldestMs - 60, open: 99, high: 100, low: 98, close: 99.5, volume: 900 },
    ]);
    const adapter = new LightweightChartsAdapter();
    await adapter.mount(el, {
      bars: [{ time: 1767000900, open: 100, high: 101, low: 99, close: 100.5, volume: 1000 }],
      onLoadMore,
    });
    await adapter.__test_triggerLoadMore();
    await adapter.__test_triggerLoadMore();
    expect(onLoadMore).toHaveBeenLastCalledWith(1767000840);
    adapter.dispose();
  });

  it("pushLiveTick updates the forming candle in place, not as a new bar", async () => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    const adapter = new LightweightChartsAdapter();
    await adapter.mount(el, { bars: [{ time: 1767000900, open: 100, high: 101, low: 99, close: 100.5, volume: 1000 }] });
    adapter.pushLiveTick(103);
    expect(adapter.__test_lastBar().close).toBe(103);
    expect(adapter.__test_lastBar().high).toBe(103); // extended, since 103 > original high of 101
    adapter.dispose();
  });
});
