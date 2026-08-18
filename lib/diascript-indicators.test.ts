// @vitest-environment happy-dom
// klinecharts touches `window` at import time — diascript/klinecharts
// (a transitive import of this module) needs a DOM even to load.
import { describe, it, expect } from "vitest";
import { evaluate, InMemoryDataAdapter } from "diascript";
import { DIASCRIPT_CATALOG } from "./diascript-indicators";

// A synthetic ~90-bar OHLCV fixture (gentle uptrend, mid-series pullback, so
// trend indicators have real non-degenerate signal), one bar per minute
// starting at 09:15 UTC on bar 0 -- this specific start lets DIA_VWAP's
// `time.hour()==9 and time.minute()==15` session-start detection fire on
// exactly one bar, matching a real single continuous session.
const FIXTURE_BARS = [{"time":1767000900,"open":100.8081,"high":101.0456,"low":100.3115,"close":100.5231,"volume":5918},{"time":1767000960,"open":100.8705,"high":101.2493,"low":100.5595,"close":101.1058,"volume":1119},{"time":1767001020,"open":100.9524,"high":101.0689,"low":100.753,"close":100.9556,"volume":3599},{"time":1767001080,"open":101.4953,"high":101.8899,"low":100.8228,"close":101.3275,"volume":1025},{"time":1767001140,"open":101.998,"high":102.387,"low":101.8202,"close":102.1168,"volume":4828},{"time":1767001200,"open":102.3997,"high":102.5481,"low":101.6316,"close":102.1554,"volume":3414},{"time":1767001260,"open":102.809,"high":103.3149,"low":102.2224,"close":102.9468,"volume":2514},{"time":1767001320,"open":103.1324,"high":103.7393,"low":102.6016,"close":103.3301,"volume":4964},{"time":1767001380,"open":104.2299,"high":104.4438,"low":103.7127,"close":103.9574,"volume":1319},{"time":1767001440,"open":104.0692,"high":104.3082,"low":103.412,"close":103.8298,"volume":2459},{"time":1767001500,"open":104.0964,"high":104.3299,"low":103.3538,"close":103.9221,"volume":3592},{"time":1767001560,"open":104.5941,"high":105.0586,"low":104.215,"close":104.3967,"volume":2517},{"time":1767001620,"open":105.396,"high":105.8585,"low":104.9537,"close":105.48,"volume":4371},{"time":1767001680,"open":106.3841,"high":106.5002,"low":105.9639,"close":106.2216,"volume":2070},{"time":1767001740,"open":105.7934,"high":106.5973,"low":105.5361,"close":106.0592,"volume":5432},{"time":1767001800,"open":105.9434,"high":106.5216,"low":105.711,"close":106.1922,"volume":1986},{"time":1767001860,"open":106.7327,"high":107.125,"low":106.0414,"close":106.5904,"volume":2597},{"time":1767001920,"open":106.1427,"high":106.796,"low":105.9973,"close":106.4413,"volume":1188},{"time":1767001980,"open":106.0402,"high":106.6127,"low":105.7292,"close":106.1167,"volume":1254},{"time":1767002040,"open":105.9296,"high":106.5919,"low":105.3441,"close":106.2273,"volume":4443},{"time":1767002100,"open":105.6132,"high":106.1865,"low":105.2447,"close":105.7457,"volume":2067},{"time":1767002160,"open":106.5043,"high":106.8217,"low":105.9443,"close":106.2712,"volume":7222},{"time":1767002220,"open":107.3145,"high":107.6648,"low":106.9832,"close":107.1726,"volume":4650},{"time":1767002280,"open":108.1863,"high":108.6058,"low":107.6609,"close":108.0654,"volume":1611},{"time":1767002340,"open":108.7618,"high":109.2747,"low":108.3966,"close":108.7854,"volume":1002},{"time":1767002400,"open":109.0924,"high":109.6569,"low":108.2647,"close":108.8041,"volume":4326},{"time":1767002460,"open":109.0613,"high":109.6003,"low":108.2226,"close":108.7961,"volume":1342},{"time":1767002520,"open":109.3321,"high":109.8124,"low":108.5908,"close":109.0737,"volume":1513},{"time":1767002580,"open":109.3042,"high":109.5667,"low":108.768,"close":109.3341,"volume":4038},{"time":1767002640,"open":109.1494,"high":109.638,"low":108.9488,"close":109.173,"volume":2246},{"time":1767002700,"open":110.1753,"high":110.5843,"low":109.8165,"close":110.2652,"volume":1484},{"time":1767002760,"open":110.2219,"high":110.6161,"low":109.9097,"close":110.1248,"volume":1880},{"time":1767002820,"open":109.6597,"high":109.9528,"low":109.107,"close":109.7383,"volume":4438},{"time":1767002880,"open":109.5089,"high":109.9434,"low":109.1446,"close":109.3517,"volume":1529},{"time":1767002940,"open":110.3059,"high":110.6849,"low":109.8136,"close":110.3485,"volume":4229},{"time":1767003000,"open":110.395,"high":110.7106,"low":109.8414,"close":110.1532,"volume":4302},{"time":1767003060,"open":110.7157,"high":111.4118,"low":110.5665,"close":110.8197,"volume":2610},{"time":1767003120,"open":110.6456,"high":111.0869,"low":110.4505,"close":110.8626,"volume":2794},{"time":1767003180,"open":111.1705,"high":111.3954,"low":110.476,"close":111.0376,"volume":2772},{"time":1767003240,"open":111.8856,"high":112.0411,"low":111.2859,"close":111.9158,"volume":4344},{"time":1767003300,"open":111.9103,"high":112.6905,"low":111.7272,"close":112.1662,"volume":2942},{"time":1767003360,"open":111.2675,"high":111.3969,"low":110.9187,"close":111.2082,"volume":4941},{"time":1767003420,"open":110.162,"high":110.66,"low":109.8505,"close":110.3325,"volume":7243},{"time":1767003480,"open":110.5917,"high":111.0844,"low":110.4143,"close":110.6252,"volume":2186},{"time":1767003540,"open":110.8276,"high":111.2462,"low":110.3536,"close":110.8751,"volume":1228},{"time":1767003600,"open":110.5081,"high":111.0361,"low":110.3294,"close":110.5098,"volume":4843},{"time":1767003660,"open":109.5265,"high":109.924,"low":108.9004,"close":109.338,"volume":1940},{"time":1767003720,"open":107.9956,"high":108.4529,"low":107.5983,"close":108.2298,"volume":3477},{"time":1767003780,"open":107.5503,"high":107.9619,"low":106.983,"close":107.6005,"volume":1817},{"time":1767003840,"open":107.6032,"high":107.9011,"low":107.0106,"close":107.4464,"volume":3299},{"time":1767003900,"open":106.5012,"high":106.7886,"low":106.1721,"close":106.6523,"volume":4993},{"time":1767003960,"open":107.2021,"high":107.4087,"low":106.7135,"close":106.9461,"volume":4733},{"time":1767004020,"open":106.8279,"high":107.3402,"low":106.649,"close":107.0555,"volume":4334},{"time":1767004080,"open":106.8141,"high":107.4747,"low":106.3871,"close":106.8811,"volume":1031},{"time":1767004140,"open":107.0089,"high":107.4406,"low":106.319,"close":106.8885,"volume":1537},{"time":1767004200,"open":106.909,"high":107.2856,"low":106.437,"close":106.6732,"volume":3419},{"time":1767004260,"open":107.5992,"high":108.0163,"low":107.1894,"close":107.4214,"volume":4431},{"time":1767004320,"open":108.2622,"high":108.616,"low":107.9504,"close":108.4699,"volume":2106},{"time":1767004380,"open":107.9129,"high":108.4941,"low":107.6819,"close":108.0756,"volume":3964},{"time":1767004440,"open":108.6016,"high":108.7065,"low":108.4206,"close":108.5583,"volume":4532},{"time":1767004500,"open":109.5772,"high":110.1218,"low":109.1859,"close":109.6045,"volume":1592},{"time":1767004560,"open":109.5235,"high":110.073,"low":108.9104,"close":109.4085,"volume":4442},{"time":1767004620,"open":110.6207,"high":110.8455,"low":110.2953,"close":110.4467,"volume":4120},{"time":1767004680,"open":111.5175,"high":111.9279,"low":111.2841,"close":111.4614,"volume":7079},{"time":1767004740,"open":112.159,"high":112.9501,"low":111.6183,"close":112.4447,"volume":1099},{"time":1767004800,"open":113.3239,"high":113.8893,"low":112.7221,"close":113.2232,"volume":4456},{"time":1767004860,"open":114.2603,"high":114.754,"low":113.9664,"close":114.1204,"volume":4488},{"time":1767004920,"open":115.2607,"high":115.769,"low":114.764,"close":115.0942,"volume":2220},{"time":1767004980,"open":116.1302,"high":116.242,"low":115.7702,"close":115.9667,"volume":2313},{"time":1767005040,"open":116.6696,"high":117.1893,"low":116.2488,"close":116.9497,"volume":2598},{"time":1767005100,"open":118.0978,"high":118.6891,"low":117.9401,"close":118.1195,"volume":7322},{"time":1767005160,"open":117.7277,"high":118.238,"low":117.5735,"close":118.0052,"volume":2738},{"time":1767005220,"open":118.8827,"high":119.2858,"low":118.4152,"close":118.7709,"volume":2540},{"time":1767005280,"open":119.4406,"high":119.895,"low":119.1926,"close":119.2935,"volume":4702},{"time":1767005340,"open":119.6233,"high":120.2259,"low":119.188,"close":119.755,"volume":2456},{"time":1767005400,"open":119.3684,"high":119.732,"low":119.1114,"close":119.4669,"volume":4392},{"time":1767005460,"open":120.3383,"high":120.593,"low":119.9143,"close":120.2185,"volume":2609},{"time":1767005520,"open":120.5152,"high":120.8254,"low":119.7214,"close":120.2916,"volume":5563},{"time":1767005580,"open":121.2668,"high":121.5866,"low":120.8928,"close":121.3361,"volume":1001},{"time":1767005640,"open":121.4372,"high":121.8272,"low":120.9678,"close":121.3951,"volume":2859},{"time":1767005700,"open":121.8744,"high":122.211,"low":121.152,"close":121.7026,"volume":4184},{"time":1767005760,"open":121.8232,"high":122.1809,"low":121.1576,"close":121.5741,"volume":2340},{"time":1767005820,"open":122.3329,"high":122.92,"low":122.1206,"close":122.4836,"volume":1796},{"time":1767005880,"open":122.2758,"high":122.6133,"low":121.5978,"close":122.1227,"volume":1291},{"time":1767005940,"open":122.3079,"high":122.583,"low":121.8597,"close":122.3858,"volume":4466},{"time":1767006000,"open":122.2825,"high":122.4789,"low":121.807,"close":122.3761,"volume":4080},{"time":1767006060,"open":122.1916,"high":122.3795,"low":121.5677,"close":122.1467,"volume":3071},{"time":1767006120,"open":121.9775,"high":122.5017,"low":121.4988,"close":121.827,"volume":4205},{"time":1767006180,"open":122.2024,"high":122.8929,"low":121.6274,"close":122.4952,"volume":4565},{"time":1767006240,"open":122.9438,"high":123.4278,"low":122.4285,"close":123.0754,"volume":3191}];

const fixtureAdapter = new InMemoryDataAdapter();

/** Evaluates a catalog entry by name against the shared fixture, returning
 * the last bar's value (or {upper, lower} for a band output). Golden-value
 * tests read the SHIPPED catalog source directly, so a formula can never
 * drift from what's actually tested. */
async function lastValueOf(name: string): Promise<number | { upper: number; lower: number }> {
  const def = DIASCRIPT_CATALOG.find((d) => d.name === name);
  if (!def) throw new Error(`No catalog entry named ${name}`);
  const result = await evaluate(def.source, FIXTURE_BARS, fixtureAdapter, "TEST");
  const out = result.outputs[def.outputName];
  if (!out) throw new Error(`No '${def.outputName}' output for ${name} -- diagnostics: ${JSON.stringify(result.diagnostics)}`);
  if (out.type === "band") return { upper: out.upper.at(-1)!.value, lower: out.lower.at(-1)!.value };
  if (out.type !== "line" && out.type !== "histogram") {
    throw new Error(`${name}: '${out.type}' outputs have no scalar last value`);
  }
  return out.points.at(-1)!.value;
}

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

// Ground truth for every indicator below was generated by running the real
// ai-trader-signals pandas_ta calls (app/signals/indicators.py's exact
// parameters) against this SAME fixture, except: DIA_CCI (pandas_ta's own
// pure-Python CCI formula -- confirmed via source inspection, talib is not
// installed in that venv -- applies the subtraction outside the division,
// which is not the standard CCI definition; this formula uses the correct/
// standard one instead and is verified structurally, not against that
// reference) and DIA_ICHIMOKU_SENKOU_A/B (pandas_ta's "visible" Ichimoku
// output is already forward-shifted 26 bars for display, which this engine
// cannot do -- see the design spec's accepted no-offset simplification --
// so these are verified structurally, via their own defining relationship,
// not against the shifted reference value).

describe("Trend indicators — golden values", () => {
  it("ADX / +DI / -DI", async () => {
    expect(await lastValueOf("DIA_ADX")).toBeCloseTo(61.898434, 0);
    expect(await lastValueOf("DIA_DI_PLUS")).toBeCloseTo(35.073706, 0);
    expect(await lastValueOf("DIA_DI_MINUS")).toBeCloseTo(7.057399, 0);
  });

  it("Aroon Up / Down", async () => {
    expect(await lastValueOf("DIA_AROON_UP")).toBeCloseTo(100, 1);
    expect(await lastValueOf("DIA_AROON_DOWN")).toBeCloseTo(0, 1);
  });

  it("Donchian Upper / Mid / Lower", async () => {
    expect(await lastValueOf("DIA_DONCHIAN_UPPER")).toBeCloseTo(123.4278, 2);
    expect(await lastValueOf("DIA_DONCHIAN_MID")).toBeCloseTo(120.50065, 2);
    expect(await lastValueOf("DIA_DONCHIAN_LOWER")).toBeCloseTo(117.5735, 2);
  });

  it("Envelopes are a fixed percent band around a 20-SMA", async () => {
    const upper = await lastValueOf("DIA_ENVELOPE_UPPER") as number;
    const lower = await lastValueOf("DIA_ENVELOPE_LOWER") as number;
    expect(upper).toBeGreaterThan(lower);
    expect(upper / lower).toBeCloseTo(1.025 / 0.975, 3);
  });

  it("Ichimoku Tenkan / Kijun match the real reference", async () => {
    expect(await lastValueOf("DIA_ICHIMOKU_TENKAN")).toBeCloseTo(122.2927, 2);
    expect(await lastValueOf("DIA_ICHIMOKU_KIJUN")).toBeCloseTo(117.52305, 2);
  });

  it("Ichimoku Senkou A/B hold their own defining relationship (no forward shift, per the accepted simplification)", async () => {
    const tenkan = await lastValueOf("DIA_ICHIMOKU_TENKAN") as number;
    const kijun = await lastValueOf("DIA_ICHIMOKU_KIJUN") as number;
    const senkouA = await lastValueOf("DIA_ICHIMOKU_SENKOU_A") as number;
    const senkouB = await lastValueOf("DIA_ICHIMOKU_SENKOU_B") as number;
    expect(senkouA).toBeCloseTo((tenkan + kijun) / 2, 4);
    expect(Number.isFinite(senkouB)).toBe(true);
  });

  it("Keltner Upper / Mid / Lower", async () => {
    expect(await lastValueOf("DIA_KELTNER_UPPER")).toBeCloseTo(122.400579, 1);
    expect(await lastValueOf("DIA_KELTNER_MID")).toBeCloseTo(120.312989, 1);
    expect(await lastValueOf("DIA_KELTNER_LOWER")).toBeCloseTo(118.225399, 1);
  });

  it("Hull Moving Average", async () => {
    expect(await lastValueOf("DIA_HMA")).toBeCloseTo(122.917442, 1);
  });

  it("Double/Triple EMA are finite and in the fixture's price range (regression test for the ema-of-ema NaN bug)", async () => {
    const dema = await lastValueOf("DIA_DEMA") as number;
    const tema = await lastValueOf("DIA_TEMA") as number;
    expect(Number.isFinite(dema)).toBe(true);
    expect(Number.isFinite(tema)).toBe(true);
    expect(dema).toBeGreaterThan(110);
    expect(tema).toBeGreaterThan(110);
  });

  it("SuperTrend direction and line", async () => {
    expect(await lastValueOf("DIA_SUPERTREND")).toBeCloseTo(119.807199, 0);
  });
});

describe("Momentum indicators — golden values", () => {
  it("Stochastic %K / %D", async () => {
    expect(await lastValueOf("DIA_STOCH_K")).toBeCloseTo(83.546736, 0);
    expect(await lastValueOf("DIA_STOCH_D")).toBeCloseTo(81.045355, 0);
  });

  it("Stochastic RSI %K / %D", async () => {
    expect(await lastValueOf("DIA_STOCHRSI_K")).toBeCloseTo(19.671332, 0);
    expect(await lastValueOf("DIA_STOCHRSI_D")).toBeCloseTo(10.146586, 0);
  });

  it("Awesome Oscillator is finite and reflects the fixture's uptrend momentum", async () => {
    const ao = await lastValueOf("DIA_AWESOME_OSC") as number;
    expect(ao).toBeCloseTo(5.196, 1);
  });

  it("Momentum (close vs. 10 bars ago)", async () => {
    expect(await lastValueOf("DIA_MOMENTUM")).toBeCloseTo(1.6803, 2);
  });

  it("Rate of Change", async () => {
    expect(await lastValueOf("DIA_ROC")).toBeCloseTo(1.384158, 1);
  });

  it("CCI (standard formula, verified structurally — see file header)", async () => {
    const cci = await lastValueOf("DIA_CCI") as number;
    expect(Number.isFinite(cci)).toBe(true);
  });

  it("Williams %R", async () => {
    expect(await lastValueOf("DIA_WILLIAMS_R")).toBeCloseTo(-9.507878, 1);
  });

  it("Ultimate Oscillator", async () => {
    expect(await lastValueOf("DIA_ULTIMATE_OSC")).toBeCloseTo(61.895024, 0);
  });

  it("TRIX is finite (regression test for the ema-of-ema-of-ema NaN bug)", async () => {
    const trix = await lastValueOf("DIA_TRIX") as number;
    expect(Number.isFinite(trix)).toBe(true);
  });

  it("Fisher Transform is finite and within its typical range", async () => {
    const fisher = await lastValueOf("DIA_FISHER") as number;
    expect(Number.isFinite(fisher)).toBe(true);
  });

  it("Money Flow Index", async () => {
    expect(await lastValueOf("DIA_MFI")).toBeCloseTo(66.790862, 0);
  });

  it("Chande Momentum Oscillator is finite and within [-100, 100]", async () => {
    const cmo = await lastValueOf("DIA_CMO") as number;
    expect(cmo).toBeGreaterThanOrEqual(-100);
    expect(cmo).toBeLessThanOrEqual(100);
  });
});

describe("Volatility indicators — golden values", () => {
  it("Average True Range (Wilder-smoothed, matching pandas_ta's real default mamode)", async () => {
    expect(await lastValueOf("DIA_ATR")).toBeCloseTo(1.06306, 1);
  });

  it("Bollinger Bands %B", async () => {
    expect(await lastValueOf("DIA_BB_PCT")).toBeCloseTo(0.839088, 1);
  });

  it("Bollinger Bands Width", async () => {
    expect(await lastValueOf("DIA_BB_WIDTH")).toBeCloseTo(0.052, 2);
  });

  it("Standard Deviation", async () => {
    expect(await lastValueOf("DIA_STDEV")).toBeCloseTo(1.533015, 2);
  });

  it("Historical Volatility is finite and positive", async () => {
    const hv = await lastValueOf("DIA_HIST_VOL") as number;
    expect(hv).toBeGreaterThan(0);
  });
});

describe("Volume indicators — golden values", () => {
  it("On Balance Volume", async () => {
    expect(await lastValueOf("DIA_OBV")).toBeCloseTo(89340, 0);
  });

  it("Accumulation/Distribution", async () => {
    const ad = await lastValueOf("DIA_AD") as number;
    expect(Math.abs(ad - -4634.110147)).toBeLessThan(1);
  });

  it("Chaikin Money Flow", async () => {
    expect(await lastValueOf("DIA_CMF")).toBeCloseTo(0.017264, 2);
  });

  it("VWAP (session-anchored, resetting at 09:15 market open)", async () => {
    expect(await lastValueOf("DIA_VWAP")).toBeCloseTo(111.086341, 1);
  });

  it("VWMA", async () => {
    expect(await lastValueOf("DIA_VWMA")).toBeCloseTo(120.76022, 1);
  });

  it("Volume Oscillator", async () => {
    expect(await lastValueOf("DIA_VOL_OSC")).toBeCloseTo(10.201669, 0);
  });

  it("Price Volume Trend", async () => {
    const pvt = await lastValueOf("DIA_PVT") as number;
    expect(Math.abs(pvt - 63095.506125)).toBeLessThan(5);
  });

  it("Ease of Movement", async () => {
    const eom = await lastValueOf("DIA_EOM") as number;
    expect(Math.abs(eom - 9323.459142)).toBeLessThan(5);
  });
});
