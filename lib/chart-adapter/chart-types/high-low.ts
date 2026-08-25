import { LineSeries } from "lightweight-charts";
import type { ISeriesPrimitive, IPrimitivePaneView, Time, SeriesAttachedParameter, IChartApi } from "lightweight-charts";
import type { CanvasRenderingTarget2D } from "fancy-canvas";
import type { ApiOhlcBar } from "@/lib/api";
import type { ChartRendererFactory } from "./types";

const UP = "#16c784";
const DOWN = "#f0525d";

/** A plain vertical line from low to high, up/down colored, no open/close
 *  ticks at all -- LWC's own BarSeries always draws a close-side tick (only
 *  the open tick can be toggled via `openVisible`), so this can't be a
 *  BarSeries with options tweaked; same custom-primitive approach as HLC
 *  Area for the same reason. */
function createHighLowPrimitive(getBars: () => ApiOhlcBar[]): ISeriesPrimitive<Time> {
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
                const bars = getBars();
                if (bars.length === 0) return;
                const ctx = scope.context;
                ctx.save();
                ctx.scale(scope.horizontalPixelRatio, scope.verticalPixelRatio);
                ctx.lineWidth = 2;
                for (const b of bars) {
                  const x = chart.timeScale().timeToCoordinate(b.time as Time);
                  const yHigh = series.priceToCoordinate(b.high);
                  const yLow = series.priceToCoordinate(b.low);
                  if (x == null || yHigh == null || yLow == null) continue;
                  ctx.strokeStyle = b.close >= b.open ? UP : DOWN;
                  ctx.beginPath();
                  ctx.moveTo(x, yHigh);
                  ctx.lineTo(x, yLow);
                  ctx.stroke();
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

function highLowAutoscaleInfo(chart: IChartApi, getBars: () => ApiOhlcBar[]) {
  return () => {
    const bars = getBars();
    if (bars.length === 0) return null;
    const visible = chart.timeScale().getVisibleRange();
    const from = visible ? (visible.from as unknown as number) : -Infinity;
    const to = visible ? (visible.to as unknown as number) : Infinity;
    let lo = Infinity, hi = -Infinity, any = false;
    for (const b of bars) {
      if (b.time < from || b.time > to) continue;
      any = true;
      if (b.low < lo) lo = b.low;
      if (b.high > hi) hi = b.high;
    }
    if (!any) for (const b of bars) { if (b.low < lo) lo = b.low; if (b.high > hi) hi = b.high; }
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) return null;
    return { priceRange: { minValue: lo, maxValue: hi } };
  };
}

export const createHighLowRenderer: ChartRendererFactory = (chart, bars) => {
  let liveBars = bars;
  const series = chart.addSeries(LineSeries, {
    lineVisible: false, pointMarkersVisible: false,
    autoscaleInfoProvider: highLowAutoscaleInfo(chart, () => liveBars),
  });
  const anchorPoint = (b: ApiOhlcBar) => ({ time: b.time as never, value: (b.high + b.low) / 2 });
  series.setData(bars.map(anchorPoint));
  series.attachPrimitive(createHighLowPrimitive(() => liveBars));

  return {
    series,
    setData: (newBars) => { liveBars = newBars; series.setData(newBars.map(anchorPoint)); },
    updateBar: (bar) => {
      liveBars = liveBars.length > 0 && liveBars[liveBars.length - 1].time === bar.time
        ? [...liveBars.slice(0, -1), bar]
        : [...liveBars, bar];
      series.update(anchorPoint(bar));
    },
  };
};
