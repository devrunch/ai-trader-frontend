import { HistogramSeries, LineSeries, type IChartApi, type ISeriesApi, type SeriesType, type UTCTimestamp } from "lightweight-charts";
import type { PinePlotPoint } from "@/lib/api/pine";
import { INDICATOR_COLORS } from "./palette";

const BAND_SUFFIX = /^(.*) (Upper|Lower)$/;

/** Drops warmup-period points (value: null -- e.g. ta.sma's first few bars
 *  before enough history exists, a real and expected state) and converts
 *  PineTS's own ms-epoch time to LWC's UTCTimestamp (seconds). Passing a
 *  null value straight to series.setData() would hand a charting library a
 *  non-number where it expects one; a real gap in a line is representing
 *  "no data yet" by omitting the point, not by forcing a value through. */
function toSeriesData(points: PinePlotPoint[]): { time: UTCTimestamp; value: number }[] {
  return points
    .filter((p): p is { time: number; value: number } => p.value != null && Number.isFinite(p.value))
    .map((p) => ({ time: Math.floor(p.time / 1000) as UTCTimestamp, value: p.value }));
}

/** TradingView's classic 4-tone MACD histogram: green above zero, red below,
 *  each split into a brighter shade when the bar grew from the previous one
 *  and a dimmer shade when it shrank -- momentum direction on top of sign.
 *  A plain LineSeries here would draw a thin wiggling line where TradingView
 *  draws bars, which is what "why only lines" was pointing at. */
function toHistogramData(points: PinePlotPoint[]): { time: UTCTimestamp; value: number; color: string }[] {
  const clean = points.filter((p): p is { time: number; value: number } => p.value != null && Number.isFinite(p.value));
  return clean.map((p, i) => {
    const prevValue = clean[i - 1]?.value;
    const positive = p.value >= 0;
    const growing = prevValue == null || Math.abs(p.value) >= Math.abs(prevValue);
    const color = positive
      ? (growing ? "#16c784" : "#16c78466")
      : (growing ? "#f0525d" : "#f0525d66");
    return { time: Math.floor(p.time / 1000) as UTCTimestamp, value: p.value, color };
  });
}

/**
 * Maps PineTS `ctx.plots` (flat, keyed by plot title) onto Lightweight
 * Charts series. A plain plot() becomes a LineSeries. Two plots named
 * "<x> Upper"/"<x> Lower" become a filled band -- a naming convention this
 * function owns, not something PineTS's output distinguishes on its own
 * (its plots object carries no type metadata beyond the title string).
 *
 * Real Pine fill()/plotshape()/bgcolor() need the Series Primitives API and
 * are follow-up work once this base case is proven (Task 7) -- not attempted
 * here.
 */
export function attachPinePlotsToPane(
  chart: IChartApi,
  paneIndex: number,
  plots: Record<string, PinePlotPoint[]>,
  priceScaleId?: string,
  colorIndex?: number,
): ISeriesApi<SeriesType>[] {
  const out: ISeriesApi<SeriesType>[] = [];
  const bandPairs = new Map<string, { upper?: PinePlotPoint[]; lower?: PinePlotPoint[] }>();
  const plain: [string, PinePlotPoint[]][] = [];
  const scaleOpt = priceScaleId ? { priceScaleId } : {};

  // Every plain plot within this one indicator gets its own hue, cycled from
  // the same palette the legend swatches come from -- was previously one
  // base color at fading alpha steps, which made e.g. MACD's MACD/Signal
  // lines read as "the same color, one a bit see-through" instead of two
  // lines a user can actually tell apart. LWC's own default (a shade of
  // blue) is only used when the caller passes no colorIndex at all -- every
  // real call today does, but existing tests mount plots without one.
  let lineOffset = 0;
  const nextLineColor = () =>
    colorIndex == null ? {} : { color: INDICATOR_COLORS[(colorIndex + lineOffset++) % INDICATOR_COLORS.length] };

  for (const [name, points] of Object.entries(plots)) {
    const match = name.match(BAND_SUFFIX);
    if (match) {
      const [, base, side] = match;
      const entry = bandPairs.get(base) ?? {};
      entry[side.toLowerCase() as "upper" | "lower"] = points;
      bandPairs.set(base, entry);
    } else {
      plain.push([name, points]);
    }
  }

  for (const [name, points] of plain) {
    if (name === "Histogram") {
      const series = chart.addSeries(HistogramSeries, { title: name, ...scaleOpt }, paneIndex);
      series.setData(toHistogramData(points));
      out.push(series);
      continue;
    }
    const series = chart.addSeries(LineSeries, { title: name, ...scaleOpt, ...nextLineColor() }, paneIndex);
    series.setData(toSeriesData(points));
    out.push(series);
  }

  // Both sides of one channel share a single color -- TradingView draws
  // Bollinger/Keltner bounds as one band, not two independently-colored
  // series, so upper and lower stay tied together visually.
  const bandColorOpt = colorIndex == null ? {} : { color: INDICATOR_COLORS[colorIndex % INDICATOR_COLORS.length] };
  for (const [base, { upper, lower }] of bandPairs) {
    if (!upper || !lower) continue; // one side missing -- not a real band, skip rather than guess
    const upperSeries = chart.addSeries(LineSeries, { title: `${base} Upper`, ...scaleOpt, ...bandColorOpt }, paneIndex);
    upperSeries.setData(toSeriesData(upper));
    const lowerSeries = chart.addSeries(LineSeries, { title: `${base} Lower`, ...scaleOpt, ...bandColorOpt }, paneIndex);
    lowerSeries.setData(toSeriesData(lower));
    out.push(upperSeries, lowerSeries);
  }

  return out;
}
