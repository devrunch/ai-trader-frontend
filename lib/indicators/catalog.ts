import type { AttachedIndicator } from "@/lib/api/charts";
import type { ApiIndicator } from "@/lib/api/indicators";
import type { VolumeProfileMode } from "@/lib/chart-adapter/volume-profile-primitive";

export type IndicatorCategory = "Moving Averages" | "Trend" | "Momentum" | "Volatility" | "Volume";

export const INDICATOR_CATEGORIES: IndicatorCategory[] = ["Moving Averages", "Trend", "Volatility", "Momentum", "Volume"];

/**
 * The two kinds of indicator that aren't real Pine scripts, and so can't
 * live in the DB-backed indicator list (see lib/api/indicators.ts) the way
 * the 49 built-ins and every user's own custom indicators now do. Volume
 * Profile is a price-bucketed histogram with no time axis of its own -- not
 * expressible as a Pine plot() -- toggled through the adapter's
 * attachVolumeProfile()/removeVolumeProfile(); Volume Spread Analysis
 * recolors the existing volume histogram in place rather than adding a
 * series, toggled through setVolumeSpreadAnalysis(). Several Volume Profile
 * entries can be attached at once; VSA is a single on/off switch (there's
 * only one volume histogram to recolor).
 */
export type SpecialIndicatorEntry =
  | { kind: "volume-profile"; id: string; name: string; category: IndicatorCategory; pane: "main" | "sub"; mode: VolumeProfileMode }
  | { kind: "vsa"; id: string; name: string; category: IndicatorCategory; pane: "volume" };

export const SPECIAL_INDICATORS: SpecialIndicatorEntry[] = [
  { kind: "vsa", id: "vsa", name: "Volume Spread Analysis", category: "Volume", pane: "volume" },
  // TradingView ships a sixth variant, Fixed Range -- it needs a click-drag
  // anchor selection on the chart, which this app's pointer-driven drawing
  // interaction doesn't support yet (see startManualDraw() in
  // lightweight-charts-adapter.ts). Left out rather than faked.
  { kind: "volume-profile", id: "vp-visible", name: "Visible Range Volume Profile", category: "Volume", pane: "main", mode: "visible" },
  { kind: "volume-profile", id: "vp-session", name: "Session Volume Profile", category: "Volume", pane: "main", mode: "session" },
  { kind: "volume-profile", id: "vp-session-hd", name: "Session Volume Profile HD", category: "Volume", pane: "main", mode: "session-hd" },
  { kind: "volume-profile", id: "vp-auto-anchored", name: "Auto Anchored Volume Profile", category: "Volume", pane: "main", mode: "auto-anchored" },
  { kind: "volume-profile", id: "vp-periodic", name: "Periodic Volume Profile", category: "Volume", pane: "main", mode: "periodic" },
];

export function toAttachedIndicator(entry: ApiIndicator): AttachedIndicator {
  return { id: entry.id, source: entry.source, label: entry.name, pane: entry.pane };
}

/** id -> mode for every Volume Profile entry, so a caller holding just the
 *  id (e.g. terminal/page.tsx's attached-primitives Set) can look up which
 *  mode to pass to attachVolumeProfile() without re-scanning the list. */
export const VOLUME_PROFILE_MODE_BY_ID: Record<string, VolumeProfileMode> = Object.fromEntries(
  SPECIAL_INDICATORS.filter((e): e is Extract<SpecialIndicatorEntry, { kind: "volume-profile" }> => e.kind === "volume-profile")
    .map((e) => [e.id, e.mode]),
);

/** id -> display name for the special (non-Pine) entries only -- a DB-backed
 *  indicator's name travels with it already (AttachedIndicator.label), so
 *  this map only needs to cover VSA/Volume Profile, which carry no label of
 *  their own once toggled on. */
export const INDICATOR_NAME_BY_ID: Record<string, string> = Object.fromEntries(
  SPECIAL_INDICATORS.map((e) => [e.id, e.name]),
);
