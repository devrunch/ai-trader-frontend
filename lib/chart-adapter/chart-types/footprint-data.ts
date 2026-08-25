import type { ApiOhlcBar, ApiTick } from "@/lib/api";

/** Real ECN ticks only ever cover FOREX/metals (Dukascopy) and only a
 *  bounded window (the backend's own MAX_TICKS_WINDOW_SECONDS) -- Volume
 *  Footprint and TPO share this exact fetch-and-bucket lifecycle, just
 *  aggregate the bucketed ticks differently once they have them (buy/sell
 *  volume per price level vs. time-period presence per price level). */
export const MAX_FETCH_WINDOW_SECONDS = 4 * 60 * 60;
/** Re-fetch at most this often while panning/zooming -- a real Dukascopy
 *  pull spawns a subprocess (see dukascopy_bridge.py), so a fetch on every
 *  intermediate pixel of a drag would be real, avoidable load. */
export const FETCH_DEBOUNCE_MS = 500;

export interface PriceLevelCounts { buy: number; sell: number }

/** One bar's own ticks, bucketed into price levels across its high-low
 *  range. `bucketSize` is per-bar (a wide bar gets coarser buckets than a
 *  tight one) -- real footprint charts do the same, since a single global
 *  bucket size would be meaninglessly fine for a quiet bar and meaninglessly
 *  coarse for a volatile one. */
export interface BarFootprint {
  low: number;
  bucketSize: number;
  levels: Map<number, PriceLevelCounts>; // key: bucket index (0-based from `low`)
}

const PRICE_BUCKETS_PER_BAR = 10;

/** Buckets real ticks per bar (by real time, using each bar's own
 *  high/low), and per price level within that bar. `buy`/`sell` are an
 *  uptick/downtick proxy for trade side -- the standard stand-in when the
 *  feed carries quote ticks (bid/ask mid, see getTicks' own docs) rather
 *  than a trade tape with a real aggressor flag, same convention this
 *  app's tick-COUNT volume already accepted for "no real trade data on a
 *  spot/CFD feed." */
export function bucketTicksByBar(bars: ApiOhlcBar[], ticks: ApiTick[]): Map<number, BarFootprint> {
  const result = new Map<number, BarFootprint>();
  if (bars.length === 0 || ticks.length === 0) return result;

  const starts = bars.map((b) => b.time);
  let lastPrice: number | null = null;

  for (const tick of ticks) {
    const tSec = tick.t / 1000;
    // Last bar whose start is <= tSec -- the bar this tick belongs to.
    let idx = -1;
    for (let i = starts.length - 1; i >= 0; i--) { if (starts[i] <= tSec) { idx = i; break; } }
    if (idx === -1) { lastPrice = tick.p; continue; }
    const bar = bars[idx];

    let fp = result.get(bar.time);
    if (!fp) {
      const bucketSize = (bar.high - bar.low) / PRICE_BUCKETS_PER_BAR || Math.max(bar.close, 1) * 0.0001;
      fp = { low: bar.low, bucketSize, levels: new Map() };
      result.set(bar.time, fp);
    }
    const level = Math.min(PRICE_BUCKETS_PER_BAR - 1, Math.max(0, Math.floor((tick.p - fp.low) / fp.bucketSize)));
    const counts = fp.levels.get(level) ?? { buy: 0, sell: 0 };
    if (lastPrice !== null && tick.p > lastPrice) counts.buy += 1;
    else if (lastPrice !== null && tick.p < lastPrice) counts.sell += 1;
    else if (lastPrice === null) counts.buy += 1; // this bar's first tick -- no prior tick to compare, arbitrary side
    fp.levels.set(level, counts);
    lastPrice = tick.p;
  }
  return result;
}

/** Clamps a possibly-too-wide visible range to the backend's own bound,
 *  keeping the MOST RECENT part -- a user zoomed out past what tick data
 *  can cover still gets a real footprint for the bars closest to now,
 *  rather than the fetch being rejected outright. */
export function clampFetchWindow(fromSec: number, toSec: number): { since: number; until: number } {
  const since = Math.max(fromSec, toSec - MAX_FETCH_WINDOW_SECONDS);
  return { since: Math.floor(since), until: Math.ceil(toSec) };
}
