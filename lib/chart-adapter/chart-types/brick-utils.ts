import type { ApiOhlcBar } from "@/lib/api";

/** One rendered brick/box/line-segment for the non-time-indexed family
 *  (Renko, Range, Line Break) -- shaped like a candle so it can go straight
 *  through CandlestickSeries, but `time` is the REAL timestamp of whichever
 *  source bar completed it, not an evenly-spaced period the way a normal
 *  candle's time is. Multiple bricks routinely share one source bar's real
 *  time (one big tick can cross several brick boundaries at once) -- see
 *  strictlyIncreasingTime for why that can't reach the chart as-is. */
export interface Brick { time: number; open: number; high: number; low: number; close: number }

/** LWC requires strictly ascending time values; this family's bricks don't
 *  naturally have one, since several can complete from the same real bar.
 *  Nudging a repeated (or non-increasing) timestamp forward by whole
 *  seconds keeps real chronological order -- earlier source bar's bricks
 *  still sort before a later one's -- while guaranteeing distinctness. The
 *  cost is an axis that reads "irregular" rather than evenly spaced, which
 *  is the real, expected look of these chart types (TradingView's own Renko
 *  axis isn't evenly spaced either -- brick count per real time unit varies
 *  with how fast price moves). */
export function strictlyIncreasingTime(bricks: Brick[]): Brick[] {
  let lastTime = -Infinity;
  return bricks.map((b) => {
    const time = b.time > lastTime ? b.time : lastTime + 1;
    lastTime = time;
    return time === b.time ? b : { ...b, time };
  });
}

/** No brick-size input exists yet (no settings panel wired for this chart-
 *  type family) -- this is the same role klinecharts' bar-count-based
 *  auto-zoom already played before period pills existed in this app:  a
 *  reasonable default, not a tunable. ~`divisions` bricks/boxes across the
 *  whole loaded range is what most charting libraries default to absent an
 *  explicit size. */
export function defaultBoxSize(bars: ApiOhlcBar[], divisions = 40): number {
  if (bars.length === 0) return 1;
  let lo = Infinity, hi = -Infinity;
  for (const b of bars) { if (b.low < lo) lo = b.low; if (b.high > hi) hi = b.high; }
  const span = hi - lo;
  return span > 0 ? span / divisions : Math.max(lo, 1) * 0.01;
}
