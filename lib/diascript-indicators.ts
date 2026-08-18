import { InMemoryDataAdapter } from "diascript";
import { registerDiascriptIndicator } from "diascript/klinecharts";

/**
 * Indicators defined as diascript formulas instead of klinecharts' own
 * built-in catalog — proves the real integration (registration, live
 * recompute on new bars/ticks) works against this app's actual chart, not
 * just diascript's own test suite.
 *
 * None of these reference series(), session.is_open(), or symbol.exchange()
 * (no cross-timeframe or session-aware logic yet), so a real DataAdapter
 * isn't needed for this first pass — an InMemoryDataAdapter with nothing
 * registered is enough, since it's never actually called.
 */
export const noopAdapter = new InMemoryDataAdapter();

export const DIASCRIPT_EMA_20 = "DIA_EMA20";
export const DIASCRIPT_RSI_14 = "DIA_RSI14";

/** Registers every diascript-backed indicator with klinecharts. Idempotent
 * per klinecharts' own registerIndicator (re-registering the same name just
 * overwrites the prior definition) — safe to call on every module load,
 * including React Fast Refresh in dev. */
let registered = false;
export function registerDiascriptIndicators(): void {
  if (registered) return;
  registered = true;

  registerDiascriptIndicator(DIASCRIPT_EMA_20, {
    source: "ema_line = line(ema(close, 20))",
    outputName: "ema_line",
    adapter: noopAdapter,
    symbolTicker: "",
  });

  registerDiascriptIndicator(DIASCRIPT_RSI_14, {
    source: "rsi_line = line(rsi(close, 14))",
    outputName: "rsi_line",
    adapter: noopAdapter,
    symbolTicker: "",
  });
}
