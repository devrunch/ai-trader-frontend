import type { ISeriesPrimitive, IPrimitivePaneView, Time, SeriesAttachedParameter } from "lightweight-charts";
import type { CanvasRenderingTarget2D } from "fancy-canvas";

export interface DrawPoint { time: number; value: number }

/** Every factory below shares the same shape: store the shape's defining
 * points/values, and recompute pixel coordinates from them on EVERY draw
 * call via the series/chart's own coordinate conversion -- never cached,
 * since the chart can zoom/pan between draws. */
function makePrimitive(draw: (ctx: CanvasRenderingContext2D, attached: SeriesAttachedParameter<Time>) => void): ISeriesPrimitive<Time> {
  let attached: SeriesAttachedParameter<Time> | null = null;
  return {
    attached(param) { attached = param; },
    detached() { attached = null; },
    paneViews(): readonly IPrimitivePaneView[] {
      return [{
        renderer() {
          return {
            draw(target: CanvasRenderingTarget2D) {
              target.useBitmapCoordinateSpace((scope) => {
                if (!attached) return;
                const ctx = scope.context;
                ctx.save();
                ctx.scale(scope.horizontalPixelRatio, scope.verticalPixelRatio);
                draw(ctx, attached);
                ctx.restore();
              });
            },
          };
        },
      }];
    },
  };
}

export function createSegmentPrimitive(opts: { points: [DrawPoint, DrawPoint]; color: string }): ISeriesPrimitive<Time> {
  return makePrimitive((ctx, { series, chart }) => {
    const x1 = chart.timeScale().timeToCoordinate(opts.points[0].time as Time);
    const y1 = series.priceToCoordinate(opts.points[0].value);
    const x2 = chart.timeScale().timeToCoordinate(opts.points[1].time as Time);
    const y2 = series.priceToCoordinate(opts.points[1].value);
    if (x1 == null || y1 == null || x2 == null || y2 == null) return;
    ctx.strokeStyle = opts.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  });
}

/** A trend line that extends past its second point to the pane's right edge,
 * instead of stopping there. */
export function createRayPrimitive(opts: { points: [DrawPoint, DrawPoint]; color: string }): ISeriesPrimitive<Time> {
  return makePrimitive((ctx, { series, chart }) => {
    const x1 = chart.timeScale().timeToCoordinate(opts.points[0].time as Time);
    const y1 = series.priceToCoordinate(opts.points[0].value);
    const x2 = chart.timeScale().timeToCoordinate(opts.points[1].time as Time);
    const y2 = series.priceToCoordinate(opts.points[1].value);
    if (x1 == null || y1 == null || x2 == null || y2 == null) return;
    const paneWidth = chart.paneSize().width;
    // Extend the line from point 1 through point 2 out to the right edge.
    const dx = x2 - x1, dy = y2 - y1;
    const rightEdgeX = paneWidth;
    const t = dx !== 0 ? (rightEdgeX - x1) / dx : 0;
    const rightEdgeY = y1 + dy * t;
    ctx.strokeStyle = opts.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(dx !== 0 ? rightEdgeX : x2, dx !== 0 ? rightEdgeY : y2);
    ctx.stroke();
  });
}

export function createRectPrimitive(opts: { points: [DrawPoint, DrawPoint]; color: string }): ISeriesPrimitive<Time> {
  return makePrimitive((ctx, { series, chart }) => {
    const x1 = chart.timeScale().timeToCoordinate(opts.points[0].time as Time);
    const y1 = series.priceToCoordinate(opts.points[0].value);
    const x2 = chart.timeScale().timeToCoordinate(opts.points[1].time as Time);
    const y2 = series.priceToCoordinate(opts.points[1].value);
    if (x1 == null || y1 == null || x2 == null || y2 == null) return;
    ctx.strokeStyle = opts.color;
    ctx.fillStyle = `${opts.color}22`;
    ctx.lineWidth = 1.5;
    const x = Math.min(x1, x2), y = Math.min(y1, y2);
    const w = Math.abs(x2 - x1), h = Math.abs(y2 - y1);
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);
  });
}

const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];

/** Horizontal lines at each standard retracement level between two anchor
 * prices, spanning the two anchors' time range. */
export function createFibonacciPrimitive(opts: { points: [DrawPoint, DrawPoint]; color?: string }): ISeriesPrimitive<Time> {
  const color = opts.color ?? "#8b8a9e";
  return makePrimitive((ctx, { series, chart }) => {
    const x1 = chart.timeScale().timeToCoordinate(opts.points[0].time as Time);
    const x2 = chart.timeScale().timeToCoordinate(opts.points[1].time as Time);
    if (x1 == null || x2 == null) return;
    const [priceA, priceB] = [opts.points[0].value, opts.points[1].value];
    ctx.strokeStyle = color;
    ctx.font = "10px sans-serif";
    ctx.fillStyle = color;
    ctx.lineWidth = 1;
    for (const level of FIB_LEVELS) {
      const price = priceA + (priceB - priceA) * level;
      const y = series.priceToCoordinate(price);
      if (y == null) continue;
      ctx.beginPath();
      ctx.moveTo(Math.min(x1, x2), y);
      ctx.lineTo(Math.max(x1, x2), y);
      ctx.stroke();
      ctx.fillText(level.toFixed(3), Math.min(x1, x2) + 2, y - 2);
    }
  });
}

/** Fills the region between two bar-aligned plots (same length, same time
 *  axis, since both come from one PineTS run over the same bars) -- e.g.
 *  Bollinger/Keltner's Upper/Lower channel, or Ichimoku's Span A/Span B
 *  cloud. Colored per-segment by which side is on top there, so a one-tone
 *  channel (colorBAboveA omitted, same color both ways) and a two-tone
 *  cloud (Ichimoku's real bullish-green/bearish-red) are the same primitive
 *  with different color arguments, not two separate implementations. */
export function createBandFillPrimitive(opts: {
  a: DrawPoint[];
  b: DrawPoint[];
  colorAAboveB: string;
  colorBAboveA?: string;
}): ISeriesPrimitive<Time> {
  const colorBAboveA = opts.colorBAboveA ?? opts.colorAAboveB;
  return makePrimitive((ctx, { series, chart }) => {
    const n = Math.min(opts.a.length, opts.b.length);
    for (let i = 0; i < n - 1; i++) {
      const a0 = opts.a[i], a1 = opts.a[i + 1];
      const b0 = opts.b[i], b1 = opts.b[i + 1];
      const x0 = chart.timeScale().timeToCoordinate(a0.time as Time);
      const x1 = chart.timeScale().timeToCoordinate(a1.time as Time);
      const ya0 = series.priceToCoordinate(a0.value);
      const ya1 = series.priceToCoordinate(a1.value);
      const yb0 = series.priceToCoordinate(b0.value);
      const yb1 = series.priceToCoordinate(b1.value);
      if (x0 == null || x1 == null || ya0 == null || ya1 == null || yb0 == null || yb1 == null) continue;
      ctx.fillStyle = a0.value + a1.value >= b0.value + b1.value ? opts.colorAAboveB : colorBAboveA;
      ctx.beginPath();
      ctx.moveTo(x0, ya0);
      ctx.lineTo(x1, ya1);
      ctx.lineTo(x1, yb1);
      ctx.lineTo(x0, yb0);
      ctx.closePath();
      ctx.fill();
    }
  });
}

/** A single ▲/▼ glyph at one anchor point -- the BUY/SELL entry/exit marker
 * klinecharts' "simpleAnnotation" overlay used to draw. */
export function createTradeMarkerPrimitive(opts: { point: DrawPoint; side: "BUY" | "SELL"; color?: string }): ISeriesPrimitive<Time> {
  const color = opts.color ?? "#8b8a9e";
  const glyph = opts.side === "BUY" ? "▲" : "▼";
  return makePrimitive((ctx, { series, chart }) => {
    const x = chart.timeScale().timeToCoordinate(opts.point.time as Time);
    const y = series.priceToCoordinate(opts.point.value);
    if (x == null || y == null) return;
    ctx.fillStyle = color;
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(glyph, x, y);
  });
}
