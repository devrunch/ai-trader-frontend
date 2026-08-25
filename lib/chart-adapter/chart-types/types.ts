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
  // Not time-indexed in the usual sense (bricks/columns driven by price
  // movement, a variable count per real bar, not one-per-period) -- built
  // anyway, on a REAL but irregularly-spaced time axis: each brick/column
  // takes the real timestamp of whichever bar completed it, nudged forward
  // a second when several share one bar's time (see brick-utils.ts'
  // strictlyIncreasingTime). live ticks recompute the whole sequence via
  // setData() rather than a single update(), since one tick can add zero,
  // one, or several bricks -- see renko.ts's own comment for why that's
  // still cheap enough to do on every tick.
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

/** Extra capabilities only Volume Footprint/TPO actually use -- every other
 *  renderer factory ignores this third parameter entirely (a JS/TS
 *  function is happily assignable to a wider signature when it just drops
 *  the extra args, so none of the other ~18 renderer files needed to
 *  change when this was added). */
export interface ChartRendererContext {
  /** Real ECN ticks (mid price) for [sinceSec, untilSec) -- FOREX/metals
   *  only via Dukascopy. `null` means not covered, the window was
   *  rejected, or the vendor call failed; a renderer must treat that as
   *  "couldn't check," never as "zero trading happened." Absent entirely
   *  when the adapter was mounted without a tick source (see
   *  ChartMountOptions.onFetchTicks). */
  fetchTicks?: (sinceSec: number, untilSec: number) => Promise<{ t: number; p: number }[] | null>;
}

/** Creates one chart type's series on `chart`, loads `bars` into it, and
 *  returns the handle the adapter drives from then on. A factory, not a
 *  singleton object, because the created series is per-mount state --
 *  same shape volume-profile-primitive.ts's createVolumeProfilePrimitive
 *  already uses in this codebase. */
export type ChartRendererFactory = (chart: IChartApi, bars: ApiOhlcBar[], ctx?: ChartRendererContext) => ChartRendererHandle;
