// @vitest-environment happy-dom
// klinecharts touches `window` at import time — diascript/klinecharts
// (a transitive import of this module) needs a DOM even to load.
import { describe, it, expect } from "vitest";
import { DIASCRIPT_CATALOG } from "./diascript-indicators";

describe("DIASCRIPT_CATALOG", () => {
  it("has no duplicate indicator names", () => {
    const names = DIASCRIPT_CATALOG.map((d) => d.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("every entry has a non-empty source and a matching outputName", () => {
    for (const def of DIASCRIPT_CATALOG) {
      expect(def.source.length).toBeGreaterThan(0);
      expect(def.source).toContain(def.outputName);
    }
  });

  it("still includes the original two proof-of-concept indicators", () => {
    const names = DIASCRIPT_CATALOG.map((d) => d.name);
    expect(names).toContain("DIA_EMA20");
    expect(names).toContain("DIA_RSI14");
  });
});
