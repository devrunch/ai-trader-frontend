import type { ISeriesPrimitive, IPrimitivePaneView, Time, SeriesAttachedParameter } from "lightweight-charts";
import type { CanvasRenderingTarget2D } from "fancy-canvas";
import type { ApiOhlcBar } from "@/lib/api";
import { computeBreakoutProbability, bias, type BreakoutProbability } from "@/lib/indicators/breakout-probability";

/**
 * Breakout Probability, drawn as a ladder against the right edge.
 *
 * The levels answer "what might the NEXT bar do", so drawing them back across
 * a thousand bars of history says they applied then, which they did not. They
 * live in a narrow strip beside the price axis instead — where the eye already
 * goes for price — and the candles are left alone.
 *
 * Each row is a probability bar plus a whole number. The bar is the read: you
 * can see which side is favoured without parsing digits. Two decimals on a
 * frequency count implied a precision the sample does not have.
 *
 * The one exception drawn across the chart is the previous bar's own high and
 * low. Those are real price levels a trader wants to see against the history;
 * the levels stepped away from them are not.
 *
 * Native rather than a Pine source (like Volume Profile and VSA, and unlike
 * the other 49 built-ins) because the Pine sandbox forwards plots only -- its
 * lines, labels and linefills are dropped before they reach the chart, and an
 * unlabelled level is the one thing that makes this indicator pointless.
 *
 * `getBars` is called fresh on every draw rather than snapshotting once,
 * matching the other primitives here: the chart can zoom, pan, load more
 * history or tick between draws.
 *
 * Algorithm after Zeiierman's "Breakout Probability (Expo)" (CC BY-NC-SA 4.0),
 * written from what it computes rather than ported from the Pine source.
 */

const UP_COLOR = "#16c784";
const DOWN_COLOR = "#f0525d";
const LABEL_FONT = "11px ui-monospace, SFMono-Regular, Menlo, monospace";
const HEADER_FONT = "10px ui-monospace, SFMono-Regular, Menlo, monospace";

/** The ladder's footprint. Everything left of this is the trader's chart. */
const STRIP_WIDTH = 150;
const ROW_HEIGHT = 16;
/** Rows nearer than this would overprint, so the further level is dropped
 *  rather than nudged — a row shifted off its own price is a lie. */
const MIN_ROW_GAP = 17;
const TRACK_X = 8;
const TRACK_WIDTH = 56;
const TRACK_HEIGHT = 6;
/** A stub joining the row to the price it belongs to, drawn just left of the
 *  strip so nothing crosses the candles. */
const CONNECTOR = 7;

/** Levels are redrawn constantly; recomputing over thousands of bars on every
 *  frame is wasted work when only new bars change the answer. */
const CACHE_KEY_PRECISION = 4;

export interface BreakoutProbabilityOptions {
  /** Distance between levels, as a percentage of price. */
  stepPercent: number;
  /** How many levels to draw each side, 1-5. */
  levels: number;
  /** Hide levels with no sample behind them. */
  hideUntested: boolean;
  /** Draw the previous bar's own high and low across the chart. Those two are
   *  real price levels; the ones stepped away from them are projections and
   *  stay in the strip. */
  anchorLines: boolean;
}

export const DEFAULT_OPTIONS: BreakoutProbabilityOptions = {
  stepPercent: 1,
  levels: 5,
  hideUntested: true,
  anchorLines: true,
};

export interface BreakoutProbabilityHandle {
  primitive: ISeriesPrimitive<Time>;
  setVisible(visible: boolean): void;
  getVisible(): boolean;
  setOptions(options: Partial<BreakoutProbabilityOptions>): void;
  /** The current read, for a legend or a panel. Null before the first draw. */
  getResult(): BreakoutProbability | null;
}

function withAlpha(hex: string, alpha: number): string {
  const a = Math.round(alpha * 255).toString(16).padStart(2, "0");
  return hex + a;
}

/**
 * Is the chart dark? Read off its own background rather than guessed, so the
 * row backdrops stay readable in either theme without the primitive being
 * told which one is active.
 */
function isDark(param: SeriesAttachedParameter<Time>): boolean {
  try {
    const background = param.chart.options().layout?.background as
      | { color?: string; topColor?: string }
      | undefined;
    const colour = background?.color ?? background?.topColor;
    if (!colour) return true;
    const m = /^#?([0-9a-f]{6})$/i.exec(colour.trim().replace(/^#/, "#"));
    if (!m) return !/^(white|#fff)/i.test(colour);
    const n = parseInt(m[1], 16);
    // Rec. 601 luma, good enough to pick between two backdrop colours.
    const luma = 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
    return luma < 128;
  } catch {
    return true;
  }
}

function pill(ctx: CanvasRenderingContext2D, x: number, y: number,
              w: number, h: number, fill: string): void {
  ctx.fillStyle = fill;
  ctx.beginPath();
  // roundRect is not in every engine this bundle targets; a plain rect is a
  // fine fallback and nothing downstream depends on the corners.
  if (typeof ctx.roundRect === "function") ctx.roundRect(x, y, w, h, 3);
  else ctx.rect(x, y, w, h);
  ctx.fill();
}

export function createBreakoutProbabilityPrimitive(
  getBars: () => ApiOhlcBar[],
  initial: Partial<BreakoutProbabilityOptions> = {},
): BreakoutProbabilityHandle {
  let attached: SeriesAttachedParameter<Time> | null = null;
  let visible = true;
  let options: BreakoutProbabilityOptions = { ...DEFAULT_OPTIONS, ...initial };
  let cacheKey = "";
  let result: BreakoutProbability | null = null;

  function current(bars: ApiOhlcBar[]): BreakoutProbability | null {
    const last = bars[bars.length - 1];
    const key = last
      ? `${bars.length}:${last.time}:${last.close.toFixed(CACHE_KEY_PRECISION)}:${options.stepPercent}:${options.levels}`
      : "";
    if (key !== cacheKey) {
      cacheKey = key;
      result = computeBreakoutProbability(bars, options.stepPercent, options.levels);
    }
    return result;
  }

  function drawHeader(ctx: CanvasRenderingContext2D, read: BreakoutProbability,
                      stripLeft: number, right: number, backdrop: string,
                      muted: string): void {
    // Which conditional set these numbers come from IS the indicator. Without
    // it the ladder is a volatility measure wearing a percentage sign.
    const after = read.lastCandleGreen ? "after up bar" : "after down bar";
    const text = `${after} · n=${read.sample}`;
    pill(ctx, stripLeft, 6, STRIP_WIDTH, 15, backdrop);
    ctx.font = HEADER_FONT;
    ctx.fillStyle = muted;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(text, right - 8, 13.5);
  }

  function drawSide(
    ctx: CanvasRenderingContext2D,
    param: SeriesAttachedParameter<Time>,
    levels: BreakoutProbability["upper"],
    colour: string,
    stripLeft: number,
    right: number,
    height: number,
    taken: number[],
    backdrop: string,
  ): void {
    for (const level of levels) {
      // An untested level has no probability at all; drawing it unlabelled is
      // better than printing a 0% that reads as "impossible".
      if (options.hideUntested && level.probability === null) continue;
      const y = param.series.priceToCoordinate(level.price);
      if (y == null) continue;
      // Above the header or off the bottom: there is nowhere honest to put it.
      if (y < 30 || y > height - 10) continue;
      if (taken.some((other) => Math.abs(other - y) < MIN_ROW_GAP)) continue;
      taken.push(y);

      if (level.index === 0 && options.anchorLines) {
        // The previous bar's own high or low: a real level, so it earns a line
        // across the history. It stops at the strip rather than running under
        // the numbers.
        ctx.strokeStyle = withAlpha(colour, 0.55);
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(stripLeft - CONNECTOR, y);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      pill(ctx, stripLeft, y - ROW_HEIGHT / 2, STRIP_WIDTH, ROW_HEIGHT, backdrop);

      // Joins the row to the price it is about.
      ctx.strokeStyle = colour;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(stripLeft - CONNECTOR, y);
      ctx.lineTo(stripLeft + 2, y);
      ctx.stroke();

      const probability = level.probability ?? 0;
      const trackX = stripLeft + TRACK_X;
      const trackY = y - TRACK_HEIGHT / 2;
      ctx.fillStyle = withAlpha(colour, 0.2);
      ctx.fillRect(trackX, trackY, TRACK_WIDTH, TRACK_HEIGHT);
      ctx.fillStyle = colour;
      ctx.fillRect(trackX, trackY, TRACK_WIDTH * Math.min(probability, 100) / 100,
                   TRACK_HEIGHT);

      ctx.font = LABEL_FONT;
      ctx.fillStyle = colour;
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      // Whole numbers: two decimals on a frequency count implies a precision
      // the sample does not have.
      ctx.fillText(`${Math.round(probability)}%`, right - 8, y);
    }
  }

  const primitive: ISeriesPrimitive<Time> = {
    // Explicit requestUpdate on attach: LWC only repaints a primitive in
    // response to some other invalidation, so without this the levels do not
    // appear until the chart is panned or the mouse crosses it.
    attached(param) { attached = param; param.requestUpdate(); },
    detached() { attached = null; },
    paneViews(): readonly IPrimitivePaneView[] {
      return [{
        renderer() {
          return {
            draw(target: CanvasRenderingTarget2D) {
              target.useBitmapCoordinateSpace((scope) => {
                if (!attached || !visible) return;
                const read = current(getBars());
                if (!read) return;
                const ctx = scope.context;
                ctx.save();
                ctx.scale(scope.horizontalPixelRatio, scope.verticalPixelRatio);
                const right = scope.bitmapSize.width / scope.horizontalPixelRatio;
                const height = scope.bitmapSize.height / scope.verticalPixelRatio;
                const stripLeft = right - STRIP_WIDTH;
                const dark = isDark(attached);
                // Per row, not a full-height panel: a 150px column of scrim
                // would hide the candles this redesign exists to uncover.
                const backdrop = dark ? "rgba(13,17,23,0.72)" : "rgba(255,255,255,0.82)";
                const muted = dark ? "rgba(235,240,247,0.62)" : "rgba(20,24,31,0.58)";

                const taken: number[] = [];
                drawHeader(ctx, read, stripLeft, right, backdrop, muted);
                drawSide(ctx, attached, read.upper, UP_COLOR, stripLeft, right,
                         height, taken, backdrop);
                drawSide(ctx, attached, read.lower, DOWN_COLOR, stripLeft, right,
                         height, taken, backdrop);
                ctx.restore();
              });
            },
          };
        },
      }];
    },
  };

  return {
    primitive,
    setVisible(next: boolean) {
      visible = next;
      attached?.requestUpdate();
    },
    getVisible() { return visible; },
    setOptions(next: Partial<BreakoutProbabilityOptions>) {
      options = { ...options, ...next };
      cacheKey = "";          // force a recompute on the next draw
      attached?.requestUpdate();
    },
    getResult() { return result; },
  };
}

export { bias };
