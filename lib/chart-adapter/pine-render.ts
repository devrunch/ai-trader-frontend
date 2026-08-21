import { LineSeries, type IChartApi, type ISeriesApi, type SeriesType, type UTCTimestamp } from "lightweight-charts";

const BAND_SUFFIX = /^(.*) (Upper|Lower)$/;

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
  plots: Record<string, number[]>,
  times: number[],
): ISeriesApi<SeriesType>[] {
  const out: ISeriesApi<SeriesType>[] = [];
  const bandPairs = new Map<string, { upper?: number[]; lower?: number[] }>();
  const plain: [string, number[]][] = [];

  for (const [name, values] of Object.entries(plots)) {
    const match = name.match(BAND_SUFFIX);
    if (match) {
      const [, base, side] = match;
      const entry = bandPairs.get(base) ?? {};
      entry[side.toLowerCase() as "upper" | "lower"] = values;
      bandPairs.set(base, entry);
    } else {
      plain.push([name, values]);
    }
  }

  for (const [name, values] of plain) {
    const series = chart.addSeries(LineSeries, { title: name }, paneIndex);
    series.setData(values.map((value, i) => ({ time: times[i] as UTCTimestamp, value })));
    out.push(series);
  }

  for (const [base, { upper, lower }] of bandPairs) {
    if (!upper || !lower) continue; // one side missing -- not a real band, skip rather than guess
    const upperSeries = chart.addSeries(LineSeries, { title: `${base} Upper` }, paneIndex);
    upperSeries.setData(upper.map((value, i) => ({ time: times[i] as UTCTimestamp, value })));
    const lowerSeries = chart.addSeries(LineSeries, { title: `${base} Lower` }, paneIndex);
    lowerSeries.setData(lower.map((value, i) => ({ time: times[i] as UTCTimestamp, value })));
    out.push(upperSeries, lowerSeries);
  }

  return out;
}
