export interface ChartPeriod {
  label: string;
  interval: string;
  days: number;
}

export const PERIODS: ChartPeriod[] = [
  { label: "1D",  interval: "5m",  days: 1    },
  { label: "1W",  interval: "15m", days: 7    },
  { label: "1M",  interval: "1h",  days: 30   },
  { label: "3M",  interval: "1d",  days: 90   },
  { label: "6M",  interval: "1d",  days: 180  },
  { label: "1Y",  interval: "1d",  days: 365  },
  { label: "3Y",  interval: "1d",  days: 1095 },
  { label: "5Y",  interval: "1d",  days: 1825 },
  { label: "All", interval: "1d",  days: 3650 },
];
