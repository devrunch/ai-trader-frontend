import type { ApiOhlcBar } from "@/lib/api/market";

/** Which of a wider re-fetch's bars are genuinely older than what's already
 *  on the chart -- the filter behind handleLoadMore's pan-back-for-more-
 *  history path (terminal/page.tsx).
 *
 *  `oldestLoadedTime` and every bar's `time` are both Unix SECONDS: the
 *  chart adapter's pan-back callback hands the oldest loaded bar's own
 *  `.time` straight through, unconverted (lightweight-charts-adapter.ts's
 *  loadMore(), confirmed by its own test asserting a seconds-scale value
 *  like 1767000900, not a milliseconds one). The parameter used to be
 *  named/treated as milliseconds here, multiplying bar.time by 1000 before
 *  comparing -- which compares a ~13-digit number against a ~10-digit one
 *  and is never true. That silently returned zero bars on every pan-back
 *  attempt, which the adapter reads as "nothing further back exists" --
 *  "infinite history" looked broken on every exchange because the bug was
 *  in this comparison, not in any exchange-specific data path. */
export function olderBars(bars: ApiOhlcBar[], oldestLoadedTime: number): ApiOhlcBar[] {
  return bars.filter((bar) => bar.time < oldestLoadedTime);
}
