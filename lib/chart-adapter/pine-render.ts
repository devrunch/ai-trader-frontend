import { LineSeries, type IChartApi, type ISeriesApi, type SeriesType, type UTCTimestamp } from "lightweight-charts";
import type { PinePlotPoint } from "@/lib/api/pine";

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
): ISeriesApi<SeriesType>[] {
  const out: ISeriesApi<SeriesType>[] = [];
  const bandPairs = new Map<string, { upper?: PinePlotPoint[]; lower?: PinePlotPoint[] }>();
  const plain: [string, PinePlotPoint[]][] = [];

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
    const series = chart.addSeries(LineSeries, { title: name }, paneIndex);
    series.setData(toSeriesData(points));
    out.push(series);
  }

  for (const [base, { upper, lower }] of bandPairs) {
    if (!upper || !lower) continue; // one side missing -- not a real band, skip rather than guess
    const upperSeries = chart.addSeries(LineSeries, { title: `${base} Upper` }, paneIndex);
    upperSeries.setData(toSeriesData(upper));
    const lowerSeries = chart.addSeries(LineSeries, { title: `${base} Lower` }, paneIndex);
    lowerSeries.setData(toSeriesData(lower));
    out.push(upperSeries, lowerSeries);
  }

  return out;
}
