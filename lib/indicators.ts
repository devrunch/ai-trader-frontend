/**
 * Display names for the raw indicator payload.
 *
 * The signals service returns `dict(indicators)` straight from the computation,
 * keyed `rsi`, `macd_hist`, `supertrend_dir`, `ltp` … and the UI rendered
 * `Object.entries()` with the key uppercased. "SUPERTREND_DIR 1.00" is a
 * variable dump, not an indicator readout — and `supertrend_dir` is a ±1 flag
 * that was being printed to two decimal places.
 *
 * This is a whitelist, not an enumeration: an unrecognised key is dropped
 * rather than shown raw, so a new field added upstream cannot leak a variable
 * name into the interface.
 */

interface IndicatorSpec {
  label: string;
  /** Custom renderer; defaults to two decimal places. */
  format?: (v: number) => string;
}

const INDICATOR_SPECS: Record<string, IndicatorSpec> = {
  rsi:            { label: "RSI (14)" },
  macd:           { label: "MACD" },
  macd_signal:    { label: "MACD signal" },
  macd_hist:      { label: "MACD histogram" },
  ema20:          { label: "EMA 20" },
  ema50:          { label: "EMA 50" },
  ema200:         { label: "EMA 200" },
  // Real indicator names are kept — traders know them — but not variable names.
  adx:            { label: "Trend strength (ADX)" },
  atr:            { label: "Volatility (ATR)" },
  vwap:           { label: "VWAP" },
  ltp:            { label: "Price", format: v => v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
  supertrend_dir: { label: "SuperTrend", format: v => (v > 0 ? "bullish" : "bearish") },
};

export interface IndicatorReadout {
  key: string;
  label: string;
  value: string;
}

/** Ordered, labelled, human-readable readout. Unknown keys are omitted. */
export function formatIndicators(raw: Record<string, number> | undefined | null): IndicatorReadout[] {
  if (!raw) return [];
  const out: IndicatorReadout[] = [];
  for (const [key, spec] of Object.entries(INDICATOR_SPECS)) {
    const v = raw[key];
    if (typeof v !== "number" || !Number.isFinite(v)) continue;
    out.push({ key, label: spec.label, value: spec.format ? spec.format(v) : v.toFixed(2) });
  }
  return out;
}
