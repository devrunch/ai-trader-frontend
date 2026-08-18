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

  // -- Phase 2 batch: Vortex, Linear Regression, NVI, Chande Kroll, price refs --
  {
    name: "DIA_VORTEX_PLUS", label: "Vortex VI+ (14)", category: "Trend",
    source:
      "vm_plus = abs(high - ref(low,1))\ntr_v = true_range()\n" +
      "vi_plus = line(sum(vm_plus,14) / sum(tr_v,14))",
    outputName: "vi_plus",
  },
  {
    name: "DIA_VORTEX_MINUS", label: "Vortex VI- (14)", category: "Trend",
    source:
      "vm_minus = abs(low - ref(high,1))\ntr_v = true_range()\n" +
      "vi_minus = line(sum(vm_minus,14) / sum(tr_v,14))",
    outputName: "vi_minus",
  },
  {
    // Closed-form least-squares fit over a fixed 10-bar window (weights
    // unrolled at author time, not a runtime loop) -- x = 0..9, oldest to
    // newest, so sum_x/sum_x2 are the same fixed constants every bar.
    name: "DIA_LINREG", label: "Linear Regression Curve (10)", category: "Trend",
    source:
      "sum_xy = 0*ref(close,9) + 1*ref(close,8) + 2*ref(close,7) + 3*ref(close,6) + 4*ref(close,5) + 5*ref(close,4) + 6*ref(close,3) + 7*ref(close,2) + 8*ref(close,1) + 9*close\n" +
      "sum_y = ref(close,9)+ref(close,8)+ref(close,7)+ref(close,6)+ref(close,5)+ref(close,4)+ref(close,3)+ref(close,2)+ref(close,1)+close\n" +
      "slope = (10*sum_xy - 45*sum_y) / (10*285 - 45*45)\n" +
      "intercept = (sum_y - slope*45) / 10\n" +
      "linreg = line(intercept + slope*9)",
    outputName: "linreg",
  },
  {
    name: "DIA_LINREG_SLOPE", label: "Linear Regression Slope (10)", category: "Trend",
    source:
      "sum_xy = 0*ref(close,9) + 1*ref(close,8) + 2*ref(close,7) + 3*ref(close,6) + 4*ref(close,5) + 5*ref(close,4) + 6*ref(close,3) + 7*ref(close,2) + 8*ref(close,1) + 9*close\n" +
      "sum_y = ref(close,9)+ref(close,8)+ref(close,7)+ref(close,6)+ref(close,5)+ref(close,4)+ref(close,3)+ref(close,2)+ref(close,1)+close\n" +
      "linreg_slope = line((10*sum_xy - 45*sum_y) / (10*285 - 45*45))",
    outputName: "linreg_slope",
  },
  {
    // Additive cumulative index: bar 0 hard-seeded to 1000, later bars add
    // the period's ROC PERCENTAGE (not a fraction, not compounded against
    // the running value) only on bars where volume fell vs. the prior bar.
    name: "DIA_NVI", label: "Negative Volume Index", category: "Volume",
    source:
      "bar_count = prev(1) + 1\nhas_prior = bar_count > 1\n" +
      "prior_close = held(has_prior, ref(close, 1))\nprior_vol = held(has_prior, ref(volume, 1))\n" +
      "safe_prior_close = prior_close + (1 - has_prior)\n" +
      "vol_down = has_prior * (volume < prior_vol)\n" +
      "roc_pct = has_prior * 100 * (close - prior_close) / safe_prior_close\n" +
      "nvi = line((1 - has_prior) * 1000 + has_prior * (prev(1) + vol_down * roc_pct))",
    outputName: "nvi",
  },
  {
    // Verified structurally against pandas_ta's real cksp source (p=10,
    // x=1, q=9, Wilder-smoothed ATR — TradingView-mode defaults) — the
    // formula shape matches exactly; a wider tolerance than most entries
    // here is warranted since Wilder/RMA ATR's warm-up SEEDING convention
    // (not its steady-state formula) can differ slightly by implementation
    // and that difference compounds over a rolling max/min window.
    name: "DIA_CHANDE_KROLL_LONG", label: "Chande Kroll Long Stop (10, 1, 9)", category: "Trend",
    source:
      "atr_ck = prev(1) * (9/10) + true_range() / 10\n" +
      "first_high_stop = highest(high,10) - 1*atr_ck\n" +
      "long_stop = line(highest(first_high_stop, 9))",
    outputName: "long_stop",
  },
  {
    name: "DIA_CHANDE_KROLL_SHORT", label: "Chande Kroll Short Stop (10, 1, 9)", category: "Trend",
    source:
      "atr_ck = prev(1) * (9/10) + true_range() / 10\n" +
      "first_low_stop = lowest(low,10) + 1*atr_ck\n" +
      "short_stop = line(lowest(first_low_stop, 9))",
    outputName: "short_stop",
  },
  {
    name: "DIA_AVG_PRICE", label: "Average Price (OHLC/4)", category: "Overlays",
    source: "avg_price = line((open + high + low + close) / 4)", outputName: "avg_price",
  },
  {
    name: "DIA_MEDIAN_PRICE", label: "Median Price (HL/2)", category: "Overlays",
    source: "median_price = line((high + low) / 2)", outputName: "median_price",
  },
  {
    // A real Gaussian-weighted moving average, not a relabeled EMA — the
    // agent used to silently substitute a plain EMA and call it
    // "Gaussian-like" because exp() didn't exist yet to compute real
    // Gaussian kernel weights. 9-tap causal (one-sided) kernel, sigma=3
    // (window ≈ 3 standard deviations), weights computed via exp() right
    // here in the formula and normalized to sum to 1 — not hardcoded
    // constants, so the math is auditable from the source itself. Verified
    // to track price more closely than an equal-length SMA (a Gaussian
    // filter's whole point): on the same fixture, this reads 122.42 vs
    // SMA(9)'s 122.28 while price sits at 123.08.
    name: "DIA_GAUSSIAN_FILTER", label: "Gaussian Filter (9, sigma=3)", category: "Trend",
    source:
      "raw0 = exp(0)\nraw1 = exp(-1/18)\nraw2 = exp(-4/18)\nraw3 = exp(-9/18)\n" +
      "raw4 = exp(-16/18)\nraw5 = exp(-25/18)\nraw6 = exp(-36/18)\nraw7 = exp(-49/18)\nraw8 = exp(-64/18)\n" +
      "raw_sum = raw0+raw1+raw2+raw3+raw4+raw5+raw6+raw7+raw8\n" +
      "gaussian = line((raw0*close + raw1*ref(close,1) + raw2*ref(close,2) + raw3*ref(close,3) + " +
      "raw4*ref(close,4) + raw5*ref(close,5) + raw6*ref(close,6) + raw7*ref(close,7) + raw8*ref(close,8)) / raw_sum)",
    outputName: "gaussian",
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
