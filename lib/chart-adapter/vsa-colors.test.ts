import { describe, it, expect } from "vitest";
import { computeVsaColors } from "./vsa-colors";

function bar(overrides: Partial<{ time: number; open: number; high: number; low: number; close: number; volume: number }>) {
  return { time: 0, open: 100, high: 101, low: 99, close: 100.5, volume: 1000, ...overrides };
}

describe("computeVsaColors", () => {
  it("falls back to plain up/down color before any lookback history exists", () => {
    const colors = computeVsaColors([bar({ close: 101 }), bar({ close: 99 })]);
    expect(colors[0]).toBe("#16c78466"); // up, no history yet
    expect(colors[1]).toBe("#f0525d66"); // down, no history yet
  });

  it("colors a wide-spread high-volume up bar as strength", () => {
    const quiet = Array.from({ length: 10 }, () => bar({ high: 101, low: 99, volume: 1000, close: 100.5 }));
    const strengthBar = bar({ high: 110, low: 90, volume: 5000, close: 109, open: 91 }); // wide spread, high volume, up
    const colors = computeVsaColors([...quiet, strengthBar]);
    expect(colors[10]).toBe("#00e08188");
  });

  it("colors a wide-spread high-volume down bar as weakness", () => {
    const quiet = Array.from({ length: 10 }, () => bar({ high: 101, low: 99, volume: 1000, close: 100.5 }));
    const weaknessBar = bar({ high: 110, low: 90, volume: 5000, close: 91, open: 109 }); // wide spread, high volume, down
    const colors = computeVsaColors([...quiet, weaknessBar]);
    expect(colors[10]).toBe("#ff4d6d88");
  });

  it("colors a narrow-spread high-volume bar as no-demand/no-supply regardless of direction", () => {
    const quiet = Array.from({ length: 10 }, () => bar({ high: 101, low: 99, volume: 1000 }));
    const narrowHighVol = bar({ high: 100.2, low: 99.9, volume: 6000, open: 100, close: 100.1 }); // narrow spread, high volume
    const colors = computeVsaColors([...quiet, narrowHighVol]);
    expect(colors[10]).toBe("#f0b90b88");
  });

  it("colors a wide-spread low-volume bar as effort-without-result", () => {
    const quiet = Array.from({ length: 10 }, () => bar({ high: 101, low: 99, volume: 1000 }));
    const wideLowVol = bar({ high: 110, low: 90, volume: 200, open: 91, close: 109 }); // wide spread, low volume
    const colors = computeVsaColors([...quiet, wideLowVol]);
    expect(colors[10]).toBe("#a855f788");
  });

  it("colors an unremarkable bar with the plain up/down colors", () => {
    const quiet = Array.from({ length: 10 }, () => bar({ high: 101, low: 99, volume: 1000 }));
    const normalUp = bar({ high: 101.5, low: 99.5, volume: 1050, open: 100, close: 100.8 });
    const colors = computeVsaColors([...quiet, normalUp]);
    expect(colors[10]).toBe("#16c78466");
  });
});
