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

  // ── Trend (main pane) ──────────────────────────────────────────────
  { kind: "pine", id: "supertrend", name: "Supertrend", category: "Trend", pane: "main",
    source: `${H}indicator("Supertrend")\n[st, dir] = ta.supertrend(3, 10)\nplot(dir < 0 ? st : na, "Supertrend Up")\nplot(dir > 0 ? st : na, "Supertrend Down")` },
  { kind: "pine", id: "sar", name: "Parabolic SAR", category: "Trend", pane: "main",
    source: `${H}indicator("Parabolic SAR")\nplot(ta.sar(0.02, 0.02, 0.2), "SAR")` },
  { kind: "pine", id: "ichimoku", name: "Ichimoku Cloud", category: "Trend", pane: "main",
    source: `${H}indicator("Ichimoku Cloud")\nconv = (ta.highest(high, 9) + ta.lowest(low, 9)) / 2\nbase = (ta.highest(high, 26) + ta.lowest(low, 26)) / 2\nspanA = (conv + base) / 2\nspanB = (ta.highest(high, 52) + ta.lowest(low, 52)) / 2\nplot(conv, "Conversion Line")\nplot(base, "Base Line")\nplot(spanA, "Cloud Upper")\nplot(spanB, "Cloud Lower")` },
  { kind: "pine", id: "dmi", name: "DMI / ADX", category: "Trend", pane: "sub",
    source: `${H}indicator("DMI/ADX")\n[p, mn, adx] = ta.dmi(14, 14)\nplot(p, "+DI")\nplot(mn, "-DI")\nplot(adx, "ADX")` },

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

  // ── Volume ─────────────────────────────────────────────────────────
  { kind: "pine", id: "mfi", name: "Money Flow Index", category: "Volume", pane: "sub",
    source: `${H}indicator("MFI")\nplot(ta.mfi(hlc3, 14), "MFI")` },
  { kind: "pine", id: "obv", name: "On Balance Volume", category: "Volume", pane: "sub",
    source: `${H}indicator("OBV")\nplot(ta.obv(), "OBV")` },
  { kind: "pine", id: "accdist", name: "Accumulation / Distribution", category: "Volume", pane: "sub",
    source: `${H}indicator("Accum/Dist")\nplot(ta.accdist(), "A/D")` },
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
