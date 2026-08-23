export interface ChartPeriod {
  label: string;
  interval: string;
  days: number;
}

/** Every distinct candle interval PERIODS uses, ordered coarsest-to-finest
 *  is wrong for a min/max resolution picker -- TradingView's own Visibility
 *  tab reads "minimum resolution" as the finest (smallest) bar and "maximum"
 *  as the coarsest (largest), so this is ordered finest-first to match. This
 *  app has no free-form tick/second/custom-range resolution the way
 *  TradingView does -- these 5 are the only real intervals a chart here can
 *  ever be on, so a min/max picker built from anything else would offer
 *  options that don't correspond to a real chart state. */
export const INTERVALS = ["1m", "5m", "30m", "1h", "1d"] as const;
export type Interval = (typeof INTERVALS)[number];

/** TradingView's Visibility tab: an indicator is visible only while the
 *  chart's current interval falls within its saved [min, max] bound.
 *  Either bound absent means "no limit on that side". An interval not in
 *  INTERVALS (shouldn't happen -- PERIODS only ever produces these 5) fails
 *  open rather than hiding something the range can't evaluate. */
export function withinVisibilityRange(interval: string, visibility?: { minInterval?: string; maxInterval?: string }): boolean {
  if (!visibility) return true;
  const idx = INTERVALS.indexOf(interval as Interval);
  if (idx === -1) return true;
  if (visibility.minInterval) {
    const minIdx = INTERVALS.indexOf(visibility.minInterval as Interval);
    if (minIdx !== -1 && idx < minIdx) return false;
  }
  if (visibility.maxInterval) {
    const maxIdx = INTERVALS.indexOf(visibility.maxInterval as Interval);
    if (maxIdx !== -1 && idx > maxIdx) return false;
  }
  return true;
}

export const PERIODS: ChartPeriod[] = [
  // A separate "1m" period used to sit here (2 days of 1m bars) from before
  // 1D itself was 1-minute -- once 1D became "1m" too (below), it was showing
  // the exact same candle granularity as 1D, just over a narrower window.
  // Removed as a redundant duplicate rather than kept as a second way to see
  // the same thing.
  //
  // 5, not 1: a weekend or a short holiday means "1 day back" can land on a
  // window with no session at all, and the chart has nothing to show. This
  // still reads as "1D" — it just reliably reaches the most recent real
  // session instead of sometimes finding a gap.
  { label: "1D",  interval: "1m",  days: 5    },
  { label: "1W",  interval: "5m",  days: 7    },
  { label: "1M",  interval: "30m", days: 30   },
  { label: "3M",  interval: "1h",  days: 90   },
  // 6M+ stay daily: Kite has no native 2h/5-day/monthly candle, and daily
  // bars are what every other platform shows at this zoom anyway (6 months
  // of 1h bars is ~800 candles for no real gain over ~130 daily ones).
  { label: "6M",  interval: "1d",  days: 180  },
  { label: "1Y",  interval: "1d",  days: 365  },
  { label: "3Y",  interval: "1d",  days: 1095 },
  { label: "5Y",  interval: "1d",  days: 1825 },
  { label: "All", interval: "1d",  days: 3650 },
];
