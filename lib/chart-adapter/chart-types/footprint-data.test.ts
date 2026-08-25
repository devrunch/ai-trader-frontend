import { describe, it, expect } from "vitest";
import { bucketTicksByBar, clampFetchWindow, MAX_FETCH_WINDOW_SECONDS } from "./footprint-data";
import type { ApiOhlcBar } from "@/lib/api";

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
