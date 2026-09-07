import { LineSeries } from "lightweight-charts";
import type { ISeriesPrimitive, IPrimitivePaneView, Time, SeriesAttachedParameter } from "lightweight-charts";
import type { CanvasRenderingTarget2D } from "fancy-canvas";
import type { ApiOhlcBar } from "@/lib/api";
import type { ChartRendererFactory } from "./types";
import { appendOrReplaceBar, visibleRangeAutoscaleInfo } from "./brick-utils";

/** A filled band between each bar's high and low, real close line on top --
 *  no native LWC series draws "the area between two arbitrary lines," so
 *  this is a custom primitive (same ISeriesPrimitive pattern
 *  volume-profile-primitive.ts already uses in this codebase) attached to
 *  an anchor LineSeries that plots the close. `getBars` is a live getter,
 *  not a snapshot -- same reasoning as Volume Profile's own: the chart can
 *  zoom/pan/load-more/tick between draws. */
function createHlcAreaPrimitive(getBars: () => ApiOhlcBar[]): ISeriesPrimitive<Time> {
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
                if (bars.length < 2) return;
                const ctx = scope.context;
                ctx.save();
                ctx.scale(scope.horizontalPixelRatio, scope.verticalPixelRatio);

                const highPts: [number, number][] = [];
                const lowPts: [number, number][] = [];
                for (const b of bars) {
                  const x = chart.timeScale().timeToCoordinate(b.time as Time);
                  const yHigh = series.priceToCoordinate(b.high);
                  const yLow = series.priceToCoordinate(b.low);
                  if (x == null || yHigh == null || yLow == null) continue;
                  highPts.push([x, yHigh]);
                  lowPts.push([x, yLow]);
                }
                if (highPts.length >= 2) {
                  ctx.beginPath();
                  ctx.moveTo(highPts[0][0], highPts[0][1]);
                  for (let i = 1; i < highPts.length; i++) ctx.lineTo(highPts[i][0], highPts[i][1]);
                  for (let i = lowPts.length - 1; i >= 0; i--) ctx.lineTo(lowPts[i][0], lowPts[i][1]);
                  ctx.closePath();
                  ctx.fillStyle = "#6c5ce733";
                  ctx.fill();
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

export const createHlcAreaRenderer: ChartRendererFactory = (chart, bars) => {
  let liveBars = bars;
  const series = chart.addSeries(LineSeries, {
    color: "#6c5ce7", lineWidth: 2,
    // The anchor plots just the close line, so LWC's own autoscale would
    // range to close prices alone and clip the real high/low band the
    // primitive above draws on top -- see visibleRangeAutoscaleInfo's own
    // docs (shared with High-Low, the other primitive-drawn type with the
    // same "anchor doesn't carry the real price extent" problem).
    autoscaleInfoProvider: visibleRangeAutoscaleInfo(chart, () => liveBars),
  });
  const toPoint = (b: ApiOhlcBar) => ({ time: b.time as never, value: b.close });
  series.setData(bars.map(toPoint));
  series.attachPrimitive(createHlcAreaPrimitive(() => liveBars));

  return {
    series,
    setData: (newBars) => { liveBars = newBars; series.setData(newBars.map(toPoint)); },
    // Mirrors the adapter's own pushLiveTick invariant: an update is either
    // an in-place edit of the still-forming (last) bar, or a genuinely new
    // one appended after it -- never anything else.
    updateBar: (bar) => {
      liveBars = appendOrReplaceBar(liveBars, bar);
      series.update(toPoint(bar));
    },
  };
};
