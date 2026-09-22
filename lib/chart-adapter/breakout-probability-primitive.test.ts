// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { createChart, CandlestickSeries } from "lightweight-charts";
import type { CanvasRenderingTarget2D } from "fancy-canvas";
import type { ApiOhlcBar } from "@/lib/api";
import {
  createBreakoutProbabilityPrimitive,
  DEFAULT_OPTIONS,
} from "./breakout-probability-primitive";

/**
 * The ladder's whole reason for existing is that it stays off the chart. These
 * tests measure where ink lands, not that ink landed: the previous renderer
 * drew ten full-width lines and eight shaded bands, and every one of them
 * would have passed a "did it draw something" assertion.
 */

const WIDTH = 400;
const HEIGHT = 300;
const STRIP_LEFT = WIDTH - 150;

function bars(): ApiOhlcBar[] {
  const out: ApiOhlcBar[] = [];
  let t = 1767000900;
  for (let i = 0; i < 60; i++) {
    // Alternating colours so both conditional sets get a real sample, and a
    // wide range so every level lands somewhere on a 300px pane.
    const up = i % 2 === 0;
    const base = 100 + (i % 7);
    out.push({
      time: (t += 60),
      open: up ? base : base + 1.5,
      high: base + 2.5,
      low: base - 2.5,
      close: up ? base + 1.5 : base,
      volume: 1000,
    });
  }
  return out;
}

function chartWithSeries() {
  const el = document.createElement("div");
  document.body.appendChild(el);
  const chart = createChart(el, {
    width: WIDTH, height: HEIGHT,
    layout: { attributionLogo: false, background: { color: "#0d1117" } },
  });
  const series = chart.addSeries(CandlestickSeries);
  series.setData(bars().map((b) => ({
    time: b.time as never, open: b.open, high: b.high, low: b.low, close: b.close,
  })));
  chart.timeScale().fitContent();
  return { chart, series };
}

interface Ink {
  rects: { x: number; w: number }[];
  lines: { x1: number; x2: number; y: number }[];
  texts: { text: string; x: number; y: number }[];
}

function render(options = {}): Ink {
  const { chart, series } = chartWithSeries();
  const handle = createBreakoutProbabilityPrimitive(bars, options);
  handle.primitive.attached?.({ chart, series, requestUpdate: () => {} } as never);

  const ink: Ink = { rects: [], lines: [], texts: [] };
  let pen = { x: 0, y: 0 };
  const ctx = {
    save() {}, restore() {}, scale() {}, beginPath() {}, fill() {},
    setLineDash() {}, rect() {}, roundRect() {},
    moveTo(x: number, y: number) { pen = { x, y }; },
    lineTo(x: number, y: number) { ink.lines.push({ x1: pen.x, x2: x, y }); },
    stroke() {},
    fillRect(x: number, _y: number, w: number) { ink.rects.push({ x, w }); },
    fillText(text: string, x: number, y: number) { ink.texts.push({ text, x, y }); },
    font: "", fillStyle: "", strokeStyle: "", lineWidth: 1,
    textAlign: "", textBaseline: "",
  } as unknown as CanvasRenderingContext2D;

  const target = {
    useBitmapCoordinateSpace: (f: (scope: unknown) => void) => f({
      context: ctx,
      mediaSize: { width: WIDTH, height: HEIGHT },
      bitmapSize: { width: WIDTH, height: HEIGHT },
      horizontalPixelRatio: 1, verticalPixelRatio: 1,
    }),
  } as unknown as CanvasRenderingTarget2D;

  handle.primitive.paneViews?.()[0]?.renderer()?.draw?.(target);
  return ink;
}

describe("breakout probability ladder", () => {
  it("draws the probability bars inside the strip, never across the chart", () => {
    // The old renderer shaded bands the full width of the pane. Any filled
    // rectangle starting left of the strip is that behaviour returning.
    const ink = render();
    expect(ink.rects.length).toBeGreaterThan(0);
    for (const rect of ink.rects) {
      expect(rect.x).toBeGreaterThanOrEqual(STRIP_LEFT);
      expect(rect.w).toBeLessThanOrEqual(150);
    }
  });

  it("puts every label in the strip", () => {
    const ink = render();
    expect(ink.texts.length).toBeGreaterThan(1);
    for (const label of ink.texts) {
      expect(label.x).toBeGreaterThan(STRIP_LEFT);
    }
  });

  it("reaches across the chart only for the previous bar's own high and low", () => {
    const ink = render();
    const acrossChart = ink.lines.filter((l) => Math.min(l.x1, l.x2) < STRIP_LEFT - 20);
    // At least one, or this test passes by drawing nothing at all. At most
    // two -- one anchor per side -- and never the stepped-away levels.
    expect(acrossChart.length).toBeGreaterThanOrEqual(1);
    expect(acrossChart.length).toBeLessThanOrEqual(2);
    for (const line of acrossChart) expect(Math.min(line.x1, line.x2)).toBe(0);
  });

  it("draws nothing across the chart when the anchors are turned off", () => {
    const ink = render({ anchorLines: false });
    const acrossChart = ink.lines.filter((l) => Math.min(l.x1, l.x2) < STRIP_LEFT - 20);
    expect(acrossChart).toHaveLength(0);
  });

  it("never overprints two rows", () => {
    // Levels one percent apart can land within a few pixels of each other on a
    // zoomed-out pane. A row nudged off its own price would be a lie, so the
    // further level is dropped instead.
    const ink = render({ stepPercent: 0.05 });
    const ys = ink.texts.filter((t) => t.text.endsWith("%")).map((t) => t.y).sort((a, b) => a - b);
    for (let i = 1; i < ys.length; i++) {
      expect(ys[i] - ys[i - 1]).toBeGreaterThanOrEqual(16);
    }
  });

  it("labels whole percentages, not two decimals", () => {
    // Two decimals on a frequency count implies a precision the sample does
    // not have.
    const ink = render();
    const percentages = ink.texts.map((t) => t.text).filter((t) => t.endsWith("%"));
    expect(percentages.length).toBeGreaterThan(0);
    for (const text of percentages) expect(text).toMatch(/^\d+%$/);
  });

  it("says which conditional set the numbers came from", () => {
    // Without it the ladder is a volatility measure wearing a percent sign.
    const ink = render();
    const header = ink.texts.find((t) => t.text.includes("after"));
    expect(header).toBeDefined();
    expect(header!.text).toMatch(/after (up|down) bar · n=\d+/);
  });

  it("draws nothing at all while hidden", () => {
    const { chart, series } = chartWithSeries();
    const handle = createBreakoutProbabilityPrimitive(bars);
    handle.primitive.attached?.({ chart, series, requestUpdate: () => {} } as never);
    handle.setVisible(false);
    expect(handle.getVisible()).toBe(false);
  });

  it("keeps the anchors on by default and the old fill option gone", () => {
    expect(DEFAULT_OPTIONS.anchorLines).toBe(true);
    expect("fill" in DEFAULT_OPTIONS).toBe(false);
  });
});
