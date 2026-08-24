import type { ApiOhlcBar } from "@/lib/api/market";

/** Groups consecutive `bars` (already sorted oldest-first, at native
 *  resolution) into candles of `bucketSize` native bars each.
 *
 *  `guardSessionBoundary` forces a new bucket at the start of a new trading
 *  day even if the current one is short -- otherwise an N-minute custom
 *  candle could straddle the overnight/weekend gap between sessions and mix
 *  two unrelated sessions' prices into one bar. Daily-bar bucketing (week
 *  customs) has no such gap to guard: each 1d bar is already one whole
 *  session, so bucketing 5 of them is just "5 sessions," never a splice. */
export function aggregateBars(bars: ApiOhlcBar[], bucketSize: number, guardSessionBoundary: boolean): ApiOhlcBar[] {
  if (bucketSize <= 1) return bars;

  const out: ApiOhlcBar[] = [];
  let chunk: ApiOhlcBar[] = [];

  for (const bar of bars) {
    const crossedIntoNewDay = guardSessionBoundary && chunk.length > 0 && dayOf(chunk[0].time) !== dayOf(bar.time);
    if (chunk.length >= bucketSize || crossedIntoNewDay) {
      out.push(mergeChunk(chunk));
      chunk = [];
    }
    chunk.push(bar);
  }
  if (chunk.length > 0) out.push(mergeChunk(chunk));
  return out;
}

function dayOf(epochSeconds: number): string {
  return new Date(epochSeconds * 1000).toDateString();
}

function mergeChunk(chunk: ApiOhlcBar[]): ApiOhlcBar {
  return {
    time: chunk[0].time,
    open: chunk[0].open,
    high: Math.max(...chunk.map((b) => b.high)),
    low: Math.min(...chunk.map((b) => b.low)),
    close: chunk[chunk.length - 1].close,
    volume: chunk.reduce((sum, b) => sum + (b.volume ?? 0), 0),
  };
}
