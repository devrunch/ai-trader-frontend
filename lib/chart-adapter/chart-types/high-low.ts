import { LineSeries } from "lightweight-charts";
import type { ISeriesPrimitive, IPrimitivePaneView, Time, SeriesAttachedParameter } from "lightweight-charts";
import type { CanvasRenderingTarget2D } from "fancy-canvas";
import type { ApiOhlcBar } from "@/lib/api";
import type { ChartRendererFactory } from "./types";
import { appendOrReplaceBar, visibleRangeAutoscaleInfo } from "./brick-utils";
import { UP_COLOR as UP, DOWN_COLOR as DOWN } from "./colors";

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

export const createHighLowRenderer: ChartRendererFactory = (chart, bars) => {
  let liveBars = bars;
  const series = chart.addSeries(LineSeries, {
    lineVisible: false, pointMarkersVisible: false,
    // See visibleRangeAutoscaleInfo's own docs -- shared with HLC Area, the
    // other primitive-drawn type whose anchor series doesn't carry the
    // real high/low extent LWC needs to autoscale against.
    autoscaleInfoProvider: visibleRangeAutoscaleInfo(chart, () => liveBars),
  });
  const anchorPoint = (b: ApiOhlcBar) => ({ time: b.time as never, value: (b.high + b.low) / 2 });
  series.setData(bars.map(anchorPoint));
  series.attachPrimitive(createHighLowPrimitive(() => liveBars));

  return {
    series,
    setData: (newBars) => { liveBars = newBars; series.setData(newBars.map(anchorPoint)); },
    updateBar: (bar) => {
      liveBars = appendOrReplaceBar(liveBars, bar);
      series.update(anchorPoint(bar));
    },
  };
};
