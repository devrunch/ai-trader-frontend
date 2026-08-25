import { LineSeries } from "lightweight-charts";
import type { ISeriesPrimitive, IPrimitivePaneView, Time, SeriesAttachedParameter, IChartApi } from "lightweight-charts";
import type { CanvasRenderingTarget2D } from "fancy-canvas";
import type { ApiOhlcBar } from "@/lib/api";
import type { ChartRendererFactory } from "./types";
import { defaultBoxSize, strictlyIncreasingTime } from "./brick-utils";

const REVERSAL_BOXES = 3; // standard "3-box reversal" convention
const X_COLOR = "#16c784";
const O_COLOR = "#f0525d";

interface PnfColumn { time: number; direction: 1 | -1; boxes: number[] }

/** Point & Figure: X columns for a sustained rise, O columns for a
 *  sustained fall, a new column only once price reverses by a full
 *  `REVERSAL_BOXES` boxes against the current column's own extreme --
 *  standard "1-box, 3-box-reversal" method, built from each bar's own
 *  CLOSE (this app has no intrabar tick feed to catch a box crossed and
 *  reversed within a single bar, the same limitation the rest of this
 *  synthetic-axis family already carries). */
function computePointFigure(bars: ApiOhlcBar[], boxSize: number): PnfColumn[] {
  if (bars.length === 0 || boxSize <= 0) return [];
  const level = (price: number) => Math.round(price / boxSize) * boxSize;
  const columns: PnfColumn[] = [];
  let direction: 1 | -1 | null = null;
  let boxes: number[] = [];
  let colTime = bars[0].time;

  for (const b of bars) {
    const lvl = level(b.close);
    colTime = b.time;
    if (direction === null) { direction = 1; boxes = [lvl]; continue; }

    if (direction === 1) {
      while (lvl > boxes[boxes.length - 1]) boxes.push(boxes[boxes.length - 1] + boxSize);
      const top = boxes[boxes.length - 1];
      if (lvl <= top - REVERSAL_BOXES * boxSize) {
        columns.push({ time: colTime, direction, boxes });
        direction = -1;
        boxes = [top - boxSize];
        while (lvl < boxes[boxes.length - 1]) boxes.push(boxes[boxes.length - 1] - boxSize);
      }
    } else {
      while (lvl < boxes[boxes.length - 1]) boxes.push(boxes[boxes.length - 1] - boxSize);
      const bottom = boxes[boxes.length - 1];
      if (lvl >= bottom + REVERSAL_BOXES * boxSize) {
        columns.push({ time: colTime, direction, boxes });
        direction = 1;
        boxes = [bottom + boxSize];
        while (lvl > boxes[boxes.length - 1]) boxes.push(boxes[boxes.length - 1] + boxSize);
      }
    }
  }
  if (direction !== null) columns.push({ time: colTime, direction, boxes });
  return fixColumnTimes(columns);
}

/** A single-bar reversal pushes the just-finished column AND (at loop end,
 *  or on the very next bar) starts building the new one off the SAME bar's
 *  real time -- two adjacent columns can end up sharing one timestamp,
 *  which LWC's strictly-ascending-time requirement (both for the anchor
 *  series' own data and for the primitive's x-position lookups, which must
 *  agree with it) doesn't allow. Reuses Brick's own dedupe logic via a
 *  degenerate zero-height brick per column. */
function fixColumnTimes(columns: PnfColumn[]): PnfColumn[] {
  const fixed = strictlyIncreasingTime(
    columns.map((c) => ({ time: c.time, open: 0, high: 0, low: 0, close: 0 })),
  );
  return columns.map((c, i) => (fixed[i].time === c.time ? c : { ...c, time: fixed[i].time }));
}

function createPointFigurePrimitive(getColumns: () => PnfColumn[], boxSize: number): ISeriesPrimitive<Time> {
  let attached: SeriesAttachedParameter<Time> | null = null;
  return {
    attached(param) { attached = param; param.requestUpdate(); },
    detached() { attached = null; },
    paneViews(): readonly IPrimitivePaneView[] {
      return [{
        renderer() {
          return {
            draw(target: CanvasRenderingTarget2D) {
              target.useBitmapCoordinateSpace((scope) => {
                if (!attached) return;
                const { series, chart } = attached;
                const columns = getColumns();
                if (columns.length === 0) return;
                const ctx = scope.context;
                ctx.save();
                ctx.scale(scope.horizontalPixelRatio, scope.verticalPixelRatio);

                const anchorLevel = columns[columns.length - 1].boxes[0];
                const y1 = series.priceToCoordinate(anchorLevel);
                const y2 = series.priceToCoordinate(anchorLevel + boxSize);
                const boxPx = y1 != null && y2 != null ? Math.max(4, Math.abs(y1 - y2)) : 8;

                ctx.lineWidth = Math.max(1, boxPx * 0.12);
                for (const col of columns) {
                  const x = chart.timeScale().timeToCoordinate(col.time as Time);
                  if (x == null) continue;
                  ctx.strokeStyle = col.direction === 1 ? X_COLOR : O_COLOR;
                  for (const level of col.boxes) {
                    const y = series.priceToCoordinate(level);
                    if (y == null) continue;
                    const r = boxPx * 0.34;
                    if (col.direction === 1) {
                      ctx.beginPath();
                      ctx.moveTo(x - r, y - r); ctx.lineTo(x + r, y + r);
                      ctx.moveTo(x + r, y - r); ctx.lineTo(x - r, y + r);
                      ctx.stroke();
                    } else {
                      ctx.beginPath();
                      ctx.arc(x, y, r, 0, Math.PI * 2);
                      ctx.stroke();
                    }
                  }
                }
                ctx.restore();
              });
            },
          };
        },
      }];
    },
  };
}

function pnfAutoscaleInfo(chart: IChartApi, getColumns: () => PnfColumn[]) {
  return () => {
    const columns = getColumns();
    if (columns.length === 0) return null;
    const visible = chart.timeScale().getVisibleRange();
    const from = visible ? (visible.from as unknown as number) : -Infinity;
    const to = visible ? (visible.to as unknown as number) : Infinity;
    let lo = Infinity, hi = -Infinity;
    for (const col of columns) {
      if (col.time < from || col.time > to) continue;
      for (const level of col.boxes) { if (level < lo) lo = level; if (level > hi) hi = level; }
    }
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) {
      for (const col of columns) for (const level of col.boxes) { if (level < lo) lo = level; if (level > hi) hi = level; }
    }
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) return null;
    return { priceRange: { minValue: lo, maxValue: hi } };
  };
}

export const createPointFigureRenderer: ChartRendererFactory = (chart, bars) => {
  let liveBars = bars;
  let boxSize = defaultBoxSize(bars);
  let columns: PnfColumn[] = computePointFigure(bars, boxSize);
  const getColumns = () => columns;

  const series = chart.addSeries(LineSeries, {
    lineVisible: false, pointMarkersVisible: false,
    autoscaleInfoProvider: pnfAutoscaleInfo(chart, getColumns),
  });
  // The anchor series needs SOME data for LWC to keep the pane alive --
  // one invisible point per column, at that column's own midpoint. The
  // primitive above is what actually draws the X/O grid; this line is
  // never seen (lineVisible: false).
  const anchorPoint = (col: PnfColumn) => ({ time: col.time as never, value: (col.boxes[0] + col.boxes[col.boxes.length - 1]) / 2 });
  series.setData(columns.map(anchorPoint));
  series.attachPrimitive(createPointFigurePrimitive(getColumns, boxSize));

  return {
    series,
    setData: (newBars) => {
      liveBars = newBars;
      boxSize = defaultBoxSize(newBars);
      columns = computePointFigure(newBars, boxSize);
      series.setData(columns.map(anchorPoint));
    },
    updateBar: (bar) => {
      liveBars = liveBars.length > 0 && liveBars[liveBars.length - 1].time === bar.time
        ? [...liveBars.slice(0, -1), bar]
        : [...liveBars, bar];
      columns = computePointFigure(liveBars, boxSize);
      series.setData(columns.map(anchorPoint));
    },
  };
};
