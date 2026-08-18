import { InMemoryDataAdapter } from "diascript";
// NOT a static top-level import: "diascript/klinecharts" transitively pulls
// in the real klinecharts package, which touches `window` at import time.
// IndicatorMenu.tsx imports DIASCRIPT_CATALOG from this file at module
// scope (for the search modal's catalog data), and IndicatorMenu.tsx is
// reachable from terminal/page.tsx's server-rendered tree -- a static
// import here would crash Next's SSR prerender with "window is not
// defined". Loaded lazily inside registerDiascriptIndicators() instead,
// which only ever runs client-side inside CandlestickChart's useEffect.

/**
 * Indicators defined as diascript formulas instead of klinecharts' own
 * built-in catalog. A data-driven catalog rather than one hand-named export
 * per indicator — at 40+ entries that stopped scaling.
 *
 * None of these reference series(), session.is_open(), or symbol.exchange()
 * that need real cross-symbol/session data, so a real DataAdapter isn't
 * needed — an InMemoryDataAdapter with nothing registered is enough, since
 * it's never actually called (VWAP uses session.is_open(), which degrades
 * to `true` without a real getSymbolMeta, per diascript's own design).
 */
export const noopAdapter = new InMemoryDataAdapter();

export type IndicatorCategory = "Overlays" | "Trend" | "Momentum" | "Volatility" | "Volume";

export interface DiascriptIndicatorDef {
  /** The klinecharts-facing indicator name, e.g. "DIA_EMA20". */
  name: string;
  label: string;
  category: IndicatorCategory;
  /** The diascript formula text (may define multiple formulas; only outputName is rendered). */
  source: string;
  /** Which wrapped formula in `source` this entry renders. */
  outputName: string;
}

const ADX_PREAMBLE = `
bar_count = prev(1) + 1
has_prior = bar_count > 1
prior_high = held(has_prior, ref(high, 1))
prior_low = held(has_prior, ref(low, 1))
up_move = has_prior * (high - prior_high)
down_move = has_prior * (prior_low - low)
plus_dm_raw = max(up_move, 0) * (up_move > down_move)
minus_dm_raw = max(down_move, 0) * (down_move > up_move)
tr_smooth = prev(1) * (13/14) + true_range() / 14
plus_dm_smooth = prev(1) * (13/14) + plus_dm_raw / 14
minus_dm_smooth = prev(1) * (13/14) + minus_dm_raw / 14
plus_di = 100 * plus_dm_smooth / tr_smooth
minus_di = 100 * minus_dm_smooth / tr_smooth
di_sum = plus_di + minus_di
safe_di_sum = di_sum + (di_sum == 0)
dx = 100 * abs(plus_di - minus_di) / safe_di_sum
adx_line = prev(1) * (13/14) + dx / 14
`;

const SUPERTREND_PREAMBLE = `
hl2 = (high + low) / 2
atr_st = prev(1) * (9/10) + true_range() / 10
basic_upper = hl2 + 3 * atr_st
basic_lower = hl2 - 3 * atr_st
final_upper = ((basic_upper < prev(1)) or (ref(close,1) > prev(1))) * basic_upper + (1 - ((basic_upper < prev(1)) or (ref(close,1) > prev(1)))) * prev(1)
final_lower = ((basic_lower > prev(1)) or (ref(close,1) < prev(1))) * basic_lower + (1 - ((basic_lower > prev(1)) or (ref(close,1) < prev(1)))) * prev(1)
flip_up = close > final_upper
flip_down = close < final_lower
any_flip = flip_up or flip_down
new_direction = flip_up * 1 + (1 - flip_up) * 0
is_uptrend = held(any_flip, new_direction)
`;

export const DIASCRIPT_CATALOG: DiascriptIndicatorDef[] = [
  {
    name: "DIA_EMA20", label: "EMA 20 (diascript)", category: "Overlays",
    source: "ema_line = line(ema(close, 20))", outputName: "ema_line",
  },
  {
    name: "DIA_RSI14", label: "RSI 14 (diascript)", category: "Momentum",
    source: "rsi_line = line(rsi(close, 14))", outputName: "rsi_line",
  },

  // -- Trend --------------------------------------------------------------
  {
    name: "DIA_ADX", label: "ADX (14)", category: "Trend",
    source: ADX_PREAMBLE + "result = line(adx_line)", outputName: "result",
  },
  {
    name: "DIA_DI_PLUS", label: "+DI (14)", category: "Trend",
    source: ADX_PREAMBLE + "result = line(plus_di)", outputName: "result",
  },
  {
    name: "DIA_DI_MINUS", label: "-DI (14)", category: "Trend",
    source: ADX_PREAMBLE + "result = line(minus_di)", outputName: "result",
  },
  {
    name: "DIA_AROON_UP", label: "Aroon Up (14)", category: "Trend",
    source: "aroon_up = line(100 * (14 - highestbars(high, 15)) / 14)", outputName: "aroon_up",
  },
  {
    name: "DIA_AROON_DOWN", label: "Aroon Down (14)", category: "Trend",
    source: "aroon_down = line(100 * (14 - lowestbars(low, 15)) / 14)", outputName: "aroon_down",
  },
  {
    name: "DIA_DONCHIAN_UPPER", label: "Donchian Upper (20)", category: "Trend",
    source: "dc_upper = line(highest(high, 20))", outputName: "dc_upper",
  },
  {
    name: "DIA_DONCHIAN_MID", label: "Donchian Mid (20)", category: "Trend",
    source: "dc_mid = line((highest(high, 20) + lowest(low, 20)) / 2)", outputName: "dc_mid",
  },
  {
    name: "DIA_DONCHIAN_LOWER", label: "Donchian Lower (20)", category: "Trend",
    source: "dc_lower = line(lowest(low, 20))", outputName: "dc_lower",
  },
  {
    name: "DIA_ENVELOPE_UPPER", label: "Envelope Upper (2.5%)", category: "Trend",
    source: "env_upper = line(sma(close, 20) * 1.025)", outputName: "env_upper",
  },
  {
    name: "DIA_ENVELOPE_LOWER", label: "Envelope Lower (2.5%)", category: "Trend",
    source: "env_lower = line(sma(close, 20) * 0.975)", outputName: "env_lower",
  },
  {
    name: "DIA_ICHIMOKU_TENKAN", label: "Ichimoku Tenkan-sen", category: "Trend",
    source: "tenkan = line((highest(high, 9) + lowest(low, 9)) / 2)", outputName: "tenkan",
  },
  {
    name: "DIA_ICHIMOKU_KIJUN", label: "Ichimoku Kijun-sen", category: "Trend",
    source: "kijun = line((highest(high, 26) + lowest(low, 26)) / 2)", outputName: "kijun",
  },
  {
    name: "DIA_ICHIMOKU_SENKOU_A", label: "Ichimoku Senkou A (no forward shift)", category: "Trend",
    source:
      "tenkan = (highest(high, 9) + lowest(low, 9)) / 2\n" +
      "kijun = (highest(high, 26) + lowest(low, 26)) / 2\n" +
      "senkou_a = line((tenkan + kijun) / 2)",
    outputName: "senkou_a",
  },
  {
    name: "DIA_ICHIMOKU_SENKOU_B", label: "Ichimoku Senkou B (no forward shift)", category: "Trend",
    source: "senkou_b = line((highest(high, 52) + lowest(low, 52)) / 2)", outputName: "senkou_b",
  },
  {
    name: "DIA_KELTNER_UPPER", label: "Keltner Upper (20, 2)", category: "Trend",
    source:
      "kc_mid = ema(close, 20)\nkc_range = ema(true_range(), 20)\n" +
      "kc_upper = line(kc_mid + 2 * kc_range)",
    outputName: "kc_upper",
  },
  {
    name: "DIA_KELTNER_MID", label: "Keltner Mid (20)", category: "Trend",
    source: "kc_mid = line(ema(close, 20))", outputName: "kc_mid",
  },
  {
    name: "DIA_KELTNER_LOWER", label: "Keltner Lower (20, 2)", category: "Trend",
    source:
      "kc_mid = ema(close, 20)\nkc_range = ema(true_range(), 20)\n" +
      "kc_lower = line(kc_mid - 2 * kc_range)",
    outputName: "kc_lower",
  },
  {
    name: "DIA_HMA", label: "Hull MA (20)", category: "Trend",
    source:
      "wma_half = wma(close, 10)\nwma_full = wma(close, 20)\n" +
      "raw_hma = 2 * wma_half - wma_full\nhma = line(wma(raw_hma, 4))",
    outputName: "hma",
  },
  {
    name: "DIA_DEMA", label: "Double EMA (20)", category: "Trend",
    source:
      "ema1 = ema(close, 20)\nema2 = ema(ema1, 20)\n" +
      "dema = line(2 * ema1 - ema2)",
    outputName: "dema",
  },
  {
    name: "DIA_TEMA", label: "Triple EMA (20)", category: "Trend",
    source:
      "ema1 = ema(close, 20)\nema2 = ema(ema1, 20)\nema3 = ema(ema2, 20)\n" +
      "tema = line(3 * ema1 - 3 * ema2 + ema3)",
    outputName: "tema",
  },
  {
    name: "DIA_SUPERTREND", label: "SuperTrend (10, 3)", category: "Trend",
    source: SUPERTREND_PREAMBLE + "supertrend_line = line(is_uptrend * final_lower + (1 - is_uptrend) * final_upper)",
    outputName: "supertrend_line",
  },

  // -- Momentum -------------------------------------------------------------
  {
    name: "DIA_STOCH_K", label: "Stochastic %K (14,3,3)", category: "Momentum",
    source:
      "raw_k = 100 * (close - lowest(low,14)) / (highest(high,14) - lowest(low,14))\n" +
      "stoch_k = line(sma(raw_k, 3))",
    outputName: "stoch_k",
  },
  {
    name: "DIA_STOCH_D", label: "Stochastic %D (14,3,3)", category: "Momentum",
    source:
      "raw_k = 100 * (close - lowest(low,14)) / (highest(high,14) - lowest(low,14))\n" +
      "stoch_k = sma(raw_k, 3)\nstoch_d = line(sma(stoch_k, 3))",
    outputName: "stoch_d",
  },
  {
    name: "DIA_STOCHRSI_K", label: "Stochastic RSI %K (14,3,3)", category: "Momentum",
    source:
      "rsi_val = rsi(close, 14)\n" +
      "raw_k = 100 * (rsi_val - lowest(rsi_val,14)) / (highest(rsi_val,14) - lowest(rsi_val,14))\n" +
      "stochrsi_k = line(sma(raw_k, 3))",
    outputName: "stochrsi_k",
  },
  {
    name: "DIA_STOCHRSI_D", label: "Stochastic RSI %D (14,3,3)", category: "Momentum",
    source:
      "rsi_val = rsi(close, 14)\n" +
      "raw_k = 100 * (rsi_val - lowest(rsi_val,14)) / (highest(rsi_val,14) - lowest(rsi_val,14))\n" +
      "stochrsi_k = sma(raw_k, 3)\nstochrsi_d = line(sma(stochrsi_k, 3))",
    outputName: "stochrsi_d",
  },
  {
    name: "DIA_AWESOME_OSC", label: "Awesome Oscillator", category: "Momentum",
    source: "hl2 = (high + low) / 2\nao = histogram(sma(hl2, 5) - sma(hl2, 34))",
    outputName: "ao",
  },
  {
    name: "DIA_MOMENTUM", label: "Momentum (10)", category: "Momentum",
    source: "momentum = line(close - ref(close, 10))", outputName: "momentum",
  },
  {
    name: "DIA_ROC", label: "Rate of Change (10)", category: "Momentum",
    source: "roc = line(100 * (close - ref(close, 10)) / ref(close, 10))", outputName: "roc",
  },
  {
    name: "DIA_CCI", label: "Commodity Channel Index (14)", category: "Momentum",
    source:
      "tp = typical_price()\ntp_sma = sma(tp, 14)\n" +
      "mean_dev = sum(abs(tp - tp_sma), 14) / 14\n" +
      "cci = line((tp - tp_sma) / (0.015 * mean_dev))",
    outputName: "cci",
  },
  {
    name: "DIA_WILLIAMS_R", label: "Williams %R (14)", category: "Momentum",
    source: "willr = line(-100 * (highest(high,14) - close) / (highest(high,14) - lowest(low,14)))",
    outputName: "willr",
  },
  {
    name: "DIA_ULTIMATE_OSC", label: "Ultimate Oscillator (7,14,28)", category: "Momentum",
    source:
      "tl = min(low, ref(close,1))\nbp = close - tl\ntr_uo = true_range()\n" +
      "avg7 = sum(bp,7) / sum(tr_uo,7)\navg14 = sum(bp,14) / sum(tr_uo,14)\navg28 = sum(bp,28) / sum(tr_uo,28)\n" +
      "uo = line(100 * (4*avg7 + 2*avg14 + avg28) / 7)",
    outputName: "uo",
  },
  {
    name: "DIA_TRIX", label: "TRIX (15)", category: "Momentum",
    source:
      "ema1 = ema(close, 15)\nema2 = ema(ema1, 15)\nema3 = ema(ema2, 15)\n" +
      "trix = line(100 * (ema3 - ref(ema3, 1)) / ref(ema3, 1))",
    outputName: "trix",
  },
  {
    name: "DIA_FISHER", label: "Fisher Transform (9)", category: "Momentum",
    source:
      "hl2 = (high + low) / 2\nhighest_hl2 = highest(hl2, 9)\nlowest_hl2 = lowest(hl2, 9)\n" +
      "raw = 2 * ((hl2 - lowest_hl2) / (highest_hl2 - lowest_hl2) - 0.5)\n" +
      "raw_clamped = min(max(raw, -0.999), 0.999)\n" +
      "fisher = line(0.5 * log((1 + raw_clamped) / (1 - raw_clamped)))",
    outputName: "fisher",
  },
  {
    name: "DIA_MFI", label: "Money Flow Index (14)", category: "Momentum",
    source:
      "tp = typical_price()\nmoney_flow = tp * volume\n" +
      "positive_flow_raw = money_flow * (tp > ref(tp,1))\nnegative_flow_raw = money_flow * (tp < ref(tp,1))\n" +
      "positive_sum = sum(positive_flow_raw, 14)\nnegative_sum = sum(negative_flow_raw, 14)\n" +
      "money_ratio = positive_sum / negative_sum\nmfi = line(100 - 100 / (1 + money_ratio))",
    outputName: "mfi",
  },
  {
    name: "DIA_CMO", label: "Chande Momentum Oscillator (9)", category: "Momentum",
    source:
      "change = close - ref(close, 1)\ngain = max(change, 0)\nloss = max(-change, 0)\n" +
      "sum_gain = sum(gain, 9)\nsum_loss = sum(loss, 9)\n" +
      "cmo = line(100 * (sum_gain - sum_loss) / (sum_gain + sum_loss))",
    outputName: "cmo",
  },

  // -- Volatility -----------------------------------------------------------
  {
    name: "DIA_ATR", label: "Average True Range (14)", category: "Volatility",
    source: "atr = line(prev(1) * (13/14) + true_range() / 14)", outputName: "atr",
  },
  {
    name: "DIA_BB_PCT", label: "Bollinger Bands %B (20, 2)", category: "Volatility",
    source:
      "basis = sma(close, 20)\ndev = stdev(close, 20)\n" +
      "bb_upper = basis + 2*dev\nbb_lower = basis - 2*dev\n" +
      "bb_pct = line((close - bb_lower) / (bb_upper - bb_lower))",
    outputName: "bb_pct",
  },
  {
    name: "DIA_BB_WIDTH", label: "Bollinger Bands Width (20, 2)", category: "Volatility",
    source:
      "basis = sma(close, 20)\ndev = stdev(close, 20)\n" +
      "bb_upper = basis + 2*dev\nbb_lower = basis - 2*dev\n" +
      "bb_width = line((bb_upper - bb_lower) / basis)",
    outputName: "bb_width",
  },
  {
    name: "DIA_STDEV", label: "Standard Deviation (20)", category: "Volatility",
    source: "stdev_line = line(stdev(close, 20))", outputName: "stdev_line",
  },
  {
    name: "DIA_HIST_VOL", label: "Historical Volatility (20)", category: "Volatility",
    source:
      "log_return = log(close / ref(close, 1))\n" +
      "hv = line(100 * stdev(log_return, 20) * sqrt(252))",
    outputName: "hv",
  },

  // -- Volume -----------------------------------------------------------------
  {
    name: "DIA_OBV", label: "On Balance Volume", category: "Volume",
    source:
      "sign = (close > ref(close, 1)) - (close < ref(close, 1))\n" +
      "obv = line(prev(1) + sign * volume)",
    outputName: "obv",
  },
  {
    name: "DIA_AD", label: "Accumulation/Distribution", category: "Volume",
    source:
      "mfm = ((close - low) - (high - close)) / (high - low)\nmfv = mfm * volume\n" +
      "ad = line(prev(1) + mfv)",
    outputName: "ad",
  },
  {
    name: "DIA_CMF", label: "Chaikin Money Flow (20)", category: "Volume",
    source:
      "mfm = ((close - low) - (high - close)) / (high - low)\nmfv = mfm * volume\n" +
      "cmf = line(sum(mfv,20) / sum(volume,20))",
    outputName: "cmf",
  },
  {
    name: "DIA_VWAP", label: "VWAP (session)", category: "Volume",
    source:
      "tp = typical_price()\npv = tp * volume\n" +
      "session_start = (time.hour() == 9) and (time.minute() == 15)\n" +
      "cum_pv = session_start * pv + (1 - session_start) * (prev(1) + pv)\n" +
      "cum_vol = session_start * volume + (1 - session_start) * (prev(1) + volume)\n" +
      "vwap = line(cum_pv / cum_vol)",
    outputName: "vwap",
  },
  {
    name: "DIA_VWMA", label: "VWMA (20)", category: "Volume",
    source: "vwma = line(sum(close * volume, 20) / sum(volume, 20))", outputName: "vwma",
  },
  {
    name: "DIA_VOL_OSC", label: "Volume Oscillator (5, 20)", category: "Volume",
    source: "vol_osc = histogram(100 * (sma(volume, 5) - sma(volume, 20)) / sma(volume, 20))",
    outputName: "vol_osc",
  },
  {
    name: "DIA_PVT", label: "Price Volume Trend", category: "Volume",
    source:
      "bar_count = prev(1) + 1\nhas_prior = bar_count > 1\n" +
      "prior_close = held(has_prior, ref(close, 1))\n" +
      "safe_denom = prior_close + (1 - has_prior)\n" +
      "pct_change = has_prior * (close - prior_close) / safe_denom\n" +
      "pvt = line(prev(1) + pct_change * 100 * volume)",
    outputName: "pvt",
  },
  {
    name: "DIA_EOM", label: "Ease of Movement (14)", category: "Volume",
    source:
      "distance = (high + low) / 2 - (ref(high,1) + ref(low,1)) / 2\n" +
      "box_ratio = (volume / 100000000) / (high - low)\nraw_emv = distance / box_ratio\n" +
      "emv = line(sma(raw_emv, 14))",
    outputName: "emv",
  },
];

/** Registers every diascript-backed indicator with klinecharts. Idempotent
 * per klinecharts' own registerIndicator (re-registering the same name just
 * overwrites the prior definition) — safe to call on every module load,
 * including React Fast Refresh in dev. Async because "diascript/klinecharts"
 * is loaded lazily here (see the note at the top of this file) — the caller
 * (CandlestickChart.tsx) already awaits this alongside the dynamic
 * `import("klinecharts")` it does for the same SSR-safety reason. */
let registered = false;
export async function registerDiascriptIndicators(): Promise<void> {
  if (registered) return;
  registered = true;

  const { registerDiascriptIndicator } = await import("diascript/klinecharts");
  for (const def of DIASCRIPT_CATALOG) {
    registerDiascriptIndicator(def.name, {
      source: def.source,
      outputName: def.outputName,
      adapter: noopAdapter,
      symbolTicker: "",
    });
  }
}
