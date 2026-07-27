/**
 * Display names for the indicator dictionary the signal engine emits.
 *
 * Both the terminal and the signals page rendered the raw keys —
 * `supertrend_dir`, `macd_signal`, `ltp` — uppercased, as user-facing labels.
 * Those are Python variable names. Traders know what SuperTrend and MACD are;
 * they do not know what `_dir` means, and a screen full of snake_case reads as
 * a dev build rather than a product.
 *
 * Keys not listed here fall back to a readable form of themselves rather than
 * disappearing, so a new indicator is never silently dropped from the display.
 */
const LABELS: Record<string, string> = {
  ltp: "Price",
  rsi: "RSI (14)",
  macd: "MACD",
  macd_signal: "MACD signal",
  macd_hist: "MACD histogram",
  ema20: "EMA 20",
  ema50: "EMA 50",
  ema200: "EMA 200",
  sma20: "SMA 20",
  sma50: "SMA 50",
  adx: "Trend strength (ADX)",
  di_plus: "+DI",
  di_minus: "−DI",
  atr: "Volatility (ATR)",
  vwap: "VWAP",
  supertrend_dir: "SuperTrend",
  volume: "Volume",
  volume_avg20: "Volume, 20-bar avg",
  volume_ratio: "Volume vs average",
  bb_upper: "Bollinger upper",
  bb_mid: "Bollinger middle",
  bb_lower: "Bollinger lower",
  stoch_k: "Stochastic %K",
  stoch_d: "Stochastic %D",
  williams_r: "Williams %R",
  cci: "CCI",
  mfi: "Money Flow Index",
  obv: "On-Balance Volume",
  cmf: "Chaikin Money Flow",
  psar: "Parabolic SAR",
};

export function indicatorLabel(key: string): string {
  return LABELS[key] ?? key.replace(/_/g, " ");
}

/**
 * SuperTrend emits +1 / −1, which renders as a bare "1" or "-1" and means
 * nothing to a reader. Volume ratios read better as a multiple.
 */
export function indicatorValue(key: string, value: number): string {
  if (key === "supertrend_dir") return value === 1 ? "Bullish" : value === -1 ? "Bearish" : "—";
  if (key === "volume_ratio") return `${value}×`;
  if (key === "volume" || key === "volume_avg20") return value.toLocaleString("en-IN");
  return String(value);
}
