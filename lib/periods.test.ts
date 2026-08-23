import { describe, it, expect } from "vitest";
import { withinVisibilityRange } from "./periods";

describe("withinVisibilityRange", () => {
  it("is always visible with no visibility bounds set", () => {
    expect(withinVisibilityRange("1h")).toBe(true);
    expect(withinVisibilityRange("1h", {})).toBe(true);
  });

  it("hides below the minimum interval", () => {
    expect(withinVisibilityRange("1m", { minInterval: "5m" })).toBe(false);
    expect(withinVisibilityRange("5m", { minInterval: "5m" })).toBe(true); // inclusive
    expect(withinVisibilityRange("1h", { minInterval: "5m" })).toBe(true);
  });

  it("hides above the maximum interval", () => {
    expect(withinVisibilityRange("1d", { maxInterval: "1h" })).toBe(false);
    expect(withinVisibilityRange("1h", { maxInterval: "1h" })).toBe(true); // inclusive
    expect(withinVisibilityRange("5m", { maxInterval: "1h" })).toBe(true);
  });

  it("enforces both bounds together, matching TradingView's Visibility tab semantics", () => {
    const visibility = { minInterval: "5m", maxInterval: "1h" };
    expect(withinVisibilityRange("1m", visibility)).toBe(false);
    expect(withinVisibilityRange("30m", visibility)).toBe(true);
    expect(withinVisibilityRange("1d", visibility)).toBe(false);
  });

  it("fails open for an interval outside the known set, rather than hiding something it can't evaluate", () => {
    expect(withinVisibilityRange("2h", { minInterval: "5m", maxInterval: "1h" })).toBe(true);
  });
});
