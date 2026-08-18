// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { filterCatalog } from "./IndicatorSearchModal";
import { INDICATOR_CATALOG } from "./IndicatorMenu";

describe("filterCatalog", () => {
  it("matches by case-insensitive substring on label", () => {
    const result = filterCatalog(INDICATOR_CATALOG, "rsi", "All");
    expect(result.some((i) => i.name === "RSI")).toBe(true);
    expect(result.every((i) => i.label.toLowerCase().includes("rsi"))).toBe(true);
  });

  it("narrows by category when one is selected", () => {
    const result = filterCatalog(INDICATOR_CATALOG, "", "Volume");
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((i) => i.category === "Volume")).toBe(true);
  });

  it("combines search and category", () => {
    const result = filterCatalog(INDICATOR_CATALOG, "index", "Momentum");
    expect(result.every((i) => i.category === "Momentum" && i.label.toLowerCase().includes("index"))).toBe(true);
  });

  it("shows everything when search is empty and category is All", () => {
    expect(filterCatalog(INDICATOR_CATALOG, "", "All").length).toBe(INDICATOR_CATALOG.length);
  });

  it("returns nothing for a search term matching no label", () => {
    expect(filterCatalog(INDICATOR_CATALOG, "zzz_not_a_real_indicator", "All").length).toBe(0);
  });
});
