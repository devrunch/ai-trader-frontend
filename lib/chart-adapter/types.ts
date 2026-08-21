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

/**
 * Everything a chart consumer needs, with zero library-specific types
 * crossing the boundary. Implemented today by KlinechartsAdapter (this
 * task), and by LightweightChartsAdapter later (Task 5) with no change
 * required here or in any consumer.
 */
export interface ChartAdapter {
  mount(el: HTMLElement, options: ChartMountOptions): Promise<void>;
  dispose(): void;
  resize(): void;

  setPriceLevels(levels: PriceLevels): void;
  pushLiveTick(price: number): void;

  setIndicators(names: string[]): void;
  /** An agent-authored diascript formula, registered and attached by name —
   *  distinct from setIndicators' fixed built-in names. Returns the instance
   *  id (for the caller's own attached-tracking) or null if attach failed. */
  attachCustomIndicator(spec: { name: string; source: string; outputName: string; pane: "main" | "sub" }): Promise<string | null>;

  addDrawings(drawings: ChatDrawing[], groupId: string): void;
  startManualDraw(kind: ManualDrawKind, groupId: string, onChange: () => void): void;
  removeDrawingsByGroup(groupId: string): void;
  removeDrawingsWhere(predicate: (groupId: string) => boolean): void;
  listSavedDrawings(groupIds: string[]): SavedDrawing[];
  restoreDrawings(drawings: SavedDrawing[]): void;
}
