import { describe, it, expect } from "vitest";
import { findErrorHint } from "./error-hints";

describe("findErrorHint", () => {
  it("does not flag syminfo.* -- real syminfo support was added (see bars-provider.mjs)", () => {
    const source = 'alert("BUY Signal - " + syminfo.ticker, alert.freq_once_per_bar_close)';
    expect(findErrorHint(source)).toBeNull();
  });

  it("does not flag timeframe.* -- resolves via the PineTS constructor's own tickerId/timeframe args", () => {
    expect(findErrorHint("plot(timeframe.multiplier)")).toBeNull();
  });

  it("recognizes request.security()", () => {
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
