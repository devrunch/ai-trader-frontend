import { req } from "./client";
import type { ApiOhlcBar } from "./market";

/** One plotted point. `value` is null during an indicator's warmup period
 *  (e.g. ta.sma's first few bars before enough history exists) -- a real,
 *  expected state, not an error. `time` is PineTS's own per-point
 *  timestamp (ms epoch), not assumed to positionally match the input bars.
 *  `value` is a boolean, not a number, for a plotshape()/plotchar() call --
 *  confirmed against the real sandbox: PineTS surfaces those as a plain
 *  named plot carrying true on the bar the shape condition fired, false
 *  otherwise, not as real shape/location/color metadata (which it drops
 *  entirely). See pine-render.ts's buildSeriesMarkers for how that gets
 *  turned into real chart markers. */
export interface PinePlotPoint {
  time: number;
  value: number | boolean | null;
}

/** A real Pine fill(plot1, plot2, color) call. PineTS deliberately never
 *  gives a fill a real per-bar numeric value (confirmed against the actual
 *  package source, github.com/LuxAlgo/PineTS -- FillHelper always pushes
 *  {value: null}) -- what it gives instead is which two OTHER plots (by
 *  name, matching a key in PineRunResult.plots) it fills between, plus the
 *  real per-bar color the script resolved (which can depend on state that
 *  has nothing to do with which plot is on top, e.g. a trend boolean, so it
 *  is not something the renderer could reconstruct on its own). Gradient
 *  fills (fill(p1, p2, top_value, bottom_value, top_color, bottom_color))
 *  are a different, rarer PineTS code path with a different color model
 *  (interpolated between two value thresholds, not one flat color per bar)
 *  -- the sandbox worker excludes them from this list rather than render
 *  them wrong. */
export interface PineFillSpec {
  name: string;
  plot1: string;
  plot2: string;
  colors: { time: number; color: string | null }[];
}

/** One `input.*()` declaration parsed straight out of the script by real
 *  PineTS (Indicator.getInputsMeta(), github.com/LuxAlgo/PineTS) -- what a
 *  TradingView-style settings form renders from. `varId` is the script's
 *  own variable name for this input (e.g. `length`) and is what a settings
 *  override in PineRunOptions.inputOverrides gets keyed by -- more robust
 *  than `title`, which a script can leave blank or duplicate. */
export interface PineInputMeta {
  type: "int" | "float" | "bool" | "string" | "source" | "color" | "enum" | "price" | "time" | "session" | "symbol" | "timeframe" | "text_area";
  defval: unknown;
  varId?: string;
  title?: string;
  minval?: number;
  maxval?: number;
  step?: number;
  options?: unknown[];
}

export interface PineRunResult {
  ok: boolean;
  plots: Record<string, PinePlotPoint[]> | null;
  fills?: PineFillSpec[] | null;
  error: string | null;
  inputsMeta?: PineInputMeta[];
}

export const runPineIndicator = (
  source: string,
  bars: ApiOhlcBar[],
  symbol?: string,
  exchange?: string,
  inputOverrides?: Record<string, unknown>,
) =>
  req<PineRunResult>("/api/pine/run", {
    method: "POST",
    body: JSON.stringify({
      source,
      // PineTS's own bar shape needs `openTime` in MILLISECONDS -- confirmed
      // against the real package, not documented, and easy to get wrong
      // silently (a bar missing openTime still "runs", just with no
      // timestamps in the output). ApiOhlcBar.time is SECONDS, matching
      // Lightweight Charts' own UTCTimestamp convention everywhere else in
      // this app -- the *1000 conversion belongs here, once, not in every
      // caller.
      bars: bars.map((b) => ({ open: b.open, high: b.high, low: b.low, close: b.close, volume: b.volume, openTime: b.time * 1000 })),
      mode: "indicator",
      // symbol/exchange (when known) let the sandbox wrap bars as a real
      // PineTS IProvider instead of a raw array, so syminfo.*/timeframe.*
      // resolve real values instead of leaving syminfo undefined -- see
      // ai-trader-signals/app/pine_sandbox/bars-provider.mjs.
      symbol,
      exchange,
      // varId-keyed input.*() overrides -- applied through PineTS's own
      // real Indicator.input proxy server-side (worker.mjs), not a
      // source-text substitution.
      inputOverrides,
    }),
  });
