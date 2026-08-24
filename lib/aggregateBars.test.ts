import { describe, it, expect } from "vitest";
import { aggregateBars } from "./aggregateBars";
import type { ApiOhlcBar } from "@/lib/api/market";

const MINUTE = 60;

function bar(i: number, timeSec: number): ApiOhlcBar {
  return { time: timeSec, open: i * 10, high: i * 10 + 5, low: i * 10, close: i * 10 + 3, volume: 100 };
}

describe("aggregateBars", () => {
  it("passes bars through unchanged for a bucket size of 1", () => {
    const bars = [bar(0, 0), bar(1, MINUTE)];
    expect(aggregateBars(bars, 1, false)).toEqual(bars);
  });

  it("merges OHLCV correctly for a simple in-day bucket", () => {
    const bars = [bar(0, 0), bar(1, MINUTE), bar(2, 2 * MINUTE)];
    const [merged] = aggregateBars(bars, 3, true);
    expect(merged).toEqual({
      time: 0,              // first bar's open time
      open: 0,              // first bar's open
      high: 25,             // max high across the chunk (bar 2: 20+5)
      low: 0,               // min low across the chunk
      close: 23,            // last bar's close (bar 2: 20+3)
      volume: 300,          // summed
    });
  });

  it("never merges a bucket across a session boundary when guarded", () => {
    // 5 bars on day A, then 4 bars on day B, three days later so the day
    // comparison can never be timezone-ambiguous. bucketSize=3 would
    // otherwise merge day A's last bar with day B's first two.
    const dayA = [0, 1, 2, 3, 4].map((i) => bar(i, i * MINUTE));
    const dayBStart = 3 * 24 * 60 * MINUTE;
    const dayB = [5, 6, 7, 8].map((i) => bar(i, dayBStart + (i - 5) * MINUTE));

    const result = aggregateBars([...dayA, ...dayB], 3, true);

    // [0,1,2] | [3,4] (forced short by the boundary) | [5,6,7] | [8]
    expect(result).toHaveLength(4);
    expect(result[0]).toMatchObject({ time: dayA[0].time, open: 0, close: 23 });   // bars 0-2
    expect(result[1]).toMatchObject({ time: dayA[3].time, open: 30, close: 43 });  // bars 3-4, day A only
    expect(result[2]).toMatchObject({ time: dayB[0].time, open: 50, close: 73 });  // bars 5-7, day B only
    expect(result[3]).toMatchObject({ time: dayB[3].time, open: 80, close: 83 });  // bar 8 alone
  });

  it("ignores the session boundary when unguarded (whole daily bars, no gap to protect)", () => {
    const dayA = [0, 1].map((i) => bar(i, i * MINUTE));
    const dayBStart = 3 * 24 * 60 * MINUTE;
    const dayB = [2, 3].map((i) => bar(i, dayBStart + (i - 2) * MINUTE));

    const result = aggregateBars([...dayA, ...dayB], 4, false);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ open: 0, close: 33 });
  });
});
