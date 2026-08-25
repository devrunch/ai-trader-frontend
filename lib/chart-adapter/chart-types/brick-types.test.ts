// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { createChart, type CandlestickData, type LineData, type Time } from "lightweight-charts";
import { createRenkoRenderer } from "./renko";
import { createRangeRenderer } from "./range";
import { createLineBreakRenderer } from "./line-break";
import { createKagiRenderer } from "./kagi";
import { createPointFigureRenderer } from "./point-figure";
import type { ApiOhlcBar } from "@/lib/api";

// defaultBoxSize (brick-utils.ts) is (max high - min low) / 40 across ALL
// bars in the fixture -- every bar below fixes high=400/low=0 so every
// fixture in this file gets the exact same boxSize=10, made deterministic
// on purpose so the traced-by-hand expectations are exact numbers, not
// approximations.
const bar = (time: number, close: number, open = close): ApiOhlcBar => ({ time, open, high: 400, low: 0, close, volume: 0 });

function ohlc(d: CandlestickData<Time>) {
  const p = d as { open: number; high: number; low: number; close: number };
  return { open: p.open, high: p.high, low: p.low, close: p.close };
}

describe("createRenkoRenderer", () => {
  it("emits one brick per box crossed, and reverses direction on a single box against the base (not permanently stuck going one way)", () => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    const chart = createChart(el);
    const bars = [bar(1000, 100), bar(2000, 110), bar(3000, 120), bar(4000, 100)];
    const { series } = createRenkoRenderer(chart, bars);
    const data = series.data().map((d) => ({ time: d.time, ...ohlc(d as CandlestickData<Time>) }));

    expect(data).toEqual([
      { time: 2000, open: 100, high: 110, low: 100, close: 110 },
      { time: 3000, open: 110, high: 120, low: 110, close: 120 },
      { time: 4000, open: 120, high: 120, low: 110, close: 110 },
      { time: 4001, open: 110, high: 110, low: 100, close: 100 }, // shares bar3's real time with the brick above -- bumped +1
    ]);
    chart.remove();
  });
});

describe("createRangeRenderer", () => {
  it("closes a range bar once its own high-low span reaches the box size, and keeps the still-forming one open", () => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    const chart = createChart(el);
    const bars = [bar(1000, 100), bar(2000, 105), bar(3000, 112), bar(4000, 115)];
    const { series } = createRangeRenderer(chart, bars);
    const data = series.data().map((d) => ({ time: d.time, ...ohlc(d as CandlestickData<Time>) }));

    expect(data).toEqual([
      { time: 3000, open: 100, high: 112, low: 100, close: 112 },
      { time: 4000, open: 115, high: 115, low: 115, close: 115 }, // forming bar, still open
    ]);
    chart.remove();
  });
});

describe("createLineBreakRenderer", () => {
  it("skips a bar that stays inside the last-N-blocks' range, and breaks out in either direction once it doesn't", () => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    const chart = createChart(el);
    const bars = [
      bar(1000, 102, 100), bar(2000, 108), bar(3000, 104), bar(4000, 101), bar(5000, 115),
    ];
    const { series } = createLineBreakRenderer(chart, bars);
    const data = series.data().map((d) => ({ time: d.time, ...ohlc(d as CandlestickData<Time>) }));

    expect(data).toEqual([
      { time: 1000, open: 100, high: 102, low: 100, close: 102 },
      { time: 2000, open: 102, high: 108, low: 102, close: 108 },
      // bar3 (close 104) sat inside [102, 108] -- no block, confirmed by its
      // absence here rather than a skipped/blank entry.
      { time: 4000, open: 108, high: 108, low: 101, close: 101 },
      { time: 5000, open: 101, high: 115, low: 101, close: 115 },
    ]);
    chart.remove();
  });
});

describe("createKagiRenderer", () => {
  it("only turns once price reverses by a full box, staying silent inside the deadband", () => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    const chart = createChart(el);
    const bars = [
      bar(1000, 100), bar(2000, 108), bar(3000, 102), bar(4000, 95), bar(5000, 90), bar(6000, 103),
    ];
    const { series } = createKagiRenderer(chart, bars);
    const data = series.data().map((d) => {
      const p = d as LineData<Time>;
      return { time: p.time, value: p.value, color: p.color };
    });

    expect(data).toEqual([
      { time: 1000, value: 100, color: "#16c784" },
      { time: 2000, value: 108, color: "#16c784" },
      // bar3 (102) was only 6 below the 108 extreme -- inside the 10-point
      // reversal band, so it produced no point at all.
      { time: 4000, value: 95, color: "#f0525d" },
      { time: 5000, value: 90, color: "#f0525d" },
      { time: 6000, value: 103, color: "#16c784" },
    ]);
    chart.remove();
  });
});

describe("createPointFigureRenderer", () => {
  it("extends the current column while price keeps making new boxes in that direction, and reverses only past the 3-box threshold", () => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    const chart = createChart(el);
    const bars = [bar(1000, 100), bar(2000, 115), bar(3000, 95), bar(4000, 85), bar(5000, 65)];
    const { series } = createPointFigureRenderer(chart, bars);
    // The anchor series only carries one invisible midpoint per column (the
    // primitive draws the real X/O grid) -- (boxes[0]+boxes[last])/2 is
    // still a faithful fingerprint of each column's real box range.
    const data = series.data().map((d) => ({ time: d.time, value: (d as LineData<Time>).value }));

    expect(data).toEqual([
      { time: 4000, value: (100 + 120) / 2 },  // X column 100..120, reversed on bar3's close=85 (level 90, 3 boxes past the 120 top)
      { time: 5000, value: (110 + 70) / 2 },   // O column 110..70, still forming at end of data
    ]);
    chart.remove();
  });
});
