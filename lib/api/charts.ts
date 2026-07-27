import { req } from "./client";

/* ── Chart layouts: what the user has on their chart, kept ── */

/** One overlay, in KLineChart's own shape. Opaque to the API by design. */
export interface SavedDrawing {
  name: string;
  points?: { timestamp?: number; value?: number }[];
  styles?: Record<string, unknown>;
  extendData?: unknown;
  lock?: boolean;
  groupId?: string;
}

export interface ChartLayout {
  symbol: string;
  exchange: string;
  drawings: SavedDrawing[];
  indicators: string[];
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
  body: { exchange: string; drawings: SavedDrawing[]; indicators: string[]; version: number },
) =>
  req<ChartLayout>(`/api/chart-layouts/${encodeURIComponent(symbol)}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });

export const clearChartLayout = (symbol: string) =>
  req<ChartLayout>(`/api/chart-layouts/${encodeURIComponent(symbol)}`, { method: "DELETE" });
