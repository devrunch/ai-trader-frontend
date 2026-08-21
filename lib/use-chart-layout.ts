"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChartAdapter } from "@/lib/chart-adapter/types";
import {
  ApiError,
  clearChartLayout,
  getChartLayout,
  saveChartLayout,
  type SavedDrawing,
} from "./api";

/**
 * Chart state that survives a reload.
 *
 * Everything on the chart — the user's trend lines, the marks the agent placed
 * to explain an answer, which indicators are showing — used to live in
 * KLineChart's memory and nowhere else. A refresh wiped a line the user had
 * spent a minute placing.
 *
 * A hook rather than page code because it owns a lifecycle the page has no
 * reason to hold: a debounce timer, a version for conflict detection, and the
 * rule that a restore must never be mistaken for a change worth saving.
 */

/** Drawings are saved after the user stops, not on every pixel of a drag. */
const SAVE_DEBOUNCE_MS = 1200;

/** Overlay groups worth keeping. Anything else is transient chrome. */
const SAVED_GROUPS = ["draw", "ai"] as const;

export interface ChartLayoutState {
  /** Ask for a save. Debounced, and ignored while the chart is still restoring. */
  scheduleSave: () => void;
  /** Forget this chart entirely — the "clear drawings" button, made durable. */
  clear: () => void;
  /**
   * True once another tab has saved over this one. Auto-saving stops: the
   * alternative is one tab silently destroying the other's work.
   */
  conflict: boolean;
}

export function useChartLayout({
  symbol,
  exchange,
  chartRef,
  chartReady,
  indicators,
  onRestoreIndicators,
}: {
  symbol: string;
  exchange: string;
  chartRef: React.RefObject<ChartAdapter | null>;
  /** Bumped when the chart instance is (re)created, so a restore can wait for it. */
  chartReady: number;
  indicators: string[];
  onRestoreIndicators: (names: string[]) => void;
}): ChartLayoutState {
  const [conflict, setConflict] = useState(false);
  const version = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Guards the window between "restore started" and "restore applied". */
  const restoring = useRef(true);

  /* Restore. Runs when the symbol changes or the chart is rebuilt — a restore
     into a chart that does not exist yet silently draws nothing. */
  useEffect(() => {
    if (!chartReady) return;
    let alive = true;
    restoring.current = true;

    getChartLayout(symbol)
      .then((layout) => {
        const chart = chartRef.current;
        if (!alive || !chart) return;

        version.current = layout.version;
        setConflict(false);

        // Locking is the adapter's own concern for a restore (every restored
        // drawing is a record of what was drawn, never a half-dragged one the
        // user is still placing) — restoreDrawings applies that consistently.
        chart.restoreDrawings(layout.drawings);
        if (layout.indicators.length) onRestoreIndicators(layout.indicators);
      })
      // A chart we could not restore is not worth an error banner over the
      // thing the user came here to do. It simply starts empty.
      .catch(() => undefined)
      .finally(() => {
        if (alive) restoring.current = false;
      });

    return () => {
      alive = false;
    };
    // `onRestoreIndicators` is deliberately excluded: it is recreated on every
    // render of the page, and including it would restore in a loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, chartReady, chartRef]);

  const save = useCallback(() => {
    const chart = chartRef.current;
    if (!chart || restoring.current || conflict) return;

    const drawings: SavedDrawing[] = chart.listSavedDrawings([...SAVED_GROUPS]);

    saveChartLayout(symbol, { exchange, drawings, indicators, version: version.current })
      .then((saved) => {
        version.current = saved.version;
      })
      .catch((err) => {
        // 409: another tab saved first. Stop writing rather than clobber it.
        if (err instanceof ApiError && err.status === 409) setConflict(true);
      });
  }, [chartRef, conflict, exchange, indicators, symbol]);

  const scheduleSave = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(save, SAVE_DEBOUNCE_MS);
  }, [save]);

  /* Indicator toggles are discrete choices, so they save on their own. */
  useEffect(() => {
    if (restoring.current) return;
    scheduleSave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indicators.join(",")]);

  /* A pending save must not fire after the user has navigated away. */
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    clearChartLayout(symbol)
      .then(() => {
        version.current = 0;
        setConflict(false);
      })
      .catch(() => undefined);
  }, [symbol]);

  return { scheduleSave, clear, conflict };
}
