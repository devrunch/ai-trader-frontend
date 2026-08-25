import type { ReactNode } from "react";
import type { ChartTypeId } from "@/lib/chart-adapter/types";

/** One glyph per registered chart type -- same 16px/24-viewBox/currentColor
 *  convention as DrawingToolbar's own DRAW_TOOLS icons, so the type picker's
 *  trigger and rows read as the same family of controls as the rest of the
 *  toolbar rather than a one-off. Only types with a real CHART_TYPES entry
 *  need one; an id with no icon here just isn't reachable from the picker
 *  yet (see registry.ts). */
export const CHART_TYPE_ICONS: Partial<Record<ChartTypeId, ReactNode>> = {
  candles: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <line x1="6" y1="3" x2="6" y2="21" /><rect x="4" y="8" width="4" height="7" fill="currentColor" stroke="none" />
      <line x1="14" y1="2" x2="14" y2="10" /><rect x="12" y="10" width="4" height="6" fill="currentColor" stroke="none" />
      <line x1="20" y1="6" x2="20" y2="20" /><rect x="18" y="12" width="4" height="5" fill="currentColor" stroke="none" />
    </svg>
  ),
  bars: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <line x1="6" y1="4" x2="6" y2="20" /><line x1="4" y1="9" x2="6" y2="9" /><line x1="6" y1="14" x2="8" y2="14" />
      <line x1="14" y1="2" x2="14" y2="18" /><line x1="12" y1="6" x2="14" y2="6" /><line x1="14" y1="12" x2="16" y2="12" />
      <line x1="20" y1="7" x2="20" y2="22" /><line x1="18" y1="10" x2="20" y2="10" /><line x1="20" y1="17" x2="22" y2="17" />
    </svg>
  ),
  "hollow-candles": (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <line x1="6" y1="3" x2="6" y2="21" /><rect x="4" y="8" width="4" height="7" />
      <line x1="14" y1="2" x2="14" y2="10" /><rect x="12" y="10" width="4" height="6" fill="currentColor" stroke="none" />
      <line x1="20" y1="6" x2="20" y2="20" /><rect x="18" y="12" width="4" height="5" />
    </svg>
  ),
  "volume-candles": (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <line x1="6" y1="5" x2="6" y2="19" /><rect x="4.5" y="9" width="3" height="6" fill="currentColor" stroke="none" opacity="0.35" />
      <line x1="14" y1="2" x2="14" y2="10" /><rect x="12" y="10" width="4" height="6" fill="currentColor" stroke="none" opacity="0.7" />
      <line x1="20" y1="6" x2="20" y2="20" /><rect x="17.5" y="11" width="5" height="7" fill="currentColor" stroke="none" />
    </svg>
  ),
  "heikin-ashi": (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <line x1="6" y1="6" x2="6" y2="18" /><rect x="4" y="9" width="4" height="6" fill="currentColor" stroke="none" />
      <line x1="14" y1="4" x2="14" y2="16" /><rect x="12" y="8" width="4" height="6" fill="currentColor" stroke="none" />
      <line x1="20" y1="7" x2="20" y2="19" /><rect x="18" y="10" width="4" height="6" fill="currentColor" stroke="none" />
    </svg>
  ),
  line: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
      <polyline points="3 17 9 10 13 14 21 5" />
    </svg>
  ),
  "line-markers": (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
      <polyline points="3 17 9 10 13 14 21 5" />
      <circle cx="3" cy="17" r="1.6" fill="currentColor" stroke="none" /><circle cx="9" cy="10" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="13" cy="14" r="1.6" fill="currentColor" stroke="none" /><circle cx="21" cy="5" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  ),
  "step-line": (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
      <polyline points="3 17 3 13 9 13 9 9 15 9 15 5 21 5" />
    </svg>
  ),
  area: (
    <svg width="16" height="16" viewBox="0 0 24 24">
      <path d="M3 17 9 10 13 14 21 5 21 21 3 21Z" fill="currentColor" opacity="0.3" />
      <polyline points="3 17 9 10 13 14 21 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  ),
  baseline: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
      <line x1="2" y1="12" x2="22" y2="12" strokeDasharray="2 2" strokeWidth="1.2" />
      <polyline points="3 16 8 9 13 15 21 6" />
    </svg>
  ),
  columns: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <rect x="3" y="14" width="3" height="7" /><rect x="9" y="7" width="3" height="14" />
      <rect x="15" y="11" width="3" height="10" /><rect x="21" y="4" width="3" height="17" />
    </svg>
  ),
};
