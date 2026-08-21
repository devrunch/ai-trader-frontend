export interface ChartPeriod {
  label: string;
  interval: string;
  days: number;
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
