import { describe, it, expect } from "vitest";
import { fuzzyScore, fuzzyFilter } from "./fuzzyMatch";

describe("fuzzyScore", () => {
  it("matches an exact substring", () => {
    expect(fuzzyScore("rsi", "RSI")).not.toBeNull();
  });

  it("matches a non-contiguous subsequence, unlike plain substring matching", () => {
    expect(fuzzyScore("gchn", "G-Channel")).not.toBeNull();
  });

  it("returns null when query characters aren't all present in order", () => {
    expect(fuzzyScore("xyz", "RSI")).toBeNull();
    expect(fuzzyScore("is", "SI")).toBeNull(); // "i" then "s", but SI only has s-then-i
  });

  it("is case-insensitive", () => {
    expect(fuzzyScore("RSI", "rsi")).not.toBeNull();
  });

  it("ranks a contiguous match higher than a scattered one", () => {
    const contiguous = fuzzyScore("sma", "SMA Crossover")!;
    const scattered = fuzzyScore("sma", "Stochastic Momentum Average")!;
    expect(contiguous).toBeGreaterThan(scattered);
  });

  it("ranks a word-boundary match higher than a mid-word one", () => {
    const boundary = fuzzyScore("m", "Moving Average")!; // "M" starts the string
    const midWord = fuzzyScore("v", "Moving Average")!; // "v" is mid-word
    expect(boundary).toBeGreaterThan(midWord);
  });

  it("ranks a shorter target higher for an equally strong match", () => {
    const short = fuzzyScore("sma", "SMA")!;
    const long = fuzzyScore("sma", "SMA Crossover Strategy Bundle")!;
    expect(short).toBeGreaterThan(long);
  });

  it("an empty query matches everything with score 0", () => {
    expect(fuzzyScore("", "anything")).toBe(0);
  });
});

describe("fuzzyFilter", () => {
  interface Item { name: string; category: string }
  const items: Item[] = [
    { name: "RSI", category: "Momentum" },
    { name: "G-Channel", category: "Trend" },
    { name: "Simple Moving Average", category: "Trend" },
    { name: "Bollinger Bands", category: "Volatility" },
  ];
  const keys = (i: Item) => [i.name, i.category];

  it("drops items that match on neither key", () => {
    const result = fuzzyFilter(items, "zzz", keys);
    expect(result).toEqual([]);
  });

  it("matches against a secondary key (category) when the name doesn't match", () => {
    const result = fuzzyFilter(items, "momentum", keys);
    expect(result.map((i) => i.name)).toEqual(["RSI"]);
  });

  it("ranks best match first", () => {
    const result = fuzzyFilter(items, "gchn", keys);
    expect(result[0].name).toBe("G-Channel");
  });

  it("an empty query returns every item, unranked", () => {
    expect(fuzzyFilter(items, "", keys)).toEqual(items);
  });
});
