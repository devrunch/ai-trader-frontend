import type { ChartRendererFactory, ChartTypeId } from "./types";
import { createCandlesRenderer } from "./candles";
import { createLineRenderer } from "./line";
import { createAreaRenderer } from "./area";

/** id -> label -> factory, in picker display order. Only types with a real,
 *  working factory belong here -- see ChartTypeId's own comment for the
 *  full target list this is a subset of. Adding a type means adding its
 *  own small renderer file plus one line here; nothing else in the adapter
 *  changes. */
export const CHART_TYPES: { id: ChartTypeId; label: string; create: ChartRendererFactory }[] = [
  { id: "candles", label: "Candles", create: createCandlesRenderer },
  { id: "line", label: "Line", create: createLineRenderer },
  { id: "area", label: "Area", create: createAreaRenderer },
];

const BY_ID = new Map(CHART_TYPES.map((t) => [t.id, t.create]));

/** Unknown/not-yet-built id falls back to Candles -- the same "degrade to
 *  the known-good default" this app already applies to a saved indicator
 *  visibility range it can't evaluate, or a period label it doesn't
 *  recognize, rather than a blank chart. */
export function rendererFor(id: ChartTypeId): ChartRendererFactory {
  return BY_ID.get(id) ?? createCandlesRenderer;
}
