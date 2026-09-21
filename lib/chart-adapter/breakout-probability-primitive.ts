import type { ISeriesPrimitive, IPrimitivePaneView, Time, SeriesAttachedParameter } from "lightweight-charts";
import type { CanvasRenderingTarget2D } from "fancy-canvas";
import type { ApiOhlcBar } from "@/lib/api";
import { computeBreakoutProbability, bias, type BreakoutProbability } from "@/lib/indicators/breakout-probability";

/**
 * Breakout Probability: ten levels either side of the last bar, each labelled
 * with how often this market has reached it from here.
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
  /** Shade the bands between levels. */
  fill: boolean;
}

export const DEFAULT_OPTIONS: BreakoutProbabilityOptions = {
  stepPercent: 1,
  levels: 5,
  hideUntested: true,
  fill: true,
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

  function drawSide(
    ctx: CanvasRenderingContext2D,
    param: SeriesAttachedParameter<Time>,
    levels: BreakoutProbability["upper"],
    color: string,
    right: number,
  ): void {
    const coords: number[] = [];
    for (const level of levels) {
      // An untested level has no probability at all; drawing it unlabelled is
      // better than printing a 0% that reads as "impossible".
      if (options.hideUntested && level.probability === null) continue;
      const y = param.series.priceToCoordinate(level.price);
      if (y == null) continue;
      coords.push(y);

      ctx.strokeStyle = color;
      ctx.lineWidth = level.index === 0 ? 1.5 : 1;
      ctx.setLineDash(level.index === 0 ? [] : [4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(right, y);
      ctx.stroke();

      if (level.probability !== null) {
        ctx.setLineDash([]);
        ctx.font = LABEL_FONT;
        ctx.fillStyle = color;
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        ctx.fillText(`${level.probability.toFixed(2)}%`, right - 8, y);
      }
    }

    if (!options.fill || coords.length < 2) return;
    ctx.setLineDash([]);
    for (let i = 1; i < coords.length; i++) {
      ctx.fillStyle = withAlpha(color, 0.06);
      ctx.fillRect(0, Math.min(coords[i - 1], coords[i]), right,
                   Math.abs(coords[i] - coords[i - 1]));
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
                drawSide(ctx, attached, read.upper, UP_COLOR, right);
                drawSide(ctx, attached, read.lower, DOWN_COLOR, right);
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
