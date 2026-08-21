// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { createChart, LineSeries } from "lightweight-charts";
import type { CanvasRenderingTarget2D } from "fancy-canvas";
import {
  createSegmentPrimitive,
  createRayPrimitive,
  createRectPrimitive,
  createFibonacciPrimitive,
  createTradeMarkerPrimitive,
} from "./drawing-primitives";

function chartWithSeries() {
  const el = document.createElement("div");
  document.body.appendChild(el);
  const chart = createChart(el, { width: 400, height: 300, layout: { attributionLogo: false } });
  const series = chart.addSeries(LineSeries);
  series.setData([
    { time: 1767000900 as never, value: 100 },
    { time: 1767000960 as never, value: 102 },
    { time: 1767001020 as never, value: 105 },
    { time: 1767001080 as never, value: 103 },
  ]);
  chart.timeScale().fitContent();
  return { chart, series };
}

/**
 * Drives a primitive's draw() callback directly, bypassing LWC's own
 * requestAnimationFrame-based render loop entirely -- jsdom doesn't run that
 * loop synchronously (confirmed: attachPrimitive() alone never triggered a
 * real stroke()/fillRect() call in this environment), so exercising the
 * chart's real render pipeline in a test is unreliable. This instead calls
 * exactly what LWC itself would call, with a real canvas 2D context
 * (vitest-canvas-mock, already globally configured) standing in for the
 * bitmap coordinate space -- proving the draw callback itself is correct,
 * which is the part this module actually owns.
 */
function renderPrimitive(primitive: ReturnType<typeof createSegmentPrimitive>, series: ReturnType<ReturnType<typeof chartWithSeries>["chart"]["addSeries"]>, chart: ReturnType<typeof createChart>) {
  primitive.attached?.({ chart, series, requestUpdate: () => {} } as never);
  const paneView = primitive.paneViews?.()[0];
  const renderer = paneView?.renderer();
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  const fakeTarget = {
    useBitmapCoordinateSpace: (f: (scope: unknown) => void) =>
      f({ context: ctx, mediaSize: { width: 400, height: 300 }, bitmapSize: { width: 400, height: 300 }, horizontalPixelRatio: 1, verticalPixelRatio: 1 }),
  } as unknown as CanvasRenderingTarget2D;
  renderer?.draw(fakeTarget);
  return ctx;
}

describe("drawing primitives", () => {
  it("segment: draw() issues a real stroke() through the series/chart's real coordinate conversion", () => {
    const { chart, series } = chartWithSeries();
    const strokeSpy = vi.spyOn(CanvasRenderingContext2D.prototype, "stroke");
    const primitive = createSegmentPrimitive({ points: [{ time: 1767000900, value: 100 }, { time: 1767001080, value: 105 }], color: "#6c5ce7" });
    renderPrimitive(primitive, series, chart);
    expect(strokeSpy).toHaveBeenCalled();
    strokeSpy.mockRestore();
    chart.remove();
  });

  it("ray: draw() issues a real stroke()", () => {
    const { chart, series } = chartWithSeries();
    const strokeSpy = vi.spyOn(CanvasRenderingContext2D.prototype, "stroke");
    const primitive = createRayPrimitive({ points: [{ time: 1767000900, value: 100 }, { time: 1767000960, value: 102 }], color: "#6c5ce7" });
    renderPrimitive(primitive, series, chart);
    expect(strokeSpy).toHaveBeenCalled();
    strokeSpy.mockRestore();
    chart.remove();
  });

  it("rect: draw() issues real fillRect()/strokeRect() calls", () => {
    const { chart, series } = chartWithSeries();
    const fillRectSpy = vi.spyOn(CanvasRenderingContext2D.prototype, "fillRect");
    const strokeRectSpy = vi.spyOn(CanvasRenderingContext2D.prototype, "strokeRect");
    const primitive = createRectPrimitive({ points: [{ time: 1767000900, value: 100 }, { time: 1767001020, value: 105 }], color: "#e0ab4a" });
    renderPrimitive(primitive, series, chart);
    expect(fillRectSpy).toHaveBeenCalled();
    expect(strokeRectSpy).toHaveBeenCalled();
    fillRectSpy.mockRestore();
    strokeRectSpy.mockRestore();
    chart.remove();
  });

  it("fibonacci: draws all 7 standard retracement levels", () => {
    const { chart, series } = chartWithSeries();
    const strokeSpy = vi.spyOn(CanvasRenderingContext2D.prototype, "stroke");
    const primitive = createFibonacciPrimitive({ points: [{ time: 1767000900, value: 100 }, { time: 1767001080, value: 110 }] });
    renderPrimitive(primitive, series, chart);
    expect(strokeSpy).toHaveBeenCalledTimes(7); // 0, 0.236, 0.382, 0.5, 0.618, 0.786, 1
    strokeSpy.mockRestore();
    chart.remove();
  });

  it("trade marker: draws a real fillText() glyph for both sides", () => {
    const { chart, series } = chartWithSeries();
    const fillTextSpy = vi.spyOn(CanvasRenderingContext2D.prototype, "fillText");
    const buy = createTradeMarkerPrimitive({ point: { time: 1767000900, value: 100 }, side: "BUY" });
    const sell = createTradeMarkerPrimitive({ point: { time: 1767001080, value: 103 }, side: "SELL" });
    renderPrimitive(buy, series, chart);
    renderPrimitive(sell, series, chart);
    expect(fillTextSpy).toHaveBeenCalledWith("▲", expect.any(Number), expect.any(Number));
    expect(fillTextSpy).toHaveBeenCalledWith("▼", expect.any(Number), expect.any(Number));
    fillTextSpy.mockRestore();
    chart.remove();
  });

  it("skips drawing gracefully when a coordinate can't be resolved, instead of throwing", () => {
    const { chart, series } = chartWithSeries();
    const strokeSpy = vi.spyOn(CanvasRenderingContext2D.prototype, "stroke");
    // A time with no bar anywhere near it -- timeToCoordinate legitimately
    // returns null for points far outside the series' actual data range.
    const primitive = createSegmentPrimitive({ points: [{ time: 1600000000, value: 100 }, { time: 1600000060, value: 105 }], color: "#6c5ce7" });
    expect(() => renderPrimitive(primitive, series, chart)).not.toThrow();
    expect(strokeSpy).not.toHaveBeenCalled(); // genuinely skipped, not drawn with a garbage coordinate
    strokeSpy.mockRestore();
    chart.remove();
  });
});
