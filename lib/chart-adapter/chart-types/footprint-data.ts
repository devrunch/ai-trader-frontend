import type { SeriesAttachedParameter, Time } from "lightweight-charts";
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

  // The buy/sell classification below compares each tick to the ONE
  // immediately before it, and the bar lookup walks a single forward
  // pointer -- both assume ascending time. The backend contract never
  // actually guarantees that ordering, so it's enforced here rather than
  // trusted: an out-of-order tick would otherwise both misclassify
  // buy/sell (compared against the wrong "previous" price) and break the
  // forward pointer, which can only ever advance.
  const sorted = [...ticks].sort((a, b) => a.t - b.t);

  let barIdx = 0;
  let lastPrice: number | null = null;

  for (const tick of sorted) {
    const tSec = tick.t / 1000;
    // Both `bars` and `sorted` are ascending, so the bar owning this tick
    // can never be earlier than the one that owned the previous tick --
    // advance forward only. O(ticks + bars) total, not the O(ticks x bars)
    // a fresh backward scan per tick would cost.
    while (barIdx + 1 < bars.length && bars[barIdx + 1].time <= tSec) barIdx++;
    if (bars[barIdx].time > tSec) { lastPrice = tick.p; continue; } // before the first bar entirely
    const bar = bars[barIdx];

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

/** Shared attach/detach/debounce/re-fetch lifecycle for Volume Footprint's
 *  and TPO's own primitives -- the two chart types that asynchronously
 *  re-fetch real ticks as the visible range changes, rather than working
 *  off the bars already loaded like every other renderer. Only the fetch
 *  orchestration is shared; each caller still owns its own aggregation
 *  (`onTicks`) and its own canvas drawing.
 *
 *  A `requestId` guards against a slower, older fetch landing AFTER a newer
 *  one and silently overwriting fresher data with stale data -- e.g. the
 *  user pans left then quickly right; if the (now-abandoned) left window's
 *  fetch takes longer than the right window's, its `.then` used to run
 *  last and clobber the correct, current result. Only the response whose
 *  request is still the latest one issued is ever applied. */
export function createTickFetchLifecycle(
  fetchTicks: ((sinceSec: number, untilSec: number) => Promise<ApiTick[] | null>) | undefined,
  onTicks: (ticks: ApiTick[]) => void,
): {
  attached: (param: SeriesAttachedParameter<Time>) => void;
  detached: () => void;
  getAttached: () => SeriesAttachedParameter<Time> | null;
} {
  let attachedParam: SeriesAttachedParameter<Time> | null = null;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let unsubscribe: (() => void) | null = null;
  let requestId = 0;

  function refetch() {
    if (!fetchTicks || !attachedParam) return;
    const visible = attachedParam.chart.timeScale().getVisibleRange();
    if (!visible) return;
    const { since, until } = clampFetchWindow(visible.from as unknown as number, visible.to as unknown as number);
    const thisRequest = ++requestId;
    fetchTicks(since, until).then((ticks) => {
      // A later refetch may already have started (or finished) since this
      // one was issued -- `thisRequest !== requestId` means it has, so this
      // response is stale and must not overwrite whatever the newer one
      // already applied (or will apply).
      if (!attachedParam || !ticks || thisRequest !== requestId) return;
      onTicks(ticks);
      attachedParam.requestUpdate();
    });
  }

  function scheduleRefetch() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(refetch, FETCH_DEBOUNCE_MS);
  }

  return {
    attached(param) {
      attachedParam = param;
      const handler = () => scheduleRefetch();
      param.chart.timeScale().subscribeVisibleTimeRangeChange(handler);
      unsubscribe = () => param.chart.timeScale().unsubscribeVisibleTimeRangeChange(handler);
      refetch();
    },
    detached() {
      unsubscribe?.();
      unsubscribe = null;
      if (debounceTimer) clearTimeout(debounceTimer);
      attachedParam = null;
    },
    getAttached: () => attachedParam,
  };
}
