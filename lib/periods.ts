export interface ChartPeriod {
  label: string;
  interval: string;
  days: number;
}

export const PERIODS: ChartPeriod[] = [
  // 5, not 1: a weekend or a short holiday means "1 day back" can land on a
  // window with no session at all, and the chart has nothing to show. This
  // still reads as "1D" — it just reliably reaches the most recent real
  // session instead of sometimes finding a gap.
  { label: "1D",  interval: "5m",  days: 5    },
  { label: "1W",  interval: "15m", days: 7    },
  { label: "1M",  interval: "1h",  days: 30   },
  { label: "3M",  interval: "1d",  days: 90   },
  { label: "6M",  interval: "1d",  days: 180  },
  { label: "1Y",  interval: "1d",  days: 365  },
  { label: "3Y",  interval: "1d",  days: 1095 },
  { label: "5Y",  interval: "1d",  days: 1825 },
  { label: "All", interval: "1d",  days: 3650 },
];
