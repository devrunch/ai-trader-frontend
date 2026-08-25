// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { LightweightChartsAdapter } from "./lightweight-charts-adapter";
import { runPineIndicator } from "@/lib/api/pine";

// Real shape: {time (ms), value} points, not raw numbers -- matches what
// the actual sandbox returns (see app/pine_sandbox/worker.mjs).
vi.mock("@/lib/api/pine", () => ({
  runPineIndicator: vi.fn().mockResolvedValue({
    ok: true,
    plots: { "SMA5": [
      { time: 1767000900000, value: 100 },
      { time: 1767000960000, value: 101 },
      { time: 1767001020000, value: 102 },
    ] },
    error: null,
  }),
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

  it("setActiveSymbol threads symbol/exchange into runPineIndicator so the sandbox can resolve syminfo.*", async () => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    const adapter = new LightweightChartsAdapter();
    await adapter.mount(el, { bars: [
      { time: 1767000900, open: 100, high: 101, low: 99, close: 100.5, volume: 1000 },
      { time: 1767000960, open: 100.5, high: 102, low: 100, close: 101.5, volume: 1200 },
      { time: 1767001020, open: 101.5, high: 103, low: 101, close: 102.5, volume: 1300 },
    ] });
    adapter.setActiveSymbol("RELIANCE", "NSE");
    await adapter.attachPineIndicator({ id: "ind1", source: "//@version=5\nindicator(\"t\")\nplot(ta.sma(close,5))", label: "SMA5", pane: "main" });
    expect(runPineIndicator).toHaveBeenLastCalledWith(expect.any(String), expect.any(Array), "RELIANCE", "NSE", undefined);
    adapter.dispose();
  });

  it("spec.params threads through to runPineIndicator's inputOverrides, and getIndicatorInputsMeta exposes the sandbox's real input metadata", async () => {
    vi.mocked(runPineIndicator).mockResolvedValueOnce({
      ok: true,
      plots: { SMA: [{ time: 1767000900000, value: 100 }] },
      error: null,
      inputsMeta: [{ type: "int", defval: 20, varId: "length", title: "Length", minval: 1 }],
    });
    const el = document.createElement("div");
    document.body.appendChild(el);
    const adapter = new LightweightChartsAdapter();
    await adapter.mount(el, { bars: [
      { time: 1767000900, open: 100, high: 101, low: 99, close: 100.5, volume: 1000 },
    ] });
    await adapter.attachPineIndicator({
      id: "ind1", source: "//@version=5\nindicator(\"t\")\nlength = input.int(20)\nplot(ta.sma(close,length))",
      label: "SMA", pane: "main", params: { length: 5 },
    });
    expect(runPineIndicator).toHaveBeenLastCalledWith(expect.any(String), expect.any(Array), undefined, undefined, { length: 5 });
    expect(adapter.getIndicatorInputsMeta("ind1")).toEqual([{ type: "int", defval: 20, varId: "length", title: "Length", minval: 1 }]);
    adapter.removeIndicator("ind1");
    expect(adapter.getIndicatorInputsMeta("ind1")).toBeUndefined();
    adapter.dispose();
  });

  it("getIndicatorPlotNames lists real plot titles, and setIndicatorPlotStyle recolors/rewidens the matching series in place", async () => {
    vi.mocked(runPineIndicator).mockResolvedValueOnce({
      ok: true,
      plots: {
        Average: [{ time: 1767000900000, value: 100 }],
        Close: [{ time: 1767000900000, value: 100.5 }],
      },
      error: null,
    });
    const el = document.createElement("div");
    document.body.appendChild(el);
    const adapter = new LightweightChartsAdapter();
    await adapter.mount(el, { bars: [
      { time: 1767000900, open: 100, high: 101, low: 99, close: 100.5, volume: 1000 },
    ] });
    await adapter.attachPineIndicator({ id: "gchan", source: "//@version=6\nindicator(\"t\")", label: "G-Trend", pane: "main" });

    expect(adapter.getIndicatorPlotNames("gchan").sort()).toEqual(["Average", "Close"]);

    adapter.setIndicatorPlotStyle("gchan", "Average", { color: "#ff0000", lineWidth: 4 });
    expect(adapter.__test_seriesOptionsByTitle("gchan", "Average")?.color).toBe("#ff0000");
    expect(adapter.__test_seriesOptionsByTitle("gchan", "Average")?.lineWidth).toBe(4);

    // A width outside LWC's 1|2|3|4 union is clamped, not passed through raw
    // (would otherwise be a runtime type violation against LWC's own API).
    adapter.setIndicatorPlotStyle("gchan", "Average", { lineWidth: 99 });
    expect(adapter.__test_seriesOptionsByTitle("gchan", "Average")?.lineWidth).toBe(4);

    // A non-existent plot title is a silent no-op, not a throw -- the script
    // may no longer produce that plot on a later attach.
    expect(() => adapter.setIndicatorPlotStyle("gchan", "NoSuchPlot", { color: "#00ff00" })).not.toThrow();

    adapter.dispose();
  });

  it("re-attaching an indicator with a saved style re-applies it to the fresh series", async () => {
    vi.mocked(runPineIndicator).mockResolvedValue({
      ok: true,
      plots: { SMA: [{ time: 1767000900000, value: 100 }] },
      error: null,
    });
    const el = document.createElement("div");
    document.body.appendChild(el);
    const adapter = new LightweightChartsAdapter();
    await adapter.mount(el, { bars: [
      { time: 1767000900, open: 100, high: 101, low: 99, close: 100.5, volume: 1000 },
    ] });
    await adapter.attachPineIndicator({
      id: "sma1", source: "//@version=5\nindicator(\"t\")\nplot(ta.sma(close,5),\"SMA\")",
      label: "SMA", pane: "main", style: { SMA: { color: "#123456", lineWidth: 3 } },
    });
    expect(adapter.__test_seriesOptionsByTitle("sma1", "SMA")?.color).toBe("#123456");
    expect(adapter.__test_seriesOptionsByTitle("sma1", "SMA")?.lineWidth).toBe(3);
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

  it("pushLiveTick updates the forming candle in place while still inside its own period", async () => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    const adapter = new LightweightChartsAdapter();
    await adapter.mount(el, { bars: [
      { time: 1767000840, open: 99, high: 100, low: 98, close: 99.5, volume: 900 },
      { time: 1767000900, open: 100, high: 101, low: 99, close: 100.5, volume: 1000 },
    ] });
    // 30s after the last bar's own time, well inside its 60s (bar-to-bar
    // gap-derived) period -- must mutate the existing bar, not append.
    adapter.pushLiveTick(103, 1767000930);
    expect(adapter.__test_barCount()).toBe(2);
    expect(adapter.__test_lastBar().close).toBe(103);
    expect(adapter.__test_lastBar().high).toBe(103); // extended, since 103 > original high of 101
    adapter.dispose();
  });

  it("pushLiveTick starts a fresh bar once the forming candle's period has actually elapsed", async () => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    const adapter = new LightweightChartsAdapter();
    await adapter.mount(el, { bars: [
      { time: 1767000840, open: 99, high: 100, low: 98, close: 99.5, volume: 900 },
      { time: 1767000900, open: 100, high: 101, low: 99, close: 100.5, volume: 1000 },
    ] });
    // 90s later -- a full 60s period (from the bar-to-bar gap) has already
    // passed, so this tick belongs to the NEXT candle, not the last one.
    adapter.pushLiveTick(103, 1767000990);

    expect(adapter.__test_barCount()).toBe(3);
    const newBar = adapter.__test_lastBar();
    expect(newBar.time).toBe(1767000960); // the next 60s-aligned bucket after 1767000900
    expect(newBar.open).toBe(103);
    expect(newBar.high).toBe(103);
    expect(newBar.low).toBe(103);
    expect(newBar.close).toBe(103);
    // The previous bar must be untouched -- it's a closed candle now, not
    // still absorbing ticks.
    expect(adapter.__test_barAt(1).close).toBe(100.5);
    adapter.dispose();
  });

  it("addDrawings attaches one primitive per drawing, grouped, and removeDrawingsByGroup removes exactly that group", async () => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    const adapter = new LightweightChartsAdapter();
    await adapter.mount(el, { bars: [
      { time: 1767000900, open: 100, high: 101, low: 99, close: 100.5, volume: 1000 },
      { time: 1767000960, open: 100.5, high: 102, low: 100, close: 101.5, volume: 1200 },
    ] });

    adapter.addDrawings([
      { kind: "segment", points: [{ timestamp: 1767000900, value: 100 }, { timestamp: 1767000960, value: 102 }] },
    ], "ai:turn1");
    adapter.addDrawings([
      { kind: "trade_marker", timestamp: 1767000900, value: 100, side: "BUY" },
    ], "draw");

    expect(adapter.__test_drawingCount("ai:turn1")).toBe(1);
    expect(adapter.__test_drawingCount("draw")).toBe(1);

    adapter.removeDrawingsByGroup("ai:turn1");
    expect(adapter.__test_drawingCount("ai:turn1")).toBe(0);
    expect(adapter.__test_drawingCount("draw")).toBe(1); // the other group is untouched
    adapter.dispose();
  });

  it("removeDrawingsWhere removes every group matching the predicate", async () => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    const adapter = new LightweightChartsAdapter();
    await adapter.mount(el, { bars: [{ time: 1767000900, open: 100, high: 101, low: 99, close: 100.5, volume: 1000 }] });

    adapter.addDrawings([{ kind: "priceline", value: 100 }], "ai:turn1");
    adapter.addDrawings([{ kind: "priceline", value: 105 }], "ai:turn2");
    adapter.addDrawings([{ kind: "priceline", value: 95 }], "draw");

    adapter.removeDrawingsWhere((groupId) => groupId.startsWith("ai"));

    expect(adapter.__test_drawingCount("ai:turn1")).toBe(0);
    expect(adapter.__test_drawingCount("ai:turn2")).toBe(0);
    expect(adapter.__test_drawingCount("draw")).toBe(1);
    adapter.dispose();
  });

  it("two main-pane indicators and the candle series all coexist on pane 0, none evicted", async () => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    const adapter = new LightweightChartsAdapter();
    await adapter.mount(el, { bars: [
      { time: 1767000900, open: 100, high: 101, low: 99, close: 100.5, volume: 1000 },
      { time: 1767000960, open: 100.5, high: 102, low: 100, close: 101.5, volume: 1200 },
      { time: 1767001020, open: 101.5, high: 103, low: 101, close: 102.5, volume: 1300 },
    ] });
    const before = adapter.seriesCount(); // candle + volume = 2
    await adapter.attachPineIndicator({ id: "a", source: "//@version=5\nindicator(\"a\")\nplot(ta.sma(close,5), \"A\")", label: "A", pane: "main" });
    await adapter.attachPineIndicator({ id: "b", source: "//@version=5\nindicator(\"b\")\nplot(ta.sma(close,10), \"B\")", label: "B", pane: "main" });
    // Both main-pane attaches stayed on pane 0 (paneIndex 0 for "main"), and
    // neither evicted the other or the candle/volume series -- confirmed by
    // count, not just "didn't throw".
    expect(adapter.seriesCount()).toBe(before + 2);
    expect(adapter.__test_paneCount()).toBe(1); // candle + volume (overlay scale) share pane 0, no new pane created
    // Every Pine LineSeries used to render in LWC's own default color
    // regardless of indicator -- two single-line indicators like SMA and EMA
    // were visually identical on the chart despite showing different colors
    // in the legend. Caught by hand; this locks the fix in.
    const colorA = adapter.__test_seriesColor("a");
    const colorB = adapter.__test_seriesColor("b");
    expect(colorA).toBeTruthy();
    expect(colorB).toBeTruthy();
    expect(colorA).not.toBe(colorB);
    adapter.dispose();
  });

  it("a sub-pane indicator gets its own new pane, not pane 0", async () => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    const adapter = new LightweightChartsAdapter();
    await adapter.mount(el, { bars: [
      { time: 1767000900, open: 100, high: 101, low: 99, close: 100.5, volume: 1000 },
      { time: 1767000960, open: 100.5, high: 102, low: 100, close: 101.5, volume: 1200 },
    ] });
    const paneCountBefore = adapter.__test_paneCount();
    await adapter.attachPineIndicator({ id: "rsi", source: "//@version=5\nindicator(\"rsi\")\nplot(ta.rsi(close,14), \"RSI\")", label: "RSI", pane: "sub" });
    expect(adapter.__test_paneCount()).toBeGreaterThan(paneCountBefore);
    adapter.dispose();
  });

  it("removeIndicator cleans up its now-empty sub-pane rather than leaving a ghost pane", async () => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    const adapter = new LightweightChartsAdapter();
    await adapter.mount(el, { bars: [
      { time: 1767000900, open: 100, high: 101, low: 99, close: 100.5, volume: 1000 },
      { time: 1767000960, open: 100.5, high: 102, low: 100, close: 101.5, volume: 1200 },
    ] });
    const paneCountBefore = adapter.__test_paneCount();
    await adapter.attachPineIndicator({ id: "rsi", source: "//@version=5\nindicator(\"rsi\")\nplot(ta.rsi(close,14), \"RSI\")", label: "RSI", pane: "sub" });
    expect(adapter.__test_paneCount()).toBeGreaterThan(paneCountBefore);

    adapter.removeIndicator("rsi");
    expect(adapter.__test_paneCount()).toBe(paneCountBefore);
    adapter.dispose();
  });

  it("getPaneRects reports the indicator id owning each sub-pane", async () => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    const adapter = new LightweightChartsAdapter();
    await adapter.mount(el, { bars: [
      { time: 1767000900, open: 100, high: 101, low: 99, close: 100.5, volume: 1000 },
      { time: 1767000960, open: 100.5, high: 102, low: 100, close: 101.5, volume: 1200 },
    ] });
    await adapter.attachPineIndicator({ id: "rsi", source: "//@version=5\nindicator(\"rsi\")\nplot(ta.rsi(close,14), \"RSI\")", label: "RSI", pane: "sub" });

    const rects = adapter.getPaneRects();
    const rsiPane = rects.find((r) => r.indicatorId === "rsi");
    expect(rsiPane).toBeDefined();
    expect(rects.some((r) => r.indicatorId === undefined)).toBe(true); // pane 0 owns none
    adapter.dispose();
  });

  it("togglePaneCollapsed flips this adapter's own collapsed bookkeeping for the pane", async () => {
    // Checks the adapter's own state, not LWC's reported height: jsdom runs
    // no real layout pass, so getHeight()/setHeight() are no-ops there --
    // confirmed by hand, not just assumed. The real shrink/restore is
    // verified visually via Playwright, same as everywhere else pixel
    // geometry matters in this codebase.
    const el = document.createElement("div");
    document.body.appendChild(el);
    const adapter = new LightweightChartsAdapter();
    await adapter.mount(el, { bars: [
      { time: 1767000900, open: 100, high: 101, low: 99, close: 100.5, volume: 1000 },
      { time: 1767000960, open: 100.5, high: 102, low: 100, close: 101.5, volume: 1200 },
    ] });
    await adapter.attachPineIndicator({ id: "rsi", source: "//@version=5\nindicator(\"rsi\")\nplot(ta.rsi(close,14), \"RSI\")", label: "RSI", pane: "sub" });
    const paneIndex = adapter.getPaneRects().find((r) => r.indicatorId === "rsi")!.index;
    expect(adapter.__test_isPaneCollapsed(paneIndex)).toBe(false);

    adapter.togglePaneCollapsed(paneIndex);
    expect(adapter.__test_isPaneCollapsed(paneIndex)).toBe(true);

    adapter.togglePaneCollapsed(paneIndex);
    expect(adapter.__test_isPaneCollapsed(paneIndex)).toBe(false);
    adapter.dispose();
  });

  // movePane's underlying LWC call (PaneApi.moveTo) validates against the
  // chart's real rendered pane WIDGETS, which jsdom never materializes (no
  // paint cycle) -- it throws "Invalid pane index" here regardless of
  // correct usage. Verified visually via Playwright instead; not unit-
  // testable in this environment.

  it("setIndicatorVisible toggles a Pine series' visible option without detaching it", async () => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    const adapter = new LightweightChartsAdapter();
    await adapter.mount(el, { bars: [
      { time: 1767000900, open: 100, high: 101, low: 99, close: 100.5, volume: 1000 },
      { time: 1767000960, open: 100.5, high: 102, low: 100, close: 101.5, volume: 1200 },
    ] });
    const before = adapter.seriesCount();
    await adapter.attachPineIndicator({ id: "rsi", source: "//@version=5\nindicator(\"rsi\")\nplot(ta.rsi(close,14), \"RSI\")", label: "RSI", pane: "sub" });

    adapter.setIndicatorVisible("rsi", false);
    expect(adapter.seriesCount()).toBeGreaterThan(before); // still attached, just hidden
    adapter.setIndicatorVisible("rsi", true); // must not throw toggling back
    adapter.dispose();
  });

  it("togglePaneFullscreen flips this adapter's own fullscreen bookkeeping for the pane", async () => {
    // Same jsdom caveat as the collapse test above: checks the adapter's own
    // state, not LWC's reported (always-no-op-in-jsdom) height.
    const el = document.createElement("div");
    document.body.appendChild(el);
    const adapter = new LightweightChartsAdapter();
    await adapter.mount(el, { bars: [
      { time: 1767000900, open: 100, high: 101, low: 99, close: 100.5, volume: 1000 },
      { time: 1767000960, open: 100.5, high: 102, low: 100, close: 101.5, volume: 1200 },
    ] });
    await adapter.attachPineIndicator({ id: "rsi", source: "//@version=5\nindicator(\"rsi\")\nplot(ta.rsi(close,14), \"RSI\")", label: "RSI", pane: "sub" });
    const paneIndex = adapter.getPaneRects().find((r) => r.indicatorId === "rsi")!.index;
    expect(adapter.__test_isPaneFullscreen(paneIndex)).toBe(false);

    adapter.togglePaneFullscreen(paneIndex);
    expect(adapter.__test_isPaneFullscreen(paneIndex)).toBe(true);

    adapter.togglePaneFullscreen(paneIndex); // toggle off -- restores
    expect(adapter.__test_isPaneFullscreen(paneIndex)).toBe(false);
    adapter.dispose();
  });

  it("attachVolumeProfile/removeVolumeProfile are idempotent, no duplicate primitive on repeat attach", async () => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    const adapter = new LightweightChartsAdapter();
    await adapter.mount(el, { bars: [
      { time: 1767000900, open: 100, high: 101, low: 99, close: 100.5, volume: 1000 },
      { time: 1767000960, open: 100.5, high: 102, low: 100, close: 101.5, volume: 1200 },
    ] });
    expect(adapter.__test_hasVolumeProfile("visible")).toBe(false);

    adapter.attachVolumeProfile("visible", "visible");
    expect(adapter.__test_hasVolumeProfile("visible")).toBe(true);
    adapter.attachVolumeProfile("visible", "visible"); // repeat attach -- must not throw or swap the primitive
    expect(adapter.__test_hasVolumeProfile("visible")).toBe(true);

    expect(adapter.__test_isVolumeProfileVisible("visible")).toBe(true);
    adapter.setIndicatorVisible("visible", false);
    expect(adapter.__test_isVolumeProfileVisible("visible")).toBe(false);
    adapter.setIndicatorVisible("visible", true);
    expect(adapter.__test_isVolumeProfileVisible("visible")).toBe(true);

    adapter.removeVolumeProfile("visible");
    expect(adapter.__test_hasVolumeProfile("visible")).toBe(false);
    adapter.removeVolumeProfile("visible"); // repeat remove -- must not throw
    expect(adapter.__test_hasVolumeProfile("visible")).toBe(false);

    adapter.dispose();
  });

  it("two different Volume Profile modes coexist, removing one leaves the other attached", async () => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    const adapter = new LightweightChartsAdapter();
    await adapter.mount(el, { bars: [
      { time: 1767000900, open: 100, high: 101, low: 99, close: 100.5, volume: 1000 },
      { time: 1767000960, open: 100.5, high: 102, low: 100, close: 101.5, volume: 1200 },
    ] });

    adapter.attachVolumeProfile("vp-visible", "visible");
    adapter.attachVolumeProfile("vp-session", "session");
    expect(adapter.__test_hasVolumeProfile("vp-visible")).toBe(true);
    expect(adapter.__test_hasVolumeProfile("vp-session")).toBe(true);

    adapter.removeVolumeProfile("vp-visible");
    expect(adapter.__test_hasVolumeProfile("vp-visible")).toBe(false);
    expect(adapter.__test_hasVolumeProfile("vp-session")).toBe(true);

    adapter.dispose();
  });

  it("setVolumeSpreadAnalysis toggles without throwing and without touching series count", async () => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    const adapter = new LightweightChartsAdapter();
    await adapter.mount(el, { bars: [
      { time: 1767000900, open: 100, high: 101, low: 99, close: 100.5, volume: 1000 },
      { time: 1767000960, open: 100.5, high: 102, low: 100, close: 101.5, volume: 1200 },
    ] });
    const before = adapter.seriesCount();

    adapter.setVolumeSpreadAnalysis(true); // recolors the existing volume series in place
    expect(adapter.seriesCount()).toBe(before);
    adapter.setVolumeSpreadAnalysis(true); // repeat enable -- must not throw or double-apply
    adapter.setVolumeSpreadAnalysis(false);
    expect(adapter.seriesCount()).toBe(before);
    adapter.dispose();
  });

  it("attachPineIndicator with pane \"volume\" shares pane 0, not a new pane", async () => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    const adapter = new LightweightChartsAdapter();
    await adapter.mount(el, { bars: [
      { time: 1767000900, open: 100, high: 101, low: 99, close: 100.5, volume: 1000 },
      { time: 1767000960, open: 100.5, high: 102, low: 100, close: 101.5, volume: 1200 },
      { time: 1767001020, open: 101.5, high: 103, low: 101, close: 102.5, volume: 1300 },
    ] });
    const paneCountBefore = adapter.__test_paneCount();
    await adapter.attachPineIndicator({ id: "spread-vol", source: "//@version=5\nindicator(\"s\")\nplot(high-low,\"Spread\")", label: "Spread (on Volume)", pane: "volume" });
    expect(adapter.__test_paneCount()).toBe(paneCountBefore); // no new pane created
    adapter.dispose();
  });

  it("attachPineIndicator turns a boolean plot into real chart markers (plotshape()-style signals)", async () => {
    vi.mocked(runPineIndicator).mockResolvedValueOnce({
      ok: true,
      plots: {
        Average: [
          { time: 1767000900000, value: 100 },
          { time: 1767000960000, value: 101 },
          { time: 1767001020000, value: 102 },
        ],
        Buy: [
          { time: 1767000900000, value: false },
          { time: 1767000960000, value: true },
          { time: 1767001020000, value: false },
        ],
      },
      error: null,
    });
    const el = document.createElement("div");
    document.body.appendChild(el);
    const adapter = new LightweightChartsAdapter();
    await adapter.mount(el, { bars: [
      { time: 1767000900, open: 100, high: 101, low: 99, close: 100.5, volume: 1000 },
      { time: 1767000960, open: 100.5, high: 102, low: 100, close: 101.5, volume: 1200 },
      { time: 1767001020, open: 101.5, high: 103, low: 101, close: 102.5, volume: 1300 },
    ] });
    await adapter.attachPineIndicator({ id: "gchan", source: "//@version=6\nindicator(\"G-Trend\")", label: "G-Trend", pane: "main" });
    expect(adapter.__test_markerCount("gchan")).toBe(1); // only the one true bar
    adapter.dispose();
  });

  it("removeIndicator detaches that indicator's markers, not just its series", async () => {
    vi.mocked(runPineIndicator).mockResolvedValueOnce({
      ok: true,
      plots: { Buy: [{ time: 1767000900000, value: true }] },
      error: null,
    });
    const el = document.createElement("div");
    document.body.appendChild(el);
    const adapter = new LightweightChartsAdapter();
    await adapter.mount(el, { bars: [
      { time: 1767000900, open: 100, high: 101, low: 99, close: 100.5, volume: 1000 },
    ] });
    await adapter.attachPineIndicator({ id: "sig", source: "//@version=6\nindicator(\"s\")", label: "Signal", pane: "main" });
    expect(adapter.__test_markerCount("sig")).toBe(1);
    adapter.removeIndicator("sig");
    expect(adapter.__test_markerCount("sig")).toBe(0);
    adapter.dispose();
  });

  it("defaults to candles when no chartType is given, and mounts directly into the requested type otherwise", async () => {
    const bars = [
      { time: 1767000900, open: 100, high: 101, low: 99, close: 100.5, volume: 1000 },
      { time: 1767000960, open: 100.5, high: 102, low: 100, close: 101.5, volume: 1200 },
    ];
    const elA = document.createElement("div");
    document.body.appendChild(elA);
    const defaultAdapter = new LightweightChartsAdapter();
    await defaultAdapter.mount(elA, { bars });
    expect(defaultAdapter.getChartType()).toBe("candles");
    defaultAdapter.dispose();

    const elB = document.createElement("div");
    document.body.appendChild(elB);
    const lineAdapter = new LightweightChartsAdapter();
    await lineAdapter.mount(elB, { bars, chartType: "line" });
    expect(lineAdapter.getChartType()).toBe("line");
    expect(lineAdapter.seriesCount()).toBe(2); // main (line) + volume, same as candles
    lineAdapter.dispose();
  });

  it("setChartType swaps the main series live and updates getChartType, for every built renderer", async () => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    const adapter = new LightweightChartsAdapter();
    await adapter.mount(el, { bars: [
      { time: 1767000900, open: 100, high: 101, low: 99, close: 100.5, volume: 1000 },
      { time: 1767000960, open: 100.5, high: 102, low: 100, close: 101.5, volume: 1200 },
    ] });
    expect(adapter.getChartType()).toBe("candles");

    adapter.setChartType("line");
    expect(adapter.getChartType()).toBe("line");
    expect(adapter.seriesCount()).toBe(2); // swapped in place, volume untouched

    adapter.setChartType("area");
    expect(adapter.getChartType()).toBe("area");
    expect(adapter.seriesCount()).toBe(2);

    adapter.setChartType("candles");
    expect(adapter.getChartType()).toBe("candles");
    expect(adapter.seriesCount()).toBe(2);
    adapter.dispose();
  });

  it("setChartType to the already-active type is a no-op", async () => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    const adapter = new LightweightChartsAdapter();
    await adapter.mount(el, { bars: [
      { time: 1767000900, open: 100, high: 101, low: 99, close: 100.5, volume: 1000 },
    ] });
    expect(() => adapter.setChartType("candles")).not.toThrow();
    expect(adapter.getChartType()).toBe("candles");
    expect(adapter.seriesCount()).toBe(2);
    adapter.dispose();
  });

  it("an unknown chart type falls back to candles rather than mounting blank", async () => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    const adapter = new LightweightChartsAdapter();
    // "tpo" is a real ChartTypeId (see chart-types/types.ts's full target-list
    // union) but has no entry in the registry yet -- rendererFor's own
    // fallback is what's under test here, not a type error.
    await adapter.mount(el, { bars: [{ time: 1767000900, open: 100, high: 101, low: 99, close: 100.5, volume: 1000 }], chartType: "tpo" });
    expect(adapter.getChartType()).toBe("tpo"); // the adapter still records what was asked for...
    expect(adapter.seriesCount()).toBe(2); // ...but rendererFor silently gave it a working candles series, not a blank pane
    adapter.dispose();
  });

  it("pushLiveTick and loadMore keep working against the underlying bars after switching chart type", async () => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    const onLoadMore = vi.fn(async (oldestSec: number) => [
      { time: oldestSec - 60, open: 99, high: 100, low: 98, close: 99.5, volume: 900 },
    ]);
    const adapter = new LightweightChartsAdapter();
    await adapter.mount(el, {
      bars: [
        { time: 1767000840, open: 99, high: 100, low: 98, close: 99.5, volume: 900 },
        { time: 1767000900, open: 100, high: 101, low: 99, close: 100.5, volume: 1000 },
      ],
      onLoadMore,
    });
    adapter.setChartType("area");

    adapter.pushLiveTick(103, 1767000990); // a full period past the last bar -- starts a fresh one
    expect(adapter.__test_barCount()).toBe(3);
    expect(adapter.__test_lastBar().close).toBe(103);

    await adapter.__test_triggerLoadMore();
    expect(onLoadMore).toHaveBeenCalledWith(1767000840);
    expect(adapter.__test_barCount()).toBe(4);
    adapter.dispose();
  });

  it("setChartType re-attaches drawings, price lines, and Volume Profile onto the new series instead of dropping them", async () => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    const adapter = new LightweightChartsAdapter();
    await adapter.mount(el, { bars: [
      { time: 1767000900, open: 100, high: 101, low: 99, close: 100.5, volume: 1000 },
      { time: 1767000960, open: 100.5, high: 102, low: 100, close: 101.5, volume: 1200 },
    ] });

    adapter.addDrawings([
      { kind: "segment", points: [{ timestamp: 1767000900, value: 100 }, { timestamp: 1767000960, value: 102 }] },
      { kind: "priceline", value: 101 },
    ], "ai:turn1");
    adapter.attachVolumeProfile("visible", "visible");

    expect(adapter.__test_drawingCount("ai:turn1")).toBe(2);
    expect(adapter.__test_hasVolumeProfile("visible")).toBe(true);

    // The switch tears down and recreates the main series underneath these --
    // if setChartType didn't re-attach, this would either throw (stale refs
    // pointing at a removed series) or silently leave the count at 0.
    expect(() => adapter.setChartType("line")).not.toThrow();

    expect(adapter.__test_drawingCount("ai:turn1")).toBe(2);
    expect(adapter.__test_hasVolumeProfile("visible")).toBe(true);
    expect(adapter.__test_isVolumeProfileVisible("visible")).toBe(true);

    // And the re-attached refs are live, not just present in the bookkeeping
    // map -- removal after the switch must still work against the new series.
    expect(() => adapter.removeDrawingsByGroup("ai:turn1")).not.toThrow();
    expect(adapter.__test_drawingCount("ai:turn1")).toBe(0);
    expect(() => adapter.removeVolumeProfile("visible")).not.toThrow();
    expect(adapter.__test_hasVolumeProfile("visible")).toBe(false);
    adapter.dispose();
  });
});
