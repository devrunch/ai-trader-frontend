// @vitest-environment node
import { describe, it, expect } from "vitest";
import { computeBreakoutProbability, bias, MAX_LEVELS } from "./breakout-probability";
import type { ApiOhlcBar } from "@/lib/api";

let seq = 0;
function bar(open: number, close: number, high: number, low: number): ApiOhlcBar {
  return { time: 1_700_000_000 + seq++ * 3600, open, high, low, close, volume: 100 };
}
const green = (high = 110, low = 100) => bar(100, 108, high, low);
const red = (high = 110, low = 100) => bar(108, 100, high, low);

describe("computeBreakoutProbability", () => {
  it("returns nothing when there is not enough history to condition on", () => {
    expect(computeBreakoutProbability([green()], 1)).toBeNull();
  });

  it("counts a level as reached only when price actually gets there", () => {
    // Four green bars, each followed by one that either takes out its high or
    // does not: three do. The final bar is green, so the green counts are the
    // ones read back.
    const bars = [
      green(110, 100), red(115, 105),    // beat the 110 high
      green(110, 100), red(115, 105),    // beat
      green(110, 100), red(115, 105),    // beat
      green(110, 100), red(109, 105),    // did not
      green(110, 100),
    ];
    const result = computeBreakoutProbability(bars, 1)!;
    expect(result.lastCandleGreen).toBe(true);
    expect(result.sample).toBe(4);
    expect(result.upper[0].probability).toBe(75);
  });

  it("conditions on the previous candle colour, not the current one", () => {
    // Only red predecessors here, so a chart sitting after a green bar has no
    // green sample at all and must say so.
    const bars = [red(110, 100), red(120, 99), red(110, 100), red(120, 99), green(110, 100)];
    const result = computeBreakoutProbability(bars, 1)!;
    expect(result.lastCandleGreen).toBe(true);
    expect(result.sample).toBe(0);
    expect(result.upper[0].probability).toBeNull();
  });

  it("reads the other side's counts when the last bar is red", () => {
    const bars = [red(110, 100), green(120, 99), red(110, 100), green(120, 99), red(110, 100)];
    const result = computeBreakoutProbability(bars, 1)!;
    expect(result.lastCandleGreen).toBe(false);
    expect(result.sample).toBe(2);
  });

  it("reports an untested level as null rather than zero percent", () => {
    // 0% reads as "this cannot happen"; null reads as "we have not seen it",
    // and an unlabelled level is the honest render.
    const bars = [green(110, 100), red(111, 99), green(110, 100)];
    const result = computeBreakoutProbability(bars, 1)!;
    expect(result.sample).toBe(1);
    // The far levels were never reached, but they were tested, so they are 0.
    expect(result.upper[4].probability).toBe(0);
  });

  it("has no opinion at all when nothing has been tested", () => {
    const doji = bar(100, 100, 101, 99);
    const result = computeBreakoutProbability([doji, doji, doji], 1)!;
    expect(result.sample).toBe(0);
    expect(result.upper.every((l) => l.probability === null)).toBe(true);
  });

  it("ignores doji predecessors instead of assigning them a colour", () => {
    const bars = [
      bar(100, 100, 101, 99),    // doji: neither green nor red, so not counted
      red(110, 95),
      green(110, 100),           // green predecessor
      red(120, 105),
      green(110, 100),
    ];
    const result = computeBreakoutProbability(bars, 1)!;
    expect(result.sample).toBe(1);
  });

  it("makes a further level no more likely than a nearer one", () => {
    const bars: ApiOhlcBar[] = [];
    for (let i = 0; i < 20; i++) {
      bars.push(green(110, 100));
      bars.push(red(110 + (i % 5), 100 - (i % 3)));
    }
    bars.push(green(110, 100));
    const result = computeBreakoutProbability(bars, 0.5)!;
    const probs = result.upper.map((l) => l.probability ?? 0);
    for (let i = 1; i < probs.length; i++) expect(probs[i]).toBeLessThanOrEqual(probs[i - 1]);
  });

  it("spaces levels by a percentage of price, not a fixed amount", () => {
    // 1% of a 200 close is 2, so each level sits 2 above the last.
    const bars = [green(110, 100), red(115, 105), bar(190, 200, 210, 180)];
    const result = computeBreakoutProbability(bars, 1)!;
    expect(result.upper[1].price - result.upper[0].price).toBeCloseTo(2, 6);
  });

  it("anchors the levels to the most recent bar", () => {
    const bars = [green(110, 100), red(115, 105), bar(100, 108, 130, 90)];
    const result = computeBreakoutProbability(bars, 1)!;
    expect(result.upper[0].price).toBe(130);
    expect(result.lower[0].price).toBe(90);
  });

  it("returns the number of levels asked for", () => {
    const bars = [green(110, 100), red(115, 105), green(110, 100)];
    expect(computeBreakoutProbability(bars, 1, 3)!.upper).toHaveLength(3);
    expect(computeBreakoutProbability(bars, 1)!.upper).toHaveLength(MAX_LEVELS);
  });
});

describe("bias", () => {
  const withProbs = (up: number | null, down: number | null) => ({
    upper: [{ index: 0, price: 1, probability: up }],
    lower: [{ index: 0, price: 1, probability: down }],
    lastCandleGreen: true,
    sample: 10,
  });

  it("names the side history favours", () => {
    expect(bias(withProbs(70, 30))).toEqual({ direction: "up", edge: 40 });
  });

  it("declines to call a coin flip", () => {
    // 50.4 vs 49.6 is not a read, and presenting it as one is how someone
    // ends up trading noise with a number attached.
    expect(bias(withProbs(50.4, 49.6))).toBeNull();
  });

  it("has no opinion without a sample", () => {
    expect(bias(withProbs(null, null))).toBeNull();
  });
});
