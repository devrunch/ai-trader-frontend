import type { ChartRendererFactory, ChartTypeId } from "./types";
import { createCandlesRenderer } from "./candles";
import { createLineRenderer } from "./line";
import { createAreaRenderer } from "./area";
import { createBarsRenderer } from "./bars";
import { createBaselineRenderer } from "./baseline";
import { createColumnsRenderer } from "./columns";
import { createStepLineRenderer } from "./step-line";
import { createLineMarkersRenderer } from "./line-markers";

/** id -> label -> factory, in picker display order. Only types with a real,
 *  working factory belong here -- see ChartTypeId's own comment for the
 *  full target list this is a subset of. Adding a type means adding its
 *  own small renderer file plus one line here; nothing else in the adapter
 *  changes. */
export const CHART_TYPES: { id: ChartTypeId; label: string; create: ChartRendererFactory }[] = [
  { id: "candles", label: "Candles", create: createCandlesRenderer },
  { id: "bars", label: "Bars", create: createBarsRenderer },
  { id: "line", label: "Line", create: createLineRenderer },
  { id: "line-markers", label: "Line with Markers", create: createLineMarkersRenderer },
  { id: "step-line", label: "Step Line", create: createStepLineRenderer },
  { id: "area", label: "Area", create: createAreaRenderer },
  { id: "baseline", label: "Baseline", create: createBaselineRenderer },
  { id: "columns", label: "Columns", create: createColumnsRenderer },
];

const BY_ID = new Map(CHART_TYPES.map((t) => [t.id, t.create]));

/** Unknown/not-yet-built id falls back to Candles -- the same "degrade to
 *  the known-good default" this app already applies to a saved indicator
 *  visibility range it can't evaluate, or a period label it doesn't
 *  recognize, rather than a blank chart. */
export function rendererFor(id: ChartTypeId): ChartRendererFactory {
  return BY_ID.get(id) ?? createCandlesRenderer;
}
