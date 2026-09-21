import type { ApiOhlcBar } from "@/lib/api";

/**
 * Breakout probability: given the colour of the previous candle, how often has
 * this market gone on to exceed that candle's high (or low) by a given
 * percentage?
 *
 * The question it answers is conditional, which is what makes it more than a
 * volatility measure: "the last candle was green -- historically, how often
 * does the next one take out its high by 1%?" Counts run over the whole loaded
 * history, so the numbers are this instrument on this timeframe, not a rule of
 * thumb.
 *
 * Implemented natively rather than as a Pine source like the other 49
 * built-ins, for the same reason Volume Profile and VSA are: its output is ten
 * price levels each carrying a *label*, and the Pine sandbox forwards plots
 * only -- its drawing primitives (lines, labels, linefills, tables) are
 * dropped before they reach the chart. A plot-only version would draw ten
 * unlabelled lines, which is the one thing that makes this indicator useless.
 *
 * Algorithm after Zeiierman's "Breakout Probability (Expo)" (CC BY-NC-SA 4.0).
 * Written from the description of what it computes, not ported from the Pine.
 */

/** Levels either side, including the previous high/low itself at index 0. */
export const MAX_LEVELS = 5;

export interface LevelProbability {
  /** 0 is the previous bar's own high/low; 1..4 step away from it. */
  index: number;
  /** Price of this level on the latest bar. */
  price: number;
  /**
   * Share of past bars, in the same previous-candle colour as now, that
   * reached this level. Null when there is no sample to divide by -- an
   * unlabelled level is better than a fabricated 0%.
   */
  probability: number | null;
}

export interface BreakoutProbability {
  /** Levels above the previous high, nearest first. */
  upper: LevelProbability[];
  /** Levels below the previous low, nearest first. */
  lower: LevelProbability[];
  /** Whether the bar preceding the latest one closed up. Drives which
   *  conditional set of counts is shown. */
  lastCandleGreen: boolean;
  /** How many past bars fed the side being shown. */
  sample: number;
}

interface Counts {
  green: number;
  red: number;
  greenHigh: number[];
  greenLow: number[];
  redHigh: number[];
  redLow: number[];
}

function emptyCounts(levels: number): Counts {
  return {
    green: 0,
    red: 0,
    greenHigh: new Array(levels).fill(0),
    greenLow: new Array(levels).fill(0),
    redHigh: new Array(levels).fill(0),
    redLow: new Array(levels).fill(0),
  };
}

function ratio(hits: number, total: number): number | null {
  // No sample is not the same as never happening. A 0% label on a level that
  // has simply never been tested reads as "this cannot happen".
  if (total <= 0) return null;
  return Math.round((hits / total) * 10000) / 100;
}

/**
 * Walk the history once, counting how often each level was reached.
 *
 * Bar i is judged against bar i-1's high/low, and attributed to the colour of
 * bar i-1 -- so the counts answer "after a green candle, what happened next",
 * which is the conditional the indicator is built on.
 *
 * `stepPercent` is measured against each bar's own close, so a level is the
 * same *relative* distance throughout the history rather than a fixed price
 * offset that would mean something different at 1,800 than at 4,300.
 */
export function computeBreakoutProbability(
  bars: ApiOhlcBar[],
  stepPercent = 1,
  levels = MAX_LEVELS,
): BreakoutProbability | null {
  if (bars.length < 3 || levels < 1) return null;

  const counts = emptyCounts(levels);

  for (let i = 1; i < bars.length; i++) {
    const prev = bars[i - 1];
    const bar = bars[i];
    const green = prev.close > prev.open;
    const red = prev.close < prev.open;
    // A doji is neither, and counting it as one side would quietly bias every
    // number on the chart.
    if (!green && !red) continue;

    if (green) counts.green += 1;
    else counts.red += 1;

    const step = (bar.close * stepPercent) / 100;
    for (let level = 0; level < levels; level++) {
      const offset = step * level;
      const reachedHigh = bar.high >= prev.high + offset;
      const reachedLow = bar.low <= prev.low - offset;
      if (green) {
        if (reachedHigh) counts.greenHigh[level] += 1;
        if (reachedLow) counts.greenLow[level] += 1;
      } else {
        if (reachedHigh) counts.redHigh[level] += 1;
        if (reachedLow) counts.redLow[level] += 1;
      }
    }
  }

  const last = bars[bars.length - 1];
  const lastGreen = last.close > last.open;
  // The levels drawn are anchored to the most recent completed bar, which is
  // the one the next bar will be measured against.
  const step = (last.close * stepPercent) / 100;
  const total = lastGreen ? counts.green : counts.red;
  const highHits = lastGreen ? counts.greenHigh : counts.redHigh;
  const lowHits = lastGreen ? counts.greenLow : counts.redLow;

  const upper: LevelProbability[] = [];
  const lower: LevelProbability[] = [];
  for (let level = 0; level < levels; level++) {
    upper.push({
      index: level,
      price: last.high + step * level,
      probability: ratio(highHits[level], total),
    });
    lower.push({
      index: level,
      price: last.low - step * level,
      probability: ratio(lowHits[level], total),
    });
  }

  return { upper, lower, lastCandleGreen: lastGreen, sample: total };
}

/**
 * Which side history favours, and by how much, for the nearest level.
 *
 * Null when the two sides are within a point of each other: calling a 50.4 /
 * 49.6 split "bullish" is noise dressed as a read.
 */
export function bias(result: BreakoutProbability): { direction: "up" | "down"; edge: number } | null {
  const up = result.upper[0]?.probability;
  const down = result.lower[0]?.probability;
  if (up == null || down == null) return null;
  const edge = Math.abs(up - down);
  if (edge < 1) return null;
  return { direction: up > down ? "up" : "down", edge: Math.round(edge * 100) / 100 };
}
