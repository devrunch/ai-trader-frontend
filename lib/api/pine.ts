import { req } from "./client";
import type { ApiOhlcBar } from "./market";

/** One plotted point. `value` is null during an indicator's warmup period
 *  (e.g. ta.sma's first few bars before enough history exists) -- a real,
 *  expected state, not an error. `time` is PineTS's own per-point
 *  timestamp (ms epoch), not assumed to positionally match the input bars. */
export interface PinePlotPoint {
  time: number;
  value: number | null;
}

export interface PineRunResult {
  ok: boolean;
  plots: Record<string, PinePlotPoint[]> | null;
  error: string | null;
}

export const runPineIndicator = (source: string, bars: ApiOhlcBar[]) =>
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
    }),
  });
