import type { IChartApi } from "lightweight-charts";
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

/** Every renderer that needs the full bar history live (a custom primitive
 *  reading `getBars()` on every draw, or a synthetic-axis type recomputing
 *  its whole sequence on every tick) keeps its own rolling mirror of
 *  `this.bars`, updated the same way the adapter's own pushLiveTick updates
 *  its copy: an in-place edit of the still-forming (last) bar shares its
 *  time with what's already there, a genuinely new bar doesn't. Shared here
 *  because 9 renderer files had this exact 5-line block copy-pasted --
 *  any future correction to the merge rule needed the same edit in all 9. */
export function appendOrReplaceBar(bars: ApiOhlcBar[], bar: ApiOhlcBar): ApiOhlcBar[] {
  return bars.length > 0 && bars[bars.length - 1].time === bar.time
    ? [...bars.slice(0, -1), bar]
    : [...bars, bar];
}

/** Autoscale-only helper for a renderer whose anchor series doesn't plot
 *  its own true price extent -- HLC Area's anchor plots just the close
 *  line (the real high/low band is drawn by a primitive on top), High-Low
 *  plots an invisible midpoint (the real high-low line is drawn by a
 *  primitive too). Both need LWC's own autoscale widened to the real
 *  high/low range of whatever's visible, or the primitive's own drawing
 *  gets clipped by a price scale sized to the anchor's narrower data.
 *  Falls back to the full loaded range when nothing is visible yet, or
 *  the chart hasn't laid one out. */
export function visibleRangeAutoscaleInfo(chart: IChartApi, getBars: () => ApiOhlcBar[]) {
  return () => {
    const bars = getBars();
    if (bars.length === 0) return null;
    const visible = chart.timeScale().getVisibleRange();
    const from = visible ? (visible.from as unknown as number) : -Infinity;
    const to = visible ? (visible.to as unknown as number) : Infinity;
    let lo = Infinity, hi = -Infinity, any = false;
    for (const b of bars) {
      if (b.time < from || b.time > to) continue;
      any = true;
      if (b.low < lo) lo = b.low;
      if (b.high > hi) hi = b.high;
    }
    if (!any) { for (const b of bars) { if (b.low < lo) lo = b.low; if (b.high > hi) hi = b.high; } }
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) return null;
    return { priceRange: { minValue: lo, maxValue: hi } };
  };
}
