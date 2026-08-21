import type { ApiOhlcBar } from "@/lib/api";

const LOOKBACK = 10;
const WIDE = 1.5;
const NARROW = 0.6;
const HIGH_VOL = 1.5;
const LOW_VOL = 0.6;

// Simplified Volume Spread Analysis (Tom Williams' VSA, retail-friendly
// reduction): categorize each bar by (spread relative to its own recent
// average) x (volume relative to its own recent average), not a full
// pivot/trend-aware VSA implementation -- those need swing-point context
// this is a per-bar coloring pass has no reason to carry.
const STRENGTH = "#00e08188";   // wide spread, high volume, up -- buyers in control
const WEAKNESS = "#ff4d6d88";   // wide spread, high volume, down -- sellers in control
const NO_DEMAND_SUPPLY = "#f0b90b88"; // narrow spread, high volume -- effort met resistance
const EFFORT_NO_RESULT = "#a855f788"; // wide spread, low volume -- move isn't backed by volume
const NORMAL_UP = "#16c78466";
const NORMAL_DOWN = "#f0525d66";

/** The same four categories `computeVsaColors` assigns, for a UI color key --
 *  kept next to the colors themselves so the two can't drift apart. */
export const VSA_LEGEND: { label: string; color: string }[] = [
  { label: "Strength (wide spread, high volume, up)", color: STRENGTH },
  { label: "Weakness (wide spread, high volume, down)", color: WEAKNESS },
  { label: "No Demand / No Supply (narrow spread, high volume)", color: NO_DEMAND_SUPPLY },
  { label: "Effort w/o Result (wide spread, low volume)", color: EFFORT_NO_RESULT },
];

function average(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((s, v) => s + v, 0) / values.length;
}

/** One VSA color per bar, in the same order as `bars`. Each bar's averages
 *  are computed over the `LOOKBACK` bars strictly before it (a bar can't be
 *  compared against a rolling average that includes itself), so the first
 *  few bars fall back to NORMAL_UP/DOWN before enough history exists. */
export function computeVsaColors(bars: ApiOhlcBar[]): string[] {
  return bars.map((bar, i) => {
    const start = Math.max(0, i - LOOKBACK);
    const window = bars.slice(start, i);
    const isUp = bar.close >= bar.open;
    if (window.length === 0) return isUp ? NORMAL_UP : NORMAL_DOWN;

    const avgSpread = average(window.map((b) => b.high - b.low));
    const avgVolume = average(window.map((b) => b.volume ?? 0));
    const spread = bar.high - bar.low;
    const volume = bar.volume ?? 0;
    const spreadRatio = avgSpread > 0 ? spread / avgSpread : 1;
    const volRatio = avgVolume > 0 ? volume / avgVolume : 1;

    const isWide = spreadRatio > WIDE;
    const isNarrow = spreadRatio < NARROW;
    const isHighVol = volRatio > HIGH_VOL;
    const isLowVol = volRatio < LOW_VOL;

    if (isWide && isHighVol) return isUp ? STRENGTH : WEAKNESS;
    if (isNarrow && isHighVol) return NO_DEMAND_SUPPLY;
    if (isWide && isLowVol) return EFFORT_NO_RESULT;
    return isUp ? NORMAL_UP : NORMAL_DOWN;
  });
}
