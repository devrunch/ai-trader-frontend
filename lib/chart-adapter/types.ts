import type { ApiOhlcBar } from "@/lib/api";
import type { ChatDrawing } from "@/lib/api/chat";
import type { SavedDrawing } from "@/lib/api/charts";
import type { VolumeProfileMode } from "./volume-profile-primitive";

export type { VolumeProfileMode };

export type PeriodType = "minute" | "hour" | "day" | "week" | "month";
export type ManualDrawKind = "trendline" | "ray" | "hline" | "fib" | "rect";

export interface ChartMountOptions {
  bars: ApiOhlcBar[];
  onLoadMore?: (oldestTimestampMs: number) => Promise<ApiOhlcBar[]>;
  /** Fires on every crosshair move with the bar under the cursor, or `null`
   *  when the cursor leaves the chart -- lets the caller render a TradingView-
   *  style OHLCV readout without reaching into the chart library itself. */
  onCrosshairMove?: (bar: ApiOhlcBar | null) => void;
}

export interface PriceLevels {
  entry?: number;
  target?: number;
  stopLoss?: number;
}

/** One sub-pane's real on-screen geometry, for floating a per-pane toolbar
 *  (collapse/fullscreen/move/delete) over it. `indicatorId` is set when the
 *  pane holds exactly one sub-pane Pine indicator (the only way a pane gets
 *  created beyond pane 0) -- the toolbar's delete button routes through the
 *  same id-based remove path the legend's delete button uses, rather than a
 *  separate pane-index-based removal. */
export interface PaneRect {
  index: number;
  top: number;
  height: number;
  indicatorId?: string;
}

/** A Pine-authored indicator, attached by source rather than a catalog
 *  name -- there is no catalog under the PineTS model. `id` is stable
 *  across saves/restores, chosen by the caller. `pane: "volume"` overlays
 *  the plot on the volume histogram's own price scale (pane 0, sharing the
 *  volume axis) instead of the main price axis or a fresh sub-pane -- e.g.
 *  Spread drawn against the volume bars rather than against price. */
export interface PineIndicatorSpec {
  id: string;
  source: string;
  label: string;
  pane: "main" | "sub" | "volume";
}

/**
 * Everything a chart consumer needs, with zero library-specific types
 * crossing the boundary. Implemented by LightweightChartsAdapter.
 */
export interface ChartAdapter {
  mount(el: HTMLElement, options: ChartMountOptions): Promise<void>;
  dispose(): void;
  resize(): void;

  setPriceLevels(levels: PriceLevels): void;
  pushLiveTick(price: number): void;

  /** Attach/remove one Pine-authored indicator by source -- there is no
   *  fixed catalog to name against, so every indicator beyond the default
   *  candle+volume view is attached individually. */
  attachPineIndicator(spec: PineIndicatorSpec): Promise<string>;
  removeIndicator(id: string): void;

  /** Volume Profile: a price-bucketed histogram, not expressible as a Pine
   *  plot() (no time axis of its own) -- its own adapter methods rather than
   *  going through attachPineIndicator. Several modes can be attached at
   *  once (e.g. Session alongside Visible Range), each independently keyed
   *  by `id`, same as Pine indicators. */
  attachVolumeProfile(id: string, mode: VolumeProfileMode): void;
  removeVolumeProfile(id: string): void;

  /** Show/hide an attached indicator (Pine or Volume Profile) without
   *  detaching it -- the chart legend's eye toggle. */
  setIndicatorVisible(id: string, visible: boolean): void;

  /** Real on-screen geometry of every pane, index 0 (candle+volume) included
   *  -- recomputed live from the chart's own layout on every call, never
   *  cached, since panes resize/reorder/appear/disappear constantly. Callers
   *  filter to index > 0 for the per-pane toolbar; pane 0 has no toolbar. */
  getPaneRects(): PaneRect[];
  togglePaneCollapsed(index: number): void;
  togglePaneFullscreen(index: number): void;
  movePane(index: number, direction: "up" | "down"): void;

  /** Recolors the volume histogram using Volume Spread Analysis (spread x
   *  volume, relative to each bar's own recent history) instead of plain
   *  up/down coloring. A toggle on the shared volume series, not a
   *  separately-attached id -- there's only ever one volume histogram to
   *  recolor. */
  setVolumeSpreadAnalysis(enabled: boolean): void;

  addDrawings(drawings: ChatDrawing[], groupId: string): void;
  startManualDraw(kind: ManualDrawKind, groupId: string, onChange: () => void): void;
  removeDrawingsByGroup(groupId: string): void;
  removeDrawingsWhere(predicate: (groupId: string) => boolean): void;
  listSavedDrawings(groupIds: string[]): SavedDrawing[];
  restoreDrawings(drawings: SavedDrawing[]): void;
}
