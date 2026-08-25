import { createCandlesRenderer } from "./candles";
import { createVolumeProfilePrimitive } from "../volume-profile-primitive";
import type { ApiOhlcBar } from "@/lib/api";
import type { ChartRendererFactory } from "./types";

/** Real candles, with the SAME Volume Profile histogram this app already
 *  offers as an attachable indicator (see attachVolumeProfile/
 *  VolumeProfileMode) auto-attached in "session" mode instead of left for
 *  the user to add by hand -- TradingView's own Session Volume Profile is
 *  exactly this: candles as the base, the current session's profile always
 *  showing. No new histogram logic here, just wiring the existing one on
 *  by default for this chart type. */
export const createSessionVolumeProfileRenderer: ChartRendererFactory = (chart, bars) => {
  let liveBars = bars;
  const candles = createCandlesRenderer(chart, bars);
  const profile = createVolumeProfilePrimitive(() => liveBars, "session");
  candles.series.attachPrimitive(profile.primitive);

  return {
    series: candles.series,
    setData: (newBars) => { liveBars = newBars; candles.setData(newBars); },
    updateBar: (bar: ApiOhlcBar) => {
      liveBars = liveBars.length > 0 && liveBars[liveBars.length - 1].time === bar.time
        ? [...liveBars.slice(0, -1), bar]
        : [...liveBars, bar];
      candles.updateBar(bar);
    },
  };
};
