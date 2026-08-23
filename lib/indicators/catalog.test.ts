import { describe, it, expect } from "vitest";
import { SPECIAL_INDICATORS, INDICATOR_CATEGORIES } from "./catalog";

describe("SPECIAL_INDICATORS", () => {
  it("has no duplicate ids", () => {
    const ids = SPECIAL_INDICATORS.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every entry's category is one of the known categories", () => {
    for (const entry of SPECIAL_INDICATORS) {
      expect(INDICATOR_CATEGORIES).toContain(entry.category);
    }
  });
});
