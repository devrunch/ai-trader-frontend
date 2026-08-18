import { InMemoryDataAdapter } from "diascript";
import { registerDiascriptIndicator } from "diascript/klinecharts";

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

export const DIASCRIPT_CATALOG: DiascriptIndicatorDef[] = [
  {
    name: "DIA_EMA20", label: "EMA 20 (diascript)", category: "Overlays",
    source: "ema_line = line(ema(close, 20))", outputName: "ema_line",
  },
  {
    name: "DIA_RSI14", label: "RSI 14 (diascript)", category: "Momentum",
    source: "rsi_line = line(rsi(close, 14))", outputName: "rsi_line",
  },
];

/** Registers every diascript-backed indicator with klinecharts. Idempotent
 * per klinecharts' own registerIndicator (re-registering the same name just
 * overwrites the prior definition) — safe to call on every module load,
 * including React Fast Refresh in dev. */
let registered = false;
export function registerDiascriptIndicators(): void {
  if (registered) return;
  registered = true;

  for (const def of DIASCRIPT_CATALOG) {
    registerDiascriptIndicator(def.name, {
      source: def.source,
      outputName: def.outputName,
      adapter: noopAdapter,
      symbolTicker: "",
    });
  }
}
