import { describe, it, expect, vi } from "vitest";
import { bucketTicksByBar, clampFetchWindow, createTickFetchLifecycle, MAX_FETCH_WINDOW_SECONDS } from "./footprint-data";
import type { ApiOhlcBar } from "@/lib/api";
import type { SeriesAttachedParameter, Time } from "lightweight-charts";

const bar = (time: number, open: number, high: number, low: number, close: number): ApiOhlcBar =>
  ({ time, open, high, low, close, volume: 0 });

describe("bucketTicksByBar", () => {
  it("routes each tick to the bar whose own time window it falls in, and classifies buy/sell by up/down tick", () => {
    const bars = [bar(1000, 100, 110, 90, 105), bar(1060, 105, 115, 95, 108)];
    const ticks = [
      { t: 1000_000, p: 100 }, // bar0's first tick -- no prior price, counted as buy (see docs)
      { t: 1010_000, p: 102 }, // up from 100 -> buy
      { t: 1020_000, p: 98 },  // down from 102 -> sell
      { t: 1065_000, p: 106 }, // belongs to bar1 (time >= 1060) -- first tick of THAT bar, buy
      { t: 1070_000, p: 104 }, // down from 106 -> sell
    ];
    const result = bucketTicksByBar(bars, ticks);

    expect(result.size).toBe(2);
    const bar0 = result.get(1000)!;
    const bar1 = result.get(1060)!;
    expect(bar0).toBeDefined();
    expect(bar1).toBeDefined();

    // bar0's own bucketSize: (110-90)/10 = 2. Tick prices 100,102,98 land in
    // buckets floor((p-90)/2): 5, 6, 4 respectively.
    expect(bar0.bucketSize).toBe(2);
    expect(bar0.levels.get(5)).toEqual({ buy: 1, sell: 0 }); // p=100, first tick of the bar
    expect(bar0.levels.get(6)).toEqual({ buy: 1, sell: 0 }); // p=102, uptick
    expect(bar0.levels.get(4)).toEqual({ buy: 0, sell: 1 }); // p=98, downtick

    // bar1's bucketSize: (115-95)/10 = 2. p=106 -> bucket floor((106-95)/2)=5; p=104 -> bucket 4.
    expect(bar1.bucketSize).toBe(2);
    expect(bar1.levels.get(5)).toEqual({ buy: 1, sell: 0 });
    expect(bar1.levels.get(4)).toEqual({ buy: 0, sell: 1 });
  });

  it("a tick before the first bar's own start time is skipped, not misattributed to it", () => {
    const bars = [bar(1000, 100, 110, 90, 105)];
    const result = bucketTicksByBar(bars, [{ t: 500_000, p: 100 }]);
    expect(result.size).toBe(0);
  });

  it("no bars or no ticks both produce an empty map, not a throw", () => {
    expect(bucketTicksByBar([], [{ t: 1000, p: 1 }]).size).toBe(0);
    expect(bucketTicksByBar([bar(1000, 100, 110, 90, 105)], []).size).toBe(0);
  });

  it("ticks arriving out of order are sorted before bucketing, not trusted as-is", () => {
    // Same fixture as the first test above, but shuffled -- the backend
    // contract never actually guarantees ascending order, and both the
    // buy/sell classification (compares each tick to the one immediately
    // before it) and the forward-only bar-lookup pointer assume it.
    const bars = [bar(1000, 100, 110, 90, 105), bar(1060, 105, 115, 95, 108)];
    const shuffled = [
      { t: 1070_000, p: 104 },
      { t: 1000_000, p: 100 },
      { t: 1065_000, p: 106 },
      { t: 1020_000, p: 98 },
      { t: 1010_000, p: 102 },
    ];
    const result = bucketTicksByBar(bars, shuffled);
    // Same expected result as the in-order test -- sorting internally
    // must make the outcome independent of input order.
    expect(result.get(1000)!.levels.get(5)).toEqual({ buy: 1, sell: 0 });
    expect(result.get(1000)!.levels.get(6)).toEqual({ buy: 1, sell: 0 });
    expect(result.get(1000)!.levels.get(4)).toEqual({ buy: 0, sell: 1 });
    expect(result.get(1060)!.levels.get(5)).toEqual({ buy: 1, sell: 0 });
    expect(result.get(1060)!.levels.get(4)).toEqual({ buy: 0, sell: 1 });
  });
});

/** A minimal `SeriesAttachedParameter`-shaped stub -- just enough surface
 *  for createTickFetchLifecycle's own calls (chart.timeScale()'s three
 *  methods, requestUpdate). Real primitive tests elsewhere in this codebase
 *  mount a real LWC chart; this one doesn't need to, since nothing here
 *  touches drawing or coordinate conversion. */
function fakeAttachedParam() {
  const handlers: (() => void)[] = [];
  let visibleRange: { from: number; to: number } | null = { from: 1000, to: 2000 };
  return {
    param: {
      chart: {
        timeScale: () => ({
          getVisibleRange: () => visibleRange,
          subscribeVisibleTimeRangeChange: (h: () => void) => handlers.push(h),
          unsubscribeVisibleTimeRangeChange: (h: () => void) => {
            const i = handlers.indexOf(h);
            if (i >= 0) handlers.splice(i, 1);
          },
        }),
      },
      requestUpdate: vi.fn(),
    } as unknown as SeriesAttachedParameter<Time> & { requestUpdate: ReturnType<typeof vi.fn> },
    fireVisibleRangeChange: () => handlers.forEach((h) => h()),
    setVisibleRange: (r: { from: number; to: number } | null) => { visibleRange = r; },
    subscriberCount: () => handlers.length,
  };
}

describe("createTickFetchLifecycle", () => {
  it("fetches immediately on attach, and stops on detach", async () => {
    const fetchTicks = vi.fn().mockResolvedValue([{ t: 1000, p: 1 }]);
    const onTicks = vi.fn();
    const lifecycle = createTickFetchLifecycle(fetchTicks, onTicks);
    const { param } = fakeAttachedParam();

    lifecycle.attached(param);
    await Promise.resolve(); await Promise.resolve();

    expect(fetchTicks).toHaveBeenCalledTimes(1);
    expect(onTicks).toHaveBeenCalledWith([{ t: 1000, p: 1 }]);
    expect(param.requestUpdate).toHaveBeenCalled();

    lifecycle.detached();
    expect(lifecycle.getAttached()).toBeNull();
  });

  it("a slower, older fetch that resolves AFTER a newer one does not overwrite the newer result", async () => {
    // The exact race this fixes: pan left (issues fetch #1, slow) then
    // quickly pan right (issues fetch #2, fast) -- without request-
    // sequencing, fetch #1's response landing last would silently clobber
    // the correct, current result from fetch #2.
    vi.useFakeTimers();
    try {
      let resolveFirst!: (v: { t: number; p: number }[]) => void;
      let resolveSecond!: (v: { t: number; p: number }[]) => void;
      const fetchTicks = vi.fn()
        .mockImplementationOnce(() => new Promise((r) => { resolveFirst = r; }))
        .mockImplementationOnce(() => new Promise((r) => { resolveSecond = r; }));
      const onTicks = vi.fn();
      const lifecycle = createTickFetchLifecycle(fetchTicks, onTicks);
      const { param, fireVisibleRangeChange } = fakeAttachedParam();

      lifecycle.attached(param); // issues fetch #1 (pending)
      expect(fetchTicks).toHaveBeenCalledTimes(1);

      fireVisibleRangeChange(); // schedules the debounced refetch
      await vi.advanceTimersByTimeAsync(500); // FETCH_DEBOUNCE_MS -- issues fetch #2 (pending)
      expect(fetchTicks).toHaveBeenCalledTimes(2);

      // Resolve the NEWER request (#2) first, exactly like a quick right-pan
      // answering faster than the abandoned left-pan's slower request.
      resolveSecond!([{ t: 2000, p: 2 }]);
      await Promise.resolve(); await Promise.resolve();
      expect(onTicks).toHaveBeenCalledWith([{ t: 2000, p: 2 }]);

      // Now the OLDER request (#1) finally resolves -- must be discarded,
      // not applied on top of the newer, already-correct result.
      resolveFirst!([{ t: 1000, p: 1 }]);
      await Promise.resolve(); await Promise.resolve();

      expect(onTicks).toHaveBeenCalledTimes(1); // never called a second time with the stale data
    } finally {
      vi.useRealTimers();
    }
  });

  it("no ticks fetched when fetchTicks is undefined (symbol without tick coverage)", async () => {
    const onTicks = vi.fn();
    const lifecycle = createTickFetchLifecycle(undefined, onTicks);
    const { param } = fakeAttachedParam();
    lifecycle.attached(param);
    await Promise.resolve();
    expect(onTicks).not.toHaveBeenCalled();
  });
});

describe("clampFetchWindow", () => {
  it("passes a window already within bounds through unchanged", () => {
    expect(clampFetchWindow(1000, 1000 + 60)).toEqual({ since: 1000, until: 1060 });
  });

  it("clamps a too-wide window to the most recent MAX_FETCH_WINDOW_SECONDS, keeping `until` fixed", () => {
    const until = 1_000_000;
    const from = until - MAX_FETCH_WINDOW_SECONDS * 3; // way wider than allowed
    const { since, until: outUntil } = clampFetchWindow(from, until);
    expect(outUntil).toBe(until);
    expect(since).toBe(until - MAX_FETCH_WINDOW_SECONDS);
  });
});
