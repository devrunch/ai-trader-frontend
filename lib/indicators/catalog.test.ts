import { describe, it, expect } from "vitest";
import { INDICATOR_CATALOG } from "./catalog";

describe("INDICATOR_CATALOG", () => {
  it("has no duplicate ids -- a copy-paste mistake here silently shadows one indicator with another", () => {
    const ids = INDICATOR_CATALOG.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every pine entry's source is a real Pine v5 script with a plot()", () => {
    for (const entry of INDICATOR_CATALOG) {
      if (entry.kind !== "pine") continue;
      expect(entry.source).toContain("//@version=5");
      expect(entry.source).toContain("plot(");
    }
  });
});
