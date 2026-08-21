import type { ApiOhlcBar } from "@/lib/api";
import type { ChatDrawing } from "@/lib/api/chat";
import type { SavedDrawing } from "@/lib/api/charts";

export type PeriodType = "minute" | "hour" | "day" | "week" | "month";
export type ManualDrawKind = "trendline" | "ray" | "hline" | "fib" | "rect";

export interface ChartMountOptions {
  bars: ApiOhlcBar[];
  onLoadMore?: (oldestTimestampMs: number) => Promise<ApiOhlcBar[]>;
}

export interface PriceLevels {
  entry?: number;
  target?: number;
  stopLoss?: number;
}

/** A Pine-authored indicator, attached by source rather than a catalog
 *  name -- there is no catalog under the PineTS model. `id` is stable
 *  across saves/restores, chosen by the caller. */
export interface PineIndicatorSpec {
  id: string;
  source: string;
  label: string;
  pane: "main" | "sub";
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

  addDrawings(drawings: ChatDrawing[], groupId: string): void;
  startManualDraw(kind: ManualDrawKind, groupId: string, onChange: () => void): void;
  removeDrawingsByGroup(groupId: string): void;
  removeDrawingsWhere(predicate: (groupId: string) => boolean): void;
  listSavedDrawings(groupIds: string[]): SavedDrawing[];
  restoreDrawings(drawings: SavedDrawing[]): void;
}
