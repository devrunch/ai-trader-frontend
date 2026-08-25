// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { createChart, type CandlestickData, type Time } from "lightweight-charts";
import { createHeikinAshiRenderer } from "./heikin-ashi";
import type { ApiOhlcBar } from "@/lib/api";

function point(d: CandlestickData<Time>) {
  // Real LWC candlestick data always carries open/high/low/close for this
  // series type -- narrowed here only to satisfy TS on the return of
  // series.data(), which is typed to the union of every series' own shape.
  const p = d as { open: number; high: number; low: number; close: number };
  return { open: p.open, high: p.high, low: p.low, close: p.close };
}

const CLOSE = (n: number) => expect.closeTo(n, 6);

describe("createHeikinAshiRenderer", () => {
  it("computes the standard recursive HA formula against a hand-worked fixture", () => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    const chart = createChart(el);
    const bars: ApiOhlcBar[] = [
      { time: 100, open: 100, high: 105, low: 95, close: 102, volume: 0 },
      { time: 200, open: 102, high: 110, low: 101, close: 108, volume: 0 },
      { time: 300, open: 108, high: 112, low: 104, close: 106, volume: 0 },
    ];
    const { series } = createHeikinAshiRenderer(chart, bars);
    const data = series.data().map((d) => point(d as CandlestickData<Time>));

    expect(data[0]).toEqual({ open: CLOSE(101), high: CLOSE(105), low: CLOSE(95), close: CLOSE(100.5) });
    expect(data[1]).toEqual({ open: CLOSE(100.75), high: CLOSE(110), low: CLOSE(100.75), close: CLOSE(105.25) });
    expect(data[2]).toEqual({ open: CLOSE(103), high: CLOSE(112), low: CLOSE(103), close: CLOSE(107.5) });
    chart.remove();
  });

  it("an in-place update to the still-forming bar recomputes its own HA without disturbing HA_open, and a genuinely new bar derives from the UPDATED value, not the stale one", () => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    const chart = createChart(el);
    const bars: ApiOhlcBar[] = [
      { time: 100, open: 100, high: 105, low: 95, close: 102, volume: 0 },
      { time: 200, open: 102, high: 110, low: 101, close: 108, volume: 0 },
      { time: 300, open: 108, high: 112, low: 104, close: 106, volume: 0 },
    ];
    const { series, updateBar } = createHeikinAshiRenderer(chart, bars);

    // Same time as the last bar -- an in-place edit (a live tick moving the
    // still-forming candle), not a new bar. HA_open must stay 103 (still
    // derived from bar[1]'s own HA, untouched), only close/high/low move.
    updateBar({ time: 300, open: 108, high: 112, low: 104, close: 109, volume: 0 });
    let last = point(series.data()[2] as CandlestickData<Time>);
    expect(last).toEqual({ open: CLOSE(103), high: CLOSE(112), low: CLOSE(103), close: CLOSE(108.25) });

    // A genuinely new bar (new time) -- its own HA_open must derive from
    // the just-closed bar's UPDATED HA (108.25/103 above), not the stale
    // pre-update value (107.5/103) that was true before the live tick.
    updateBar({ time: 400, open: 109, high: 115, low: 108, close: 111, volume: 0 });
    const newest = point(series.data()[3] as CandlestickData<Time>);
    expect(newest).toEqual({ open: CLOSE(105.625), high: CLOSE(115), low: CLOSE(105.625), close: CLOSE(110.75) });
    chart.remove();
  });
});
