import type { ApiOhlcBar } from "@/lib/api";
import type { ChatDrawing } from "@/lib/api/chat";
import type { SavedDrawing } from "@/lib/api/charts";
import type { PineInputMeta } from "@/lib/api/pine";
import type { VolumeProfileMode } from "./volume-profile-primitive";

export type { VolumeProfileMode };

export type PeriodType = "minute" | "hour" | "day" | "week" | "month";
export type ManualDrawKind = "trendline" | "ray" | "hline" | "fib" | "rect";

export interface ChartMountOptions {
  bars: ApiOhlcBar[];
  // Unix SECONDS, matching ApiOhlcBar.time -- see CandlestickChart's own
  // onLoadMore doc comment for why this name matters.
  onLoadMore?: (oldestLoadedTime: number) => Promise<ApiOhlcBar[]>;
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
  /** User overrides for this script's own input.*() declarations, keyed by
   *  varId -- forwarded to runPineIndicator as inputOverrides. Absent means
   *  "run with the script's own defaults". */
  params?: Record<string, unknown>;
  /** Per-plot color/width/visibility, keyed by plot title -- applied to
   *  each matching series right after attach. Absent means "use the
   *  auto-assigned palette color". */
  style?: Record<string, PlotStyleOverride>;
}

/** TradingView's Style tab, one row per real plot() the script produced --
 *  pure rendering, applying this never re-runs the sandbox. `lineWidth` is
 *  capped at 4 (Lightweight Charts' own LineWidth type only accepts
 *  1|2|3|4). */
export interface PlotStyleOverride {
  color?: string;
  lineWidth?: number;
  visible?: boolean;
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
  /** nowSec overrides the wall-clock "is a new candle period starting"
   *  check -- production callers never pass it (real time), tests pass a
   *  fixed value so a sample bar's timestamp from months ago doesn't
   *  always look "expired" against the real clock. */
  pushLiveTick(price: number, nowSec?: number): void;

  /** Which symbol/exchange the chart is currently showing -- lets
   *  attachPineIndicator pass real syminfo through to the sandbox so
   *  scripts reading syminfo.* or timeframe.* resolve real values. Call
   *  whenever the active symbol changes, before attaching any indicator. */
  setActiveSymbol(symbol: string, exchange: string): void;

  /** This indicator's own input.*() declarations (type, title, default,
   *  min/max/options), as parsed by real PineTS at its last successful
   *  attach -- what a settings form renders from. Undefined until the
   *  indicator has attached at least once, or if it has no inputs at all. */
  getIndicatorInputsMeta(id: string): PineInputMeta[] | undefined;

  /** Real plot() titles this indicator's last successful attach produced
   *  (e.g. ["Average", "Close"]) -- what the settings gear's Style tab
   *  renders one row per. Boolean (plotshape()/plotchar()) plots are
   *  markers, not series, and are excluded -- there is nothing to color or
   *  widen for those. */
  getIndicatorPlotNames(id: string): string[];

  /** Recolors/rewidens/hides one plot's own series in place -- pure
   *  rendering, no sandbox re-run. No-ops if `title` doesn't match a
   *  currently-attached series (e.g. the script no longer produces it). */
  setIndicatorPlotStyle(id: string, title: string, style: PlotStyleOverride): void;

  /** Attach/remove one Pine-authored indicator by source -- there is no
   *  fixed catalog to name against, so every indicator beyond the default
   *  candle+volume view is attached individually. */
  /** Resolves to the attached id, or null if the Pine run failed (a bad
   *  script, or the sandbox itself -- network error, timeout, subprocess
   *  crash). Callers must check for null: it used to return the id even on
   *  failure, which meant the indicator silently attached nothing and the
   *  one caller that checked for failure never actually saw one. */
  attachPineIndicator(spec: PineIndicatorSpec): Promise<string | null>;
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
