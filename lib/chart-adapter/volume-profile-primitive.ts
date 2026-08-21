import type { ISeriesPrimitive, IPrimitivePaneView, Time, SeriesAttachedParameter } from "lightweight-charts";
import type { CanvasRenderingTarget2D } from "fancy-canvas";
import type { ApiOhlcBar } from "@/lib/api";

/** TradingView ships six Volume Profile variants; this app has five --
 *  "Fixed Range" needs a click-drag anchor selection on the chart canvas,
 *  and this codebase's pointer-driven drawing interaction isn't wired yet
 *  (see startManualDraw() in lightweight-charts-adapter.ts, which throws
 *  for exactly this reason). The other five differ only in which bars feed
 *  the histogram and where it's anchored -- no anchor-selection UI needed. */
export type VolumeProfileMode = "visible" | "session" | "session-hd" | "auto-anchored" | "periodic";

const BUCKETS = 24;
const BUCKETS_HD = 100;
/** Fraction of a profile's available width the widest (POC) bucket bar spans. */
const MAX_BAR_WIDTH_FRACTION = 0.18;
/** How many bars back "Auto Anchored" looks for the swing point it anchors to. */
const AUTO_ANCHOR_LOOKBACK = 80;
/** A gap this many times the median inter-bar gap marks a session/day boundary
 *  -- avoids timezone-aware calendar math entirely: intraday data has no bars
 *  overnight, so the gap from one session's close to the next session's open
 *  dwarfs any gap within a session. */
const SESSION_GAP_FACTOR = 4;

interface Histogram { lo: number; hi: number; bucketSize: number; volumes: number[]; pocIndex: number }

export interface VolumeProfileHandle {
  primitive: ISeriesPrimitive<Time>;
  setVisible(visible: boolean): void;
  getVisible(): boolean;
}

/**
 * Volume Profile: a horizontal histogram of volume by price -- the one
 * built-in that genuinely can't be a Pine script (Pine's plot() is
 * time-indexed; this is a price-bucketed aggregate with no time axis of its
 * own). Bucketing simplification shared by every mode: each bar's full
 * volume is credited to the bucket containing its CLOSE price, not
 * distributed across the bucket(s) its high-low range actually spans --
 * cheap and close enough for "where did volume concentrate," not meant to
 * be tick-accurate.
 *
 * `getBars` is called fresh on every draw rather than snapshotting the bars
 * array once, matching every other primitive in this file: the chart can
 * zoom/pan/load-more/tick between draws, and so can the bars themselves.
 *
 * Returns a handle rather than the bare primitive: the chart legend's hide
 * toggle needs a way to turn drawing off without detaching (detaching would
 * drop it out of the "still attached, just hidden" state the legend needs
 * to distinguish from delete).
 */
export function createVolumeProfilePrimitive(getBars: () => ApiOhlcBar[], mode: VolumeProfileMode): VolumeProfileHandle {
  let attached: SeriesAttachedParameter<Time> | null = null;
  let visible = true;
  const primitive: ISeriesPrimitive<Time> = {
    // Without the explicit requestUpdate() here, the histogram simply never
    // appeared on first attach -- LWC only repaints a primitive's pane in
    // response to some OTHER invalidation (data change, pan/zoom, a stray
    // mouse move over the canvas), never just because attachPrimitive() was
    // called. Caught by hand: worked fine with a mouse hovering the chart
    // during manual testing, blank in an automated screenshot with no
    // mouse activity after the toggle.
    attached(param) { attached = param; param.requestUpdate(); },
    detached() { attached = null; },
    paneViews(): readonly IPrimitivePaneView[] {
      return [{
        renderer() {
          return {
            draw(target: CanvasRenderingTarget2D) {
              target.useBitmapCoordinateSpace((scope) => {
                if (!attached || !visible) return;
                const ctx = scope.context;
                ctx.save();
                ctx.scale(scope.horizontalPixelRatio, scope.verticalPixelRatio);
                if (mode === "periodic") drawPeriodicProfile(ctx, attached, getBars());
                else drawSingleProfile(ctx, attached, selectBars(mode, getBars()), mode === "session-hd" ? BUCKETS_HD : BUCKETS, mode === "visible");
                ctx.restore();
              });
            },
          };
        },
      }];
    },
  };
  return {
    primitive,
    setVisible(v) { visible = v; attached?.requestUpdate(); },
    getVisible() { return visible; },
  };
}

function medianGapSeconds(bars: ApiOhlcBar[]): number {
  if (bars.length < 2) return 0;
  const gaps: number[] = [];
  for (let i = 1; i < bars.length; i++) gaps.push(bars[i].time - bars[i - 1].time);
  gaps.sort((a, b) => a - b);
  return gaps[Math.floor(gaps.length / 2)];
}

/** Splits `bars` into contiguous runs at session/day boundaries -- see
 *  SESSION_GAP_FACTOR above for why this needs no calendar/timezone math. */
function splitIntoSessions(bars: ApiOhlcBar[]): ApiOhlcBar[][] {
  if (bars.length === 0) return [];
  const gap = medianGapSeconds(bars);
  const threshold = gap > 0 ? gap * SESSION_GAP_FACTOR : Infinity;
  const sessions: ApiOhlcBar[][] = [[bars[0]]];
  for (let i = 1; i < bars.length; i++) {
    if (bars[i].time - bars[i - 1].time > threshold) sessions.push([]);
    sessions[sessions.length - 1].push(bars[i]);
  }
  return sessions;
}

/** The most recent significant swing high/low within the lookback window --
 *  "Auto Anchored" profiles everything from there to now, same idea as
 *  TradingView's auto-anchor (last meaningful high or low), without a
 *  formal pivot-detection algorithm. */
function autoAnchorIndex(bars: ApiOhlcBar[]): number {
  const start = Math.max(0, bars.length - AUTO_ANCHOR_LOOKBACK);
  let hiIdx = start, loIdx = start;
  for (let i = start; i < bars.length; i++) {
    if (bars[i].high > bars[hiIdx].high) hiIdx = i;
    if (bars[i].low < bars[loIdx].low) loIdx = i;
  }
  return Math.max(hiIdx, loIdx); // whichever swing is more recent
}

function selectBars(mode: Exclude<VolumeProfileMode, "periodic">, bars: ApiOhlcBar[]): ApiOhlcBar[] {
  if (mode === "session" || mode === "session-hd") {
    const sessions = splitIntoSessions(bars);
    return sessions[sessions.length - 1] ?? [];
  }
  if (mode === "auto-anchored") {
    return bars.slice(autoAnchorIndex(bars));
  }
  return bars; // "visible" -- range-filtered by the caller against the chart's own visible window
}

function computeHistogram(bars: ApiOhlcBar[], bucketCount: number): Histogram | null {
  if (bars.length === 0) return null;
  let lo = Infinity, hi = -Infinity;
  for (const b of bars) { if (b.low < lo) lo = b.low; if (b.high > hi) hi = b.high; }
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || hi <= lo) return null;

  const volumes = new Array<number>(bucketCount).fill(0);
  const bucketSize = (hi - lo) / bucketCount;
  for (const b of bars) {
    const idx = Math.min(bucketCount - 1, Math.max(0, Math.floor((b.close - lo) / bucketSize)));
    volumes[idx] += b.volume ?? 0;
  }
  const maxVolume = Math.max(...volumes);
  if (maxVolume <= 0) return null;
  return { lo, hi, bucketSize, volumes, pocIndex: volumes.indexOf(maxVolume) };
}

/** Draws one histogram's bars right-anchored at `rightEdge`, each at most
 *  `maxBarWidth` wide (the POC bucket). Shared by every non-periodic mode
 *  and by each individual day's profile under "periodic". */
function drawHistogramBars(ctx: CanvasRenderingContext2D, series: SeriesAttachedParameter<Time>["series"], hist: Histogram, rightEdge: number, maxBarWidth: number): void {
  const maxVolume = Math.max(...hist.volumes);
  for (let i = 0; i < hist.volumes.length; i++) {
    const vol = hist.volumes[i];
    if (vol <= 0) continue;
    const yTop = series.priceToCoordinate(hist.lo + (i + 1) * hist.bucketSize);
    const yBottom = series.priceToCoordinate(hist.lo + i * hist.bucketSize);
    if (yTop == null || yBottom == null) continue;

    const barWidth = (vol / maxVolume) * maxBarWidth;
    ctx.fillStyle = i === hist.pocIndex ? "#f0b90b99" : "#6c5ce766";
    const height = Math.max(1, Math.abs(yBottom - yTop) - 1);
    ctx.fillRect(rightEdge - barWidth, Math.min(yTop, yBottom), barWidth, height);
  }
}

function drawSingleProfile(
  ctx: CanvasRenderingContext2D, { series, chart }: SeriesAttachedParameter<Time>,
  bars: ApiOhlcBar[], bucketCount: number, scopeToVisibleRange: boolean,
): void {
  if (bars.length === 0) return;
  // Only "Visible Range" mode re-scopes by the chart's current pan/zoom --
  // Session/Session HD/Auto Anchored already picked their own bar set in
  // selectBars() and must NOT shrink further just because the user zoomed
  // into part of that range (TradingView's Session profile stays fixed to
  // the whole session regardless of zoom level).
  const visible = scopeToVisibleRange ? chart.timeScale().getVisibleRange() : null;
  const scoped = visible
    ? bars.filter((b) => b.time >= (visible.from as unknown as number) && b.time <= (visible.to as unknown as number))
    : bars;
  const source = scoped.length > 0 ? scoped : bars;

  const hist = computeHistogram(source, bucketCount);
  if (!hist) return;
  const paneWidth = chart.paneSize().width;
  drawHistogramBars(ctx, series, hist, paneWidth, paneWidth * MAX_BAR_WIDTH_FRACTION);
}

/** "Periodic": one profile per session/day, each drawn overlaid on that
 *  day's own candles (right-anchored to that day's last bar, no wider than
 *  that day's own bar span) instead of one profile hugging the pane's
 *  right edge. Only days overlapping the current visible range are drawn --
 *  history can span weeks, and off-screen days would just be wasted work. */
function drawPeriodicProfile(ctx: CanvasRenderingContext2D, { series, chart }: SeriesAttachedParameter<Time>, allBars: ApiOhlcBar[]): void {
  const visible = chart.timeScale().getVisibleRange();
  const from = visible ? (visible.from as unknown as number) : -Infinity;
  const to = visible ? (visible.to as unknown as number) : Infinity;

  for (const day of splitIntoSessions(allBars)) {
    if (day.length === 0) continue;
    const first = day[0], last = day[day.length - 1];
    if (last.time < from || first.time > to) continue; // entirely off-screen

    const hist = computeHistogram(day, BUCKETS);
    if (!hist) continue;
    const xFirst = chart.timeScale().timeToCoordinate(first.time as Time);
    const xLast = chart.timeScale().timeToCoordinate(last.time as Time);
    if (xFirst == null || xLast == null) continue;

    const dayWidth = Math.max(4, Math.abs(xLast - xFirst));
    drawHistogramBars(ctx, series, hist, Math.max(xFirst, xLast), dayWidth * MAX_BAR_WIDTH_FRACTION * 3);
  }
}

