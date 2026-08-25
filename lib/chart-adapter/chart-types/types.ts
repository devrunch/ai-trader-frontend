import type { IChartApi, ISeriesApi, SeriesType } from "lightweight-charts";
import type { ApiOhlcBar } from "@/lib/api";

/** Every chart type this app can render the main pane as -- mirrors
 *  TradingView's own chart-type dropdown. Only the ones with a real,
 *  working ChartRendererFactory belong in the registry (chart-types/
 *  registry.ts); this union is the full target list so a not-yet-built
 *  type is still a compile error if referenced, not a silent typo. */
export type ChartTypeId =
  | "candles" | "bars" | "hollow-candles" | "volume-candles" | "heikin-ashi"
  | "line" | "line-markers" | "step-line" | "area" | "hlc-area"
  | "baseline" | "columns" | "high-low"
  | "volume-footprint" | "tpo" | "session-volume-profile"
  // Non-time-indexed types -- TradingView draws these on a synthetic axis
  // (bricks/columns driven by price movement, not one per time bar), which
  // this app's whole bar model (ApiOhlcBar, one entry per candle period,
  // pushLiveTick/loadMore keyed by time) doesn't represent at all. Listed
  // here so referencing one is a compile error, not a silent typo, but
  // building them for real means a second, non-time axis mode alongside
  // this one -- out of scope for the renderer-registry pattern every other
  // type here uses.
  | "renko" | "line-break" | "kagi" | "point-figure" | "range";

/** One chart type, live on a mounted chart. `series` is the anchor every
 *  other adapter feature (price lines, drawing primitives, the crosshair
 *  readout) attaches to or reads from -- every Lightweight Charts series
 *  type shares that part of the API (attachPrimitive/createPriceLine are
 *  on the base ISeriesApi, not the Candlestick-specific one), so callers
 *  never need to know or care which concrete type this handle wraps. */
export interface ChartRendererHandle {
  series: ISeriesApi<SeriesType>;
  /** Full data replace -- a new symbol/interval, or loadMore prepending
   *  older history onto the front. */
  setData(bars: ApiOhlcBar[]): void;
  /** One bar, already fully resolved by the adapter's own pushLiveTick
   *  (new period vs. an update to the one still forming) -- the renderer
   *  only translates that OHLC bar into whatever its own series shape
   *  needs (all four fields for Candles/Bars, just close for Line/Area,
   *  ...). The adapter owns the "is this a new candle" timing logic;
   *  every renderer is handed the same resolved bar either way. */
  updateBar(bar: ApiOhlcBar): void;
}

/** Creates one chart type's series on `chart`, loads `bars` into it, and
 *  returns the handle the adapter drives from then on. A factory, not a
 *  singleton object, because the created series is per-mount state --
 *  same shape volume-profile-primitive.ts's createVolumeProfilePrimitive
 *  already uses in this codebase. */
export type ChartRendererFactory = (chart: IChartApi, bars: ApiOhlcBar[]) => ChartRendererHandle;
