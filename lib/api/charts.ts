import { req } from "./client";

/* ── Chart layouts: what the user has on their chart, kept ── */

/** One overlay, in the rendering adapter's own shape. Opaque to the API by
 *  design. `format` names which adapter produced it (e.g.
 *  "lightweight-charts") -- so a future rendering-library swap can tell
 *  which shape a stored record uses without another schema cutover. */
export interface SavedDrawing {
  format?: string;
  name: string;
  points?: { timestamp?: number; value?: number }[];
  styles?: Record<string, unknown>;
  extendData?: unknown;
  lock?: boolean;
  groupId?: string;
}

/** An indicator attached via Pine -- there is no fixed catalog to look a
 *  name up in under the PineTS model, so the source itself is what's saved. */
/** Per-plot appearance override -- TradingView's Style tab, one row per
 *  real plot() the script produced. Pure rendering: unlike `params`,
 *  changing this never re-runs the sandbox. `lineWidth` is capped at 4
 *  (Lightweight Charts' own LineWidth type only accepts 1|2|3|4). */
export interface PlotStyleOverride {
  color?: string;
  lineWidth?: number;
  visible?: boolean;
}

export interface AttachedIndicator {
  id: string;
  source: string;
  label: string;
  pane: "main" | "sub" | "volume";
  /** User overrides for this script's own input.*() declarations, keyed by
   *  varId (e.g. { length: 50 }) -- TradingView-style per-instance settings.
   *  Absent/empty means "run with the script's own defaults". */
  params?: Record<string, unknown>;
  /** Per-plot color/width/visibility, keyed by the plot's own title (e.g.
   *  "Average"). Absent means "use the auto-assigned palette color". */
  style?: Record<string, PlotStyleOverride>;
  /** TradingView's Visibility tab, scoped to this app's real fixed interval
   *  set (see lib/periods.ts's INTERVALS) rather than an open-ended
   *  tick/second/custom range this app has no equivalent chart state for.
   *  Both bounds inclusive; either absent means "no bound on that side". */
  visibility?: { minInterval?: string; maxInterval?: string };
}

export interface ChartLayout {
  symbol: string;
  exchange: string;
  drawings: SavedDrawing[];
  indicators: AttachedIndicator[];
  /** Bumped on every save. Send it back to prove the copy being replaced is current. */
  version: number;
  updatedAt: string | null;
}

export const getChartLayout = (symbol: string) =>
  req<ChartLayout>(`/api/chart-layouts/${encodeURIComponent(symbol)}`);

/**
 * Replace the saved chart.
 *
 * A stale `version` is rejected with 409 rather than applied: two tabs open on
 * the same chart would otherwise overwrite each other, and the loser would
 * never learn their drawings were gone.
 */
export const saveChartLayout = (
  symbol: string,
  body: { exchange: string; drawings: SavedDrawing[]; indicators: AttachedIndicator[]; version: number },
) =>
  req<ChartLayout>(`/api/chart-layouts/${encodeURIComponent(symbol)}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });

export const clearChartLayout = (symbol: string) =>
  req<ChartLayout>(`/api/chart-layouts/${encodeURIComponent(symbol)}`, { method: "DELETE" });
