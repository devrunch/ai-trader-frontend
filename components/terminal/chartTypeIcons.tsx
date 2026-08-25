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
  "high-low": (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="6" y1="5" x2="6" y2="19" /><line x1="12" y1="2" x2="12" y2="14" /><line x1="18" y1="8" x2="18" y2="21" />
    </svg>
  ),
  "hlc-area": (
    <svg width="16" height="16" viewBox="0 0 24 24">
      <path d="M3 8 9 5 13 9 21 3 21 19 13 15 9 18 3 14Z" fill="currentColor" opacity="0.28" />
      <polyline points="3 11 9 9 13 12 21 7" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  ),
  "volume-footprint": (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <rect x="10" y="3" width="3" height="4" opacity="0.9" /><rect x="13" y="3" width="5" height="4" opacity="0.45" />
      <rect x="8" y="8" width="5" height="4" opacity="0.9" /><rect x="13" y="8" width="3" height="4" opacity="0.45" />
      <rect x="9" y="13" width="4" height="4" opacity="0.9" /><rect x="13" y="13" width="6" height="4" opacity="0.45" />
      <rect x="7" y="18" width="6" height="3" opacity="0.9" /><rect x="13" y="18" width="3" height="3" opacity="0.45" />
    </svg>
  ),
  tpo: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <rect x="14" y="3" width="8" height="2.5" /><rect x="10" y="7" width="12" height="2.5" />
      <rect x="6" y="11" width="16" height="2.5" /><rect x="12" y="15" width="10" height="2.5" />
      <rect x="16" y="19" width="6" height="2.5" />
    </svg>
  ),
  "session-volume-profile": (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <line x1="6" y1="4" x2="6" y2="18" /><rect x="4" y="8" width="4" height="6" fill="currentColor" stroke="none" />
      <line x1="12" y1="2" x2="12" y2="16" /><rect x="10" y="6" width="4" height="6" fill="currentColor" stroke="none" />
      <g fill="currentColor" stroke="none">
        <rect x="17" y="5" width="6" height="2" /><rect x="17" y="9" width="3" height="2" /><rect x="17" y="13" width="4.5" height="2" />
      </g>
    </svg>
  ),
  renko: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <rect x="3" y="16" width="5" height="5" /><rect x="9" y="10" width="5" height="6" opacity="0.5" />
      <rect x="15" y="4" width="5" height="6" />
    </svg>
  ),
  "line-break": (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <rect x="3" y="14" width="4" height="6" /><rect x="9" y="6" width="4" height="8" />
      <rect x="15" y="10" width="4" height="4" opacity="0.5" />
    </svg>
  ),
  kagi: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
      <polyline points="3 18 8 6 13 15 21 4" />
    </svg>
  ),
  "point-figure": (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <line x1="4" y1="14" x2="8" y2="18" /><line x1="8" y1="14" x2="4" y2="18" />
      <line x1="4" y1="8" x2="8" y2="12" /><line x1="8" y1="8" x2="4" y2="12" />
      <circle cx="16" cy="16" r="3" /><circle cx="16" cy="9" r="3" />
    </svg>
  ),
  range: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="3.5" y="6" width="4" height="14" fill="currentColor" stroke="none" /><line x1="5.5" y1="6" x2="5.5" y2="20" />
      <rect x="10.5" y="3" width="4" height="17" fill="currentColor" stroke="none" /><line x1="12.5" y1="3" x2="12.5" y2="20" />
      <rect x="17.5" y="9" width="4" height="11" fill="currentColor" stroke="none" /><line x1="19.5" y1="9" x2="19.5" y2="20" />
    </svg>
  ),
};
