import { describe, it, expect } from "vitest";
import { parseCustomInterval, baseIntervalFor, bucketSizeFor, resolveInterval } from "./customInterval";

describe("parseCustomInterval", () => {
  it("parses a whole number plus a unit", () => {
    expect(parseCustomInterval("3m")).toEqual({ value: 3, unit: "m" });
    expect(parseCustomInterval("2h")).toEqual({ value: 2, unit: "h" });
    expect(parseCustomInterval("4d")).toEqual({ value: 4, unit: "d" });
    expect(parseCustomInterval("1w")).toEqual({ value: 1, unit: "w" });
  });

  it("is case-insensitive and tolerates surrounding whitespace", () => {
    expect(parseCustomInterval(" 3M ")).toEqual({ value: 3, unit: "m" });
  });

  it("rejects zero, negative, non-numeric, and unknown units", () => {
    expect(parseCustomInterval("0m")).toBeNull();
    expect(parseCustomInterval("-2h")).toBeNull();
    expect(parseCustomInterval("m")).toBeNull();
    expect(parseCustomInterval("3s")).toBeNull();
    expect(parseCustomInterval("")).toBeNull();
  });
});

describe("baseIntervalFor", () => {
  it("buckets day/week customs off native daily bars", () => {
    expect(baseIntervalFor({ value: 3, unit: "d" })).toBe("1d");
    expect(baseIntervalFor({ value: 2, unit: "w" })).toBe("1d");
  });

  it("buckets minute/hour customs off native 1-minute bars", () => {
    expect(baseIntervalFor({ value: 3, unit: "m" })).toBe("1m");
    expect(baseIntervalFor({ value: 2, unit: "h" })).toBe("1m");
  });
});

describe("bucketSizeFor", () => {
  it("approximates a trading week as 5 sessions", () => {
    expect(bucketSizeFor({ value: 2, unit: "w" })).toBe(10);
  });

  it("counts days and minutes directly, and hours as 60 minutes each", () => {
    expect(bucketSizeFor({ value: 4, unit: "d" })).toBe(4);
    expect(bucketSizeFor({ value: 3, unit: "m" })).toBe(3);
    expect(bucketSizeFor({ value: 2, unit: "h" })).toBe(120);
  });
});

describe("resolveInterval", () => {
  it("passes a preset straight through with no aggregation", () => {
    expect(resolveInterval("15m")).toEqual({ fetchInterval: "15m", bucketSize: 1, guardSessionBoundary: false });
  });

  it("resolves a minute/hour custom to a guarded 1m-bucketed fetch", () => {
    expect(resolveInterval("3m")).toEqual({ fetchInterval: "1m", bucketSize: 3, guardSessionBoundary: true });
    expect(resolveInterval("2h")).toEqual({ fetchInterval: "1m", bucketSize: 120, guardSessionBoundary: true });
  });

  it("resolves a day/week custom to an unguarded 1d-bucketed fetch", () => {
    expect(resolveInterval("4d")).toEqual({ fetchInterval: "1d", bucketSize: 4, guardSessionBoundary: false });
    expect(resolveInterval("2w")).toEqual({ fetchInterval: "1d", bucketSize: 10, guardSessionBoundary: false });
  });

  it("falls back to 1d, unaggregated, for a value that is neither a preset nor parseable", () => {
    expect(resolveInterval("garbage")).toEqual({ fetchInterval: "1d", bucketSize: 1, guardSessionBoundary: false });
  });
});
