import { describe, it, expect } from "vitest";
import { findErrorHint } from "./error-hints";

describe("findErrorHint", () => {
  it("recognizes syminfo.* usage -- the real G-Channel script's failure mode", () => {
    const source = 'alert("BUY Signal - " + syminfo.ticker, alert.freq_once_per_bar_close)';
    expect(findErrorHint(source)).toMatch(/syminfo/);
  });

  it("recognizes timeframe.*", () => {
    expect(findErrorHint("plot(timeframe.multiplier)")).toMatch(/timeframe/);
  });

  it("recognizes request.security()", () => {
    // Not "syminfo.tickerid" here on purpose -- that would match the
    // syminfo pattern first, which is correct first-match-wins behavior
    // but would make this test assert the wrong thing.
    expect(findErrorHint('request.security("NASDAQ:AAPL", "D", close)')).toMatch(/request\.security/);
  });

  it("recognizes strategy.*()", () => {
    expect(findErrorHint('strategy.entry("Long", strategy.long)')).toMatch(/strategy mode/);
  });

  it("recognizes bgcolor()", () => {
    expect(findErrorHint("bgcolor(color.red)")).toMatch(/bgcolor/);
  });

  it("returns null for a script with no known-unsupported construct", () => {
    expect(findErrorHint('plot(ta.sma(close, 20), "SMA")')).toBeNull();
  });
});
