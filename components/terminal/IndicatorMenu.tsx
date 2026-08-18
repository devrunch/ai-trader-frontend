import { DIASCRIPT_CATALOG, type IndicatorCategory } from "@/lib/diascript-indicators";

/**
 * The full indicator catalog — every native klinecharts built-in plus every
 * diascript-authored indicator, searchable/filterable by IndicatorSearchModal.
 * Whether an indicator draws on the price pane or its own pane below is a
 * SEPARATE concern (CandlestickChart.tsx's MAIN_PANE_INDICATORS) — `category`
 * here is about searchability/grouping in the UI, not pane placement, so a
 * category can span both (e.g. "Trend" has both ADX, an oscillator, and
 * Keltner Channels, a price overlay).
 */
export const INDICATOR_CATALOG: {
  name: string;
  label: string;
  category: IndicatorCategory;
}[] = [
  { name: "EMA",  label: "EMA (20, 50)",       category: "Overlays" },
  { name: "MA",   label: "Moving Average",     category: "Overlays" },
  { name: "BOLL", label: "Bollinger Bands",    category: "Volatility" },
  { name: "SAR",  label: "Parabolic SAR",      category: "Trend" },
  { name: "BBI",  label: "BBI",                category: "Trend" },
  { name: "VOL",  label: "Volume",             category: "Volume" },
  { name: "MACD", label: "MACD",               category: "Momentum" },
  { name: "RSI",  label: "RSI (14)",           category: "Momentum" },
  { name: "KDJ",  label: "Stochastic (KDJ)",   category: "Momentum" },
  // Every diascript-authored indicator (2 proof-of-concept + 35 from the
  // Trend/Momentum/Volatility/Volume expansion) folds in from the same
  // catalog that registers them with klinecharts — one source of truth.
  ...DIASCRIPT_CATALOG.map((d) => ({ name: d.name, label: d.label, category: d.category })),
];

