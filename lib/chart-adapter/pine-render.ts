import { HistogramSeries, LineSeries, type IChartApi, type ISeriesApi, type SeriesType, type UTCTimestamp } from "lightweight-charts";
import type { PinePlotPoint } from "@/lib/api/pine";
import { INDICATOR_COLORS } from "./palette";
import { createBandFillPrimitive, type DrawPoint } from "./drawing-primitives";

const BAND_SUFFIX = /^(.*) (Upper|Lower)$/;

// Standard TradingView overbought/oversold (or zero-cross) guide lines, keyed
// by the plot title -- our own catalog.ts naming, not something PineTS's
// output carries. Values confirmed against TradingView's own published
// defaults: RSI 70/30, Stochastic 80/20, CCI +-100, Williams %R -20/-80.
const REFERENCE_LEVELS: Record<string, number[]> = {
  RSI: [30, 70],
  "Stoch %K": [20, 80],
  CCI: [-100, 100],
  "%R": [-80, -20],
  MFI: [20, 80],
  "%B": [0, 1],
  MACD: [0],
  Momentum: [0],
  ROC: [0],
  CMO: [0],
  TSI: [0],
  "EMA Diff": [0],
};

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

/** Both sides of a band come from the same PineTS run over the same bars,
 *  so they're the same length in the same order -- this only drops the
 *  positions where either side hasn't warmed up yet, keeping the two
 *  arrays zipped for the fill primitive's segment-by-segment walk. */
function alignedBandPoints(a: PinePlotPoint[], b: PinePlotPoint[]): { a: DrawPoint[]; b: DrawPoint[] } {
  const outA: DrawPoint[] = [];
  const outB: DrawPoint[] = [];
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const av = a[i].value, bv = b[i].value;
    if (av == null || bv == null || !Number.isFinite(av) || !Number.isFinite(bv)) continue;
    outA.push({ time: Math.floor(a[i].time / 1000), value: av });
    outB.push({ time: Math.floor(b[i].time / 1000), value: bv });
  }
  return { a: outA, b: outB };
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
    // TradingView plots Parabolic SAR as discrete dots above/below price,
    // never a connected line -- a line implies a false continuity between
    // one bar's stop level and the next, which isn't how SAR is read.
    const isSar = name === "SAR";
    // Supertrend's up/down segments are TradingView's one fixed convention
    // (green while price is above it, red while below), not a palette
    // choice -- overrides the generic per-line color cycling below.
    const supertrendColor = name === "Supertrend Up" ? "#16c784" : name === "Supertrend Down" ? "#f0525d" : undefined;
    const series = chart.addSeries(LineSeries, {
      title: name,
      ...scaleOpt,
      ...(isSar ? { lineVisible: false, pointMarkersVisible: true, pointMarkersRadius: 2 } : {}),
      ...(supertrendColor ? { color: supertrendColor } : nextLineColor()),
    }, paneIndex);
    series.setData(toSeriesData(points));
    for (const level of REFERENCE_LEVELS[name] ?? []) {
      series.createPriceLine({ price: level, color: "#8b8a9e99", lineStyle: 2, lineWidth: 1 });
    }
    out.push(series);
  }

  // Both sides of one channel share a single color -- TradingView draws
  // Bollinger/Keltner bounds as one band, not two independently-colored
  // series, so upper and lower stay tied together visually.
  const bandColor = colorIndex == null ? undefined : INDICATOR_COLORS[colorIndex % INDICATOR_COLORS.length];
  const bandColorOpt = bandColor ? { color: bandColor } : {};
  for (const [base, { upper, lower }] of bandPairs) {
    if (!upper || !lower) continue; // one side missing -- not a real band, skip rather than guess
    const upperSeries = chart.addSeries(LineSeries, { title: `${base} Upper`, ...scaleOpt, ...bandColorOpt }, paneIndex);
    upperSeries.setData(toSeriesData(upper));
    const lowerSeries = chart.addSeries(LineSeries, { title: `${base} Lower`, ...scaleOpt, ...bandColorOpt }, paneIndex);
    lowerSeries.setData(toSeriesData(lower));
    out.push(upperSeries, lowerSeries);

    // The filled channel itself -- Ichimoku's "Cloud" gets TradingView's
    // real bullish-green/bearish-red two-tone (Span A above/below Span B);
    // every other band (Bollinger, Keltner) is one translucent tint of its
    // own line color, since both bounds are one channel, not two signals.
    const { a, b } = alignedBandPoints(upper, lower);
    const fill = createBandFillPrimitive(
      base === "Cloud"
        ? { a, b, colorAAboveB: "#16c78433", colorBAboveA: "#f0525d33" }
        : { a, b, colorAAboveB: `${bandColor ?? "#8b8a9e"}22` },
    );
    upperSeries.attachPrimitive(fill);
  }

  return out;
}
