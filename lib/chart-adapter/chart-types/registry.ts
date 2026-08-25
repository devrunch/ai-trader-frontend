import type { ChartRendererFactory, ChartTypeId } from "./types";
import { createCandlesRenderer } from "./candles";
import { createHollowCandlesRenderer } from "./hollow-candles";
import { createVolumeCandlesRenderer } from "./volume-candles";
import { createHeikinAshiRenderer } from "./heikin-ashi";
import { createLineRenderer } from "./line";
import { createAreaRenderer } from "./area";
import { createBarsRenderer } from "./bars";
import { createBaselineRenderer } from "./baseline";
import { createColumnsRenderer } from "./columns";
import { createHighLowRenderer } from "./high-low";
import { createStepLineRenderer } from "./step-line";
import { createLineMarkersRenderer } from "./line-markers";
import { createHlcAreaRenderer } from "./hlc-area";
import { createSessionVolumeProfileRenderer } from "./session-volume-profile";
import { createRenkoRenderer } from "./renko";
import { createRangeRenderer } from "./range";
import { createLineBreakRenderer } from "./line-break";
import { createKagiRenderer } from "./kagi";
import { createPointFigureRenderer } from "./point-figure";
import { createVolumeFootprintRenderer } from "./footprint";
import { createTpoRenderer } from "./tpo";

/** id -> label -> factory, in picker display order (mirrors TradingView's
 *  own menu order for the types both apps have). Only types with a real,
 *  working factory belong here -- see ChartTypeId's own comment for the
 *  full target list this is a subset of. Adding a type means adding its
 *  own small renderer file plus one line here; nothing else in the adapter
 *  changes. */
export const CHART_TYPES: { id: ChartTypeId; label: string; create: ChartRendererFactory }[] = [
  { id: "bars", label: "Bars", create: createBarsRenderer },
  { id: "candles", label: "Candles", create: createCandlesRenderer },
  { id: "hollow-candles", label: "Hollow Candles", create: createHollowCandlesRenderer },
  { id: "volume-candles", label: "Volume Candles", create: createVolumeCandlesRenderer },
  { id: "line", label: "Line", create: createLineRenderer },
  { id: "line-markers", label: "Line with Markers", create: createLineMarkersRenderer },
  { id: "step-line", label: "Step Line", create: createStepLineRenderer },
  { id: "area", label: "Area", create: createAreaRenderer },
  { id: "hlc-area", label: "HLC Area", create: createHlcAreaRenderer },
  { id: "baseline", label: "Baseline", create: createBaselineRenderer },
  { id: "columns", label: "Columns", create: createColumnsRenderer },
  { id: "high-low", label: "High-Low", create: createHighLowRenderer },
  { id: "volume-footprint", label: "Volume Footprint", create: createVolumeFootprintRenderer },
  { id: "tpo", label: "Time Price Opportunity", create: createTpoRenderer },
  { id: "session-volume-profile", label: "Session Volume Profile", create: createSessionVolumeProfileRenderer },
  { id: "heikin-ashi", label: "Heikin Ashi", create: createHeikinAshiRenderer },
  { id: "renko", label: "Renko", create: createRenkoRenderer },
  { id: "line-break", label: "Line Break", create: createLineBreakRenderer },
  { id: "kagi", label: "Kagi", create: createKagiRenderer },
  { id: "point-figure", label: "Point & Figure", create: createPointFigureRenderer },
  { id: "range", label: "Range", create: createRangeRenderer },
];

const BY_ID = new Map(CHART_TYPES.map((t) => [t.id, t.create]));

/** Unknown/not-yet-built id falls back to Candles -- the same "degrade to
 *  the known-good default" this app already applies to a saved indicator
 *  visibility range it can't evaluate, or a period label it doesn't
 *  recognize, rather than a blank chart. */
export function rendererFor(id: ChartTypeId): ChartRendererFactory {
  return BY_ID.get(id) ?? createCandlesRenderer;
}
