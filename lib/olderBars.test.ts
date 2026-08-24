import { describe, it, expect } from "vitest";
import { olderBars } from "./olderBars";
import type { ApiOhlcBar } from "@/lib/api/market";

const MINUTE = 60;

function bar(timeSec: number): ApiOhlcBar {
  return { time: timeSec, open: 1, high: 1, low: 1, close: 1, volume: 1 };
}

describe("olderBars", () => {
  it("keeps a genuinely older bar -- live bug: an inline *1000 used to compare seconds against a seconds-scale bound, which was never true, so pan-back always returned nothing", () => {
    const oldestLoaded = 1767000900; // seconds, matching what the adapter actually sends (see lightweight-charts-adapter.test.ts)
    const older = bar(oldestLoaded - 5 * MINUTE);
    expect(olderBars([older], oldestLoaded)).toEqual([older]);
  });

  it("drops a bar at or after the oldest-loaded boundary", () => {
    const oldestLoaded = 1767000900;
    const atBoundary = bar(oldestLoaded);
    const newer = bar(oldestLoaded + MINUTE);
    expect(olderBars([atBoundary, newer], oldestLoaded)).toEqual([]);
  });

  it("filters a mixed batch to only the older bars", () => {
    const oldestLoaded = 1767000900;
    const older1 = bar(oldestLoaded - 10 * MINUTE);
    const older2 = bar(oldestLoaded - 5 * MINUTE);
    const newer = bar(oldestLoaded + MINUTE);
    expect(olderBars([older1, older2, newer], oldestLoaded)).toEqual([older1, older2]);
  });
});
