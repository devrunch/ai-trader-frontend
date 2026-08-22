import type { AttachedIndicator } from "@/lib/api/charts";
import type { VolumeProfileMode } from "@/lib/chart-adapter/volume-profile-primitive";

export type IndicatorCategory = "Moving Averages" | "Trend" | "Momentum" | "Volatility" | "Volume";

/** Most entries run as a Pine script through the same sandbox as the AI
 *  agent's authored indicators. Two kinds of entry don't: Volume Profile is
 *  a price-bucketed histogram with no time axis of its own -- not
 *  expressible as a Pine plot() -- toggled through the adapter's
 *  attachVolumeProfile()/removeVolumeProfile(); Volume Spread Analysis
 *  recolors the existing volume histogram in place rather than adding a
 *  series, toggled through setVolumeSpreadAnalysis(). Several Volume
 *  Profile entries can be attached at once; VSA is a single on/off switch
 *  (there's only one volume histogram to recolor). */
export type IndicatorCatalogEntry =
  | { kind: "pine"; id: string; name: string; category: IndicatorCategory; pane: "main" | "sub" | "volume"; source: string }
  | { kind: "volume-profile"; id: string; name: string; category: IndicatorCategory; pane: "main" | "sub"; mode: VolumeProfileMode }
  | { kind: "vsa"; id: string; name: string; category: IndicatorCategory; pane: "volume" };

const H = "//@version=5\n";

/**
 * The built-in indicator library, each entry a real Pine v5 script run
 * through the same PineTS sandbox as the AI agent's authored indicators
 * (attachPineIndicator) -- there is no separate "built-in" execution path.
 * Every source here was validated against the running sandbox with real
 * bars before being added; ta.* calls are pinned to the exact signatures
 * PineTS 0.9.x ships (some, like stoch/wpr/mfi, take a different argument
 * shape than real TradingView Pine).
 */
export const INDICATOR_CATALOG: IndicatorCatalogEntry[] = [
  // ── Moving Averages (main pane, overlay) ──────────────────────────
  { kind: "pine", id: "sma", name: "Simple Moving Average", category: "Moving Averages", pane: "main",
    source: `${H}indicator("SMA")\nplot(ta.sma(close, 20), "SMA")` },
  { kind: "pine", id: "ema", name: "Exponential Moving Average", category: "Moving Averages", pane: "main",
    source: `${H}indicator("EMA")\nplot(ta.ema(close, 20), "EMA")` },
  { kind: "pine", id: "wma", name: "Weighted Moving Average", category: "Moving Averages", pane: "main",
    source: `${H}indicator("WMA")\nplot(ta.wma(close, 20), "WMA")` },
  { kind: "pine", id: "vwma", name: "Volume Weighted Moving Average", category: "Moving Averages", pane: "main",
    source: `${H}indicator("VWMA")\nplot(ta.vwma(close, 20), "VWMA")` },
  { kind: "pine", id: "hma", name: "Hull Moving Average", category: "Moving Averages", pane: "main",
    source: `${H}indicator("HMA")\nplot(ta.hma(close, 20), "HMA")` },
  { kind: "pine", id: "rma", name: "Smoothed Moving Average (RMA)", category: "Moving Averages", pane: "main",
    source: `${H}indicator("RMA")\nplot(ta.rma(close, 20), "RMA")` },
  { kind: "pine", id: "alma", name: "Arnaud Legoux Moving Average", category: "Moving Averages", pane: "main",
    source: `${H}indicator("ALMA")\nplot(ta.alma(close, 9, 0.85, 6), "ALMA")` },
  { kind: "pine", id: "vwap", name: "VWAP", category: "Moving Averages", pane: "main",
    source: `${H}indicator("VWAP")\nplot(ta.vwap(close), "VWAP")` },
  { kind: "pine", id: "linreg", name: "Linear Regression Curve", category: "Moving Averages", pane: "main",
    source: `${H}indicator("Linear Regression")\nplot(ta.linreg(close, 14, 0), "Linear Reg")` },
  { kind: "pine", id: "median", name: "Moving Median", category: "Moving Averages", pane: "main",
    source: `${H}indicator("Median")\nplot(ta.median(close, 20), "Median")` },
  { kind: "pine", id: "swma", name: "Symmetrically Weighted MA", category: "Moving Averages", pane: "main",
    // ta.swma has no length parameter in real Pine either -- always a fixed
    // 4-bar symmetric window ([1,2,2,1] weights), not something this catalog
    // entry is choosing to omit.
    source: `${H}indicator("SWMA")\nplot(ta.swma(close), "SWMA")` },
  { kind: "pine", id: "gaussian", name: "Gaussian Filter", category: "Moving Averages", pane: "main",
    // No dedicated ta.* function -- a real Gaussian kernel, a genuine
    // weighted average over the window (not sma()/ema() relabeled), same
    // worked example the chat agent's own system prompt uses to prove it
    // won't fake a requested technique's real math.
    source: `${H}indicator("Gaussian Filter")\nlength = 9\nsigma = 3.0\nsum_w = 0.0\nsum_wv = 0.0\nfor k = 0 to length - 1\n    w = math.exp(-(k * k) / (2 * sigma * sigma))\n    sum_w += w\n    sum_wv += w * close[k]\nplot(sum_wv / sum_w, "Gaussian")` },

  // ── Trend (main pane) ──────────────────────────────────────────────
  { kind: "pine", id: "supertrend", name: "Supertrend", category: "Trend", pane: "main",
    source: `${H}indicator("Supertrend")\n[st, dir] = ta.supertrend(3, 10)\nplot(dir < 0 ? st : na, "Supertrend Up")\nplot(dir > 0 ? st : na, "Supertrend Down")` },
  { kind: "pine", id: "sar", name: "Parabolic SAR", category: "Trend", pane: "main",
    source: `${H}indicator("Parabolic SAR")\nplot(ta.sar(0.02, 0.02, 0.2), "SAR")` },
  { kind: "pine", id: "ichimoku", name: "Ichimoku Cloud", category: "Trend", pane: "main",
    source: `${H}indicator("Ichimoku Cloud")\nconv = (ta.highest(high, 9) + ta.lowest(low, 9)) / 2\nbase = (ta.highest(high, 26) + ta.lowest(low, 26)) / 2\nspanA = (conv + base) / 2\nspanB = (ta.highest(high, 52) + ta.lowest(low, 52)) / 2\nplot(conv, "Conversion Line")\nplot(base, "Base Line")\nplot(spanA, "Cloud Upper")\nplot(spanB, "Cloud Lower")` },
  { kind: "pine", id: "dmi", name: "DMI / ADX", category: "Trend", pane: "sub",
    source: `${H}indicator("DMI/ADX")\n[p, mn, adx] = ta.dmi(14, 14)\nplot(p, "+DI")\nplot(mn, "-DI")\nplot(adx, "ADX")` },
  { kind: "pine", id: "wavelet", name: "Wavelet Trend", category: "Trend", pane: "main",
    // Stationary wavelet construction: a 2-tap moving average and
    // a 2-tap difference (the Haar scaling and wavelet filters) at spacing
    // 1, then the same pair repeated on the first pair's average at spacing
    // 2 -- each level doubles the tap spacing rather than halving the data,
    // so every level still produces one value per bar. Only the trend
    // (approximation) component is plotted; decomposing further into cycle
    // components is real follow-up work, not attempted here.
    source: `${H}indicator("Wavelet Trend")\napprox1 = (close + close[1]) / 2\napprox2 = (approx1 + approx1[2]) / 2\nplot(approx2, "Trend")` },
  { kind: "pine", id: "swing-high", name: "Swing High Line", category: "Trend", pane: "main",
    source: `${H}indicator("Swing High")\nisSwingHigh = high == ta.highest(high, 10)\nvar float lastSwingHigh = na\nif isSwingHigh\n    lastSwingHigh := high\nplot(lastSwingHigh, "Last Swing High")` },

  // ── Volatility ─────────────────────────────────────────────────────
  { kind: "pine", id: "bb", name: "Bollinger Bands", category: "Volatility", pane: "main",
    source: `${H}indicator("Bollinger Bands")\n[u, m, l] = ta.bb(close, 20, 2)\nplot(m, "BB Basis")\nplot(u, "BB Upper")\nplot(l, "BB Lower")` },
  { kind: "pine", id: "kc", name: "Keltner Channels", category: "Volatility", pane: "main",
    source: `${H}indicator("Keltner Channels")\n[basis, u, l] = ta.kc(close, 20, 1.5, false)\nplot(basis, "KC Basis")\nplot(u, "KC Upper")\nplot(l, "KC Lower")` },
  { kind: "pine", id: "atr", name: "Average True Range", category: "Volatility", pane: "sub",
    source: `${H}indicator("ATR")\nplot(ta.atr(14), "ATR")` },
  { kind: "pine", id: "spread", name: "Spread", category: "Volatility", pane: "sub",
    source: `${H}indicator("Spread")\nplot(high - low, "Spread")` },
  { kind: "pine", id: "spread-on-volume", name: "Spread (on Volume)", category: "Volatility", pane: "volume",
    source: `${H}indicator("Spread")\nplot(high - low, "Spread")` },
  { kind: "pine", id: "bbw", name: "Bollinger Bands Width", category: "Volatility", pane: "sub",
    source: `${H}indicator("BBW")\nplot(ta.bbw(close, 20, 2), "BBW")` },
  { kind: "pine", id: "kcw", name: "Keltner Channel Width", category: "Volatility", pane: "sub",
    source: `${H}indicator("KCW")\nplot(ta.kcw(close, 20, 1.5, false), "KCW")` },
  { kind: "pine", id: "stdev", name: "Standard Deviation", category: "Volatility", pane: "sub",
    source: `${H}indicator("StdDev")\nplot(ta.stdev(close, 20), "StdDev")` },
  { kind: "pine", id: "donchian", name: "Donchian Channels", category: "Volatility", pane: "main",
    source: `${H}indicator("Donchian Channels")\nupper = ta.highest(high, 20)\nlower = ta.lowest(low, 20)\nplot((upper + lower) / 2, "Donchian Basis")\nplot(upper, "Donchian Upper")\nplot(lower, "Donchian Lower")` },
  { kind: "pine", id: "envelope", name: "Moving Average Envelope", category: "Volatility", pane: "main",
    source: `${H}indicator("Envelope")\nbasis = ta.sma(close, 20)\nplot(basis * 1.1, "Envelope Upper")\nplot(basis * 0.9, "Envelope Lower")` },
  { kind: "pine", id: "stdev-band", name: "StdDev Band", category: "Volatility", pane: "main",
    // Not a moving-average channel like BB/KC -- the band rides directly on
    // close +- 2 standard deviations, so it tracks price itself rather than
    // a smoothed basis.
    source: `${H}indicator("StdDev Band")\ndev = ta.stdev(close, 20) * 2\nplot(close + dev, "StdDev Upper")\nplot(close - dev, "StdDev Lower")` },

  // ── Momentum / Oscillators (sub pane) ────────────────────────────
  { kind: "pine", id: "rsi", name: "Relative Strength Index", category: "Momentum", pane: "sub",
    source: `${H}indicator("RSI")\nplot(ta.rsi(close, 14), "RSI")` },
  { kind: "pine", id: "stoch", name: "Stochastic", category: "Momentum", pane: "sub",
    source: `${H}indicator("Stochastic")\nk = ta.stoch(close, high, low, 14)\nd = ta.sma(k, 3)\nplot(k, "Stoch %K")\nplot(d, "Stoch %D")` },
  { kind: "pine", id: "macd", name: "MACD", category: "Momentum", pane: "sub",
    source: `${H}indicator("MACD")\n[m, s, h] = ta.macd(close, 12, 26, 9)\nplot(m, "MACD")\nplot(s, "Signal")\nplot(h, "Histogram")` },
  { kind: "pine", id: "cci", name: "Commodity Channel Index", category: "Momentum", pane: "sub",
    source: `${H}indicator("CCI")\nplot(ta.cci(close, 20), "CCI")` },
  { kind: "pine", id: "wpr", name: "Williams %R", category: "Momentum", pane: "sub",
    source: `${H}indicator("Williams %R")\nplot(ta.wpr(14), "%R")` },
  { kind: "pine", id: "cmo", name: "Chande Momentum Oscillator", category: "Momentum", pane: "sub",
    source: `${H}indicator("CMO")\nplot(ta.cmo(close, 14), "CMO")` },
  { kind: "pine", id: "tsi", name: "True Strength Index", category: "Momentum", pane: "sub",
    source: `${H}indicator("TSI")\nplot(ta.tsi(close, 13, 25), "TSI")` },
  { kind: "pine", id: "mom", name: "Momentum", category: "Momentum", pane: "sub",
    source: `${H}indicator("Momentum")\nplot(ta.mom(close, 10), "Momentum")` },
  { kind: "pine", id: "roc", name: "Rate of Change", category: "Momentum", pane: "sub",
    source: `${H}indicator("ROC")\nplot(ta.roc(close, 10), "ROC")` },
  { kind: "pine", id: "ao", name: "Awesome Oscillator", category: "Momentum", pane: "sub",
    // TradingView's real AO renders as bars, not a line -- naming the plot
    // "Histogram" routes it through the same 4-tone bar rendering MACD uses
    // (see pine-render.ts), not a special case of its own.
    source: `${H}indicator("Awesome Oscillator")\nao = ta.sma(hl2, 5) - ta.sma(hl2, 34)\nplot(ao, "Histogram")` },
  { kind: "pine", id: "bbp", name: "Bollinger Bands %B", category: "Momentum", pane: "sub",
    source: `${H}indicator("Bollinger %B")\n[u, m, l] = ta.bb(close, 20, 2)\nplot((close - l) / (u - l), "%B")` },
  { kind: "pine", id: "cog", name: "Center of Gravity", category: "Momentum", pane: "sub",
    source: `${H}indicator("COG")\nplot(ta.cog(close, 10), "COG")` },
  { kind: "pine", id: "ema-diff", name: "EMA Diff", category: "Momentum", pane: "sub",
    source: `${H}indicator("EMA Diff")\nplot(ta.ema(close, 20) - ta.ema(close, 50), "EMA Diff")` },

  // ── Volume ─────────────────────────────────────────────────────────
  { kind: "pine", id: "mfi", name: "Money Flow Index", category: "Volume", pane: "sub",
    source: `${H}indicator("MFI")\nplot(ta.mfi(hlc3, 14), "MFI")` },
  { kind: "pine", id: "obv", name: "On Balance Volume", category: "Volume", pane: "sub",
    source: `${H}indicator("OBV")\nplot(ta.obv(), "OBV")` },
  { kind: "pine", id: "accdist", name: "Accumulation / Distribution", category: "Volume", pane: "sub",
    source: `${H}indicator("Accum/Dist")\nplot(ta.accdist(), "A/D")` },
  { kind: "pine", id: "pvt", name: "Price Volume Trend", category: "Volume", pane: "sub",
    source: `${H}indicator("PVT")\nplot(ta.pvt(), "PVT")` },
  { kind: "pine", id: "nvi", name: "Negative Volume Index", category: "Volume", pane: "sub",
    source: `${H}indicator("NVI")\nplot(ta.nvi(), "NVI")` },
  { kind: "pine", id: "pvi", name: "Positive Volume Index", category: "Volume", pane: "sub",
    source: `${H}indicator("PVI")\nplot(ta.pvi(), "PVI")` },
  { kind: "pine", id: "wad", name: "Williams Accumulation/Distribution", category: "Volume", pane: "sub",
    source: `${H}indicator("WAD")\nplot(ta.wad(), "WAD")` },
  { kind: "vsa", id: "vsa", name: "Volume Spread Analysis", category: "Volume", pane: "volume" },
  // TradingView ships a sixth variant, Fixed Range -- it needs a click-drag
  // anchor selection on the chart, which this app's pointer-driven drawing
  // interaction doesn't support yet (see startManualDraw() in
  // lightweight-charts-adapter.ts). Left out rather than faked.
  { kind: "volume-profile", id: "vp-visible", name: "Visible Range Volume Profile", category: "Volume", pane: "main", mode: "visible" },
  { kind: "volume-profile", id: "vp-session", name: "Session Volume Profile", category: "Volume", pane: "main", mode: "session" },
  { kind: "volume-profile", id: "vp-session-hd", name: "Session Volume Profile HD", category: "Volume", pane: "main", mode: "session-hd" },
  { kind: "volume-profile", id: "vp-auto-anchored", name: "Auto Anchored Volume Profile", category: "Volume", pane: "main", mode: "auto-anchored" },
  { kind: "volume-profile", id: "vp-periodic", name: "Periodic Volume Profile", category: "Volume", pane: "main", mode: "periodic" },
];

export const INDICATOR_CATEGORIES: IndicatorCategory[] = ["Moving Averages", "Trend", "Volatility", "Momentum", "Volume"];

export function toAttachedIndicator(entry: Extract<IndicatorCatalogEntry, { kind: "pine" }>): AttachedIndicator {
  return { id: entry.id, source: entry.source, label: entry.name, pane: entry.pane };
}

/** id -> mode for every Volume Profile catalog entry, so a caller holding
 *  just the id (e.g. terminal/page.tsx's attached-primitives Set) can look
 *  up which mode to pass to attachVolumeProfile() without re-scanning the
 *  catalog itself. */
export const VOLUME_PROFILE_MODE_BY_ID: Record<string, VolumeProfileMode> = Object.fromEntries(
  INDICATOR_CATALOG.filter((e): e is Extract<IndicatorCatalogEntry, { kind: "volume-profile" }> => e.kind === "volume-profile")
    .map((e) => [e.id, e.mode]),
);

/** id -> display name for every catalog entry, Pine or primitive alike --
 *  the on-chart legend needs a label for Volume Profile rows too, which
 *  (unlike AttachedIndicator) carry no label of their own. */
export const INDICATOR_NAME_BY_ID: Record<string, string> = Object.fromEntries(
  INDICATOR_CATALOG.map((e) => [e.id, e.name]),
);
