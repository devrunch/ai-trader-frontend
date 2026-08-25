import { LineSeries } from "lightweight-charts";
import type { ApiOhlcBar } from "@/lib/api";
import type { ChartRendererFactory } from "./types";
import { strictlyIncreasingTime, defaultBoxSize, type Brick } from "./brick-utils";

const YANG = "#16c784"; // rising line
const YIN = "#f0525d";  // falling line

interface KagiPoint { time: number; value: number; direction: 1 | -1 }

/** Kagi: a single zigzag line that only turns once price reverses by a
 *  fixed amount against the current direction (`defaultBoxSize`'s same
 *  auto-sized default, no settings UI wired yet). Real Kagi charts also
 *  vary LINE WIDTH by yang/yin (thick when price breaks the previous
 *  shoulder/waist, thin otherwise) -- LWC's LineSeries has one width for
 *  the whole series, not per-segment, so this keeps a fixed width and
 *  color-codes each segment yang/yin instead (LineData's own per-point
 *  `color`), the closest honest analog available. */
function computeKagi(bars: ApiOhlcBar[]): KagiPoint[] {
  if (bars.length === 0) return [];
  const reversal = defaultBoxSize(bars);
  const points: KagiPoint[] = [];
  let direction: 1 | -1 = 1;
  let extreme = bars[0].close;
  points.push({ time: bars[0].time, value: extreme, direction });

  for (let i = 1; i < bars.length; i++) {
    const price = bars[i].close;
    if (direction === 1) {
      if (price > extreme) { extreme = price; points.push({ time: bars[i].time, value: price, direction }); }
      else if (extreme - price >= reversal) { direction = -1; extreme = price; points.push({ time: bars[i].time, value: price, direction }); }
    } else {
      if (price < extreme) { extreme = price; points.push({ time: bars[i].time, value: price, direction }); }
      else if (price - extreme >= reversal) { direction = 1; extreme = price; points.push({ time: bars[i].time, value: price, direction }); }
    }
  }
  return points;
}

// Reuses Brick's own dedupe-time logic -- a Kagi point is really just a
// zero-height brick (open === close) for this purpose, so the same
// strictly-increasing-time fix applies unchanged.
const toBrick = (p: KagiPoint): Brick => ({ time: p.time, open: p.value, high: p.value, low: p.value, close: p.value });
const toPoint = (p: KagiPoint, time: number) => ({ time: time as never, value: p.value, color: p.direction === 1 ? YANG : YIN });

function render(bars: ApiOhlcBar[]) {
  const points = computeKagi(bars);
  const fixed = strictlyIncreasingTime(points.map(toBrick));
  return points.map((p, i) => toPoint(p, fixed[i].time));
}

export const createKagiRenderer: ChartRendererFactory = (chart, bars) => {
  let liveBars = bars;
  const series = chart.addSeries(LineSeries, { color: YANG, lineWidth: 2 });
  series.setData(render(bars));

  return {
    series,
    setData: (newBars) => { liveBars = newBars; series.setData(render(newBars)); },
    updateBar: (bar) => {
      liveBars = liveBars.length > 0 && liveBars[liveBars.length - 1].time === bar.time
        ? [...liveBars.slice(0, -1), bar]
        : [...liveBars, bar];
      series.setData(render(liveBars));
    },
  };
};
