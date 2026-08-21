// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { KlinechartsAdapter } from "./klinecharts-adapter";

describe("KlinechartsAdapter", () => {
  it("mounts, applies price levels and default candle+volume, and disposes without throwing", async () => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    const adapter = new KlinechartsAdapter();
    await adapter.mount(el, { bars: [
      { time: 1767000900, open: 100, high: 101, low: 99, close: 100.5, volume: 1000 },
      { time: 1767000960, open: 100.5, high: 102, low: 100, close: 101.5, volume: 1200 },
    ] });
    adapter.setPriceLevels({ entry: 100, target: 105, stopLoss: 98 });
    adapter.setIndicators(["VOL"]);
    adapter.resize();
    adapter.dispose();
  });

  it("attaches an agent-authored custom diascript indicator by name", async () => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    const adapter = new KlinechartsAdapter();
    await adapter.mount(el, { bars: [
      { time: 1767000900, open: 100, high: 101, low: 99, close: 100.5, volume: 1000 },
      { time: 1767000960, open: 100.5, high: 102, low: 100, close: 101.5, volume: 1200 },
    ] });
    const id = await adapter.attachCustomIndicator({
      name: "DIA_TEST_CUSTOM", source: "result = line(close)", outputName: "result", pane: "main",
    });
    expect(id).not.toBeNull();
    adapter.dispose();
  });
});
