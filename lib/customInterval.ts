import { INTERVALS, type Interval } from "@/lib/periods";

/** A user-typed candle size beyond the 6 presets in INTERVALS (lib/periods.ts)
 *  -- e.g. "3m", "2h", "4d", "1w". The backend has no native bars at these
 *  resolutions (confirmed against every provider: Kite/Deriv/yfinance only
 *  ever serve 1m/5m/15m/30m/1h/1d), so a custom interval is never fetched
 *  directly -- it's built by fetching the nearest native resolution and
 *  bucketing bars client-side (see aggregateBars.ts). */
export interface CustomInterval {
  value: number;
  unit: "m" | "h" | "d" | "w";
}

const CUSTOM_INTERVAL_RE = /^(\d+)\s*([mhdw])$/i;

/** Parses a typed custom interval like "3m" or "2h". Null for anything that
 *  isn't a positive whole number followed by one of m/h/d/w -- including the
 *  6 presets themselves, which the caller should already be checking against
 *  INTERVALS before ever reaching here. */
export function parseCustomInterval(input: string): CustomInterval | null {
  const m = CUSTOM_INTERVAL_RE.exec(input.trim());
  if (!m) return null;
  const value = parseInt(m[1], 10);
  if (value <= 0) return null;
  return { value, unit: m[2].toLowerCase() as CustomInterval["unit"] };
}

/** Which native interval to actually request bars at for a custom interval.
 *  Day/week customs bucket whole daily bars (no session-gap concern -- each
 *  1d bar is already exactly one trading session); everything finer buckets
 *  1-minute bars, which need the session-boundary guard in aggregateBars. */
export function baseIntervalFor(ci: CustomInterval): "1m" | "1d" {
  return ci.unit === "d" || ci.unit === "w" ? "1d" : "1m";
}

/** How many native bars make up one custom candle. A trading week is
 *  approximated as 5 sessions -- there is no native weekly bar to count
 *  against, and holidays make an exact calendar-week count meaningless
 *  here anyway. */
export function bucketSizeFor(ci: CustomInterval): number {
  switch (ci.unit) {
    case "w": return ci.value * 5;
    case "d": return ci.value;
    case "h": return ci.value * 60;
    case "m": return ci.value;
  }
}

export interface ResolvedInterval {
  /** What to actually request from getHistorical. */
  fetchInterval: Interval;
  /** How many `fetchInterval`-resolution bars make up one displayed candle.
   *  1 means "no aggregation" -- the fetched bars ARE the displayed bars. */
  bucketSize: number;
  guardSessionBoundary: boolean;
}

/** The single place `interval` state (a preset from INTERVALS, or a
 *  user-typed custom string) turns into "what to fetch" + "how to bucket
 *  it" -- used identically by the initial bars fetch and by load-more, so
 *  panning back in a custom interval can't silently drift from what's on
 *  screen. */
export function resolveInterval(interval: string): ResolvedInterval {
  if ((INTERVALS as readonly string[]).includes(interval)) {
    return { fetchInterval: interval as Interval, bucketSize: 1, guardSessionBoundary: false };
  }
  const custom = parseCustomInterval(interval);
  if (!custom) {
    // Unreachable in practice -- IntervalPicker validates with
    // parseCustomInterval before ever calling onChange with a non-preset
    // value. Falls back to the coarsest native interval rather than
    // throwing, so a corrupted value (e.g. hand-edited URL state) degrades
    // to a visibly-wrong-but-working chart instead of a crash.
    return { fetchInterval: "1d", bucketSize: 1, guardSessionBoundary: false };
  }
  return {
    fetchInterval: baseIntervalFor(custom),
    bucketSize: bucketSizeFor(custom),
    guardSessionBoundary: custom.unit === "m" || custom.unit === "h",
  };
}
