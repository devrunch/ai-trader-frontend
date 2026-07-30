"use client";

import { useEffect, useState } from "react";

/**
 * The drawing rail down the left of the chart.
 *
 * The tool list lives here rather than in the page because it is a description
 * of what KLineChart can draw, not of what the terminal does with it — the page
 * only needs to know which tool was picked.
 */

export interface DrawTool {
  key: string;
  title: string;
  /** KLineChart overlay name, or null for the cursor (which draws nothing). */
  overlay: string | null;
  icon: React.ReactNode;
}

export const DRAW_TOOLS: DrawTool[] = [
  { key: "cursor", title: "Cursor", overlay: null,
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M4 2l16 8-7 2-2 7z"/></svg> },
  { key: "trendline", title: "Trend line", overlay: "segment",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><line x1="4" y1="20" x2="20" y2="4"/></svg> },
  { key: "ray", title: "Ray", overlay: "rayLine",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="5" cy="19" r="1.6" fill="currentColor"/><line x1="6" y1="18" x2="20" y2="4"/></svg> },
  { key: "hline", title: "Horizontal line", overlay: "horizontalStraightLine",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><line x1="3" y1="12" x2="21" y2="12"/></svg> },
  { key: "fib", title: "Fibonacci retracement", overlay: "fibonacciLine",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><line x1="3" y1="5" x2="21" y2="5"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="3" y1="20" x2="21" y2="20"/></svg> },
  { key: "rect", title: "Rectangle", overlay: "rect",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="4" y="6" width="16" height="12" rx="1"/></svg> },
];

export interface DrawingToolbarProps {
  activeTool: string;
  onPick: (tool: DrawTool) => void;
  /** Remove the user's own drawings. The agent's marks are left alone. */
  onClear: () => void;
  /**
   * Back to a plain chart: no drawings from anyone, default indicators.
   *
   * Needed because chart state became durable. Before it was saved, a reload
   * was the reset; now nothing short of this gets an untouched chart back.
   */
  onReset: () => void;
  /** Another tab has saved over this chart, so drawings here are no longer kept. */
  saveConflict?: boolean;
}

const CONFLICT_NOTE =
  "This chart was changed in another tab. Reload to see that version — changes here are no longer being saved.";

export function DrawingToolbar({
  activeTool, onPick, onClear, onReset, saveConflict = false,
}: DrawingToolbarProps) {
  const [confirming, setConfirming] = useState(false);

  /* An armed reset that stays armed is a trap: the next click on that spot,
     minutes later and meaning something else, wipes the chart. */
  useEffect(() => {
    if (!confirming) return;
    const timer = setTimeout(() => setConfirming(false), 4000);
    return () => clearTimeout(timer);
  }, [confirming]);

  return (
    <div className="w-11 border-r border-border flex flex-col items-center py-2 gap-0.5 shrink-0">
      {DRAW_TOOLS.map((t) => (
        <button
          key={t.key}
          title={t.title}
          aria-pressed={activeTool === t.key}
          onClick={() => onPick(t)}
          className={`w-8 h-8 flex items-center justify-center transition-colors ${
            activeTool === t.key
              ? "bg-primary/15 text-link"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary"
          }`}
        >
          {t.icon}
        </button>
      ))}

      <div className="w-5 h-px bg-border my-1" />

      {/* Silent data loss is the worst outcome here, so say it plainly: this
          tab has stopped saving rather than overwrite the other one. */}
      {saveConflict && (
        <div title={CONFLICT_NOTE} role="status"
             className="w-8 h-8 flex items-center justify-center" style={{ color: "#e0ab4a" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <span className="sr-only">{CONFLICT_NOTE}</span>
        </div>
      )}

      <button title="Clear my drawings" aria-label="Clear my drawings" onClick={onClear}
        className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-[var(--sell)] hover:bg-secondary transition-colors">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        </svg>
      </button>

      {/* Distinct from Clear: that removes what the user drew, this removes
          everything including the agent's marks and the indicators it switched
          on. Two buttons because "undo my last line" and "start again" are
          different intentions, and collapsing them loses work either way.

          Confirmed, unlike the others: an answer's marks can be put back from
          the chat, but a trend line the user drew by hand cannot. This is the
          one control here that destroys something unrecoverable. */}
      <button
        title={confirming
          ? "Click again to reset — your own drawings cannot be recovered"
          : "Reset chart — remove all drawings and restore the default indicators"}
        aria-label="Reset chart"
        onClick={() => {
          if (confirming) { onReset(); setConfirming(false); return; }
          setConfirming(true);
        }}
        className={`w-8 h-8 flex items-center justify-center transition-colors ${
          confirming
            ? "text-[var(--sell)] bg-secondary"
            : "text-muted-foreground hover:text-foreground hover:bg-secondary"
        }`}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>
        </svg>
      </button>
      {confirming && (
        <span className="text-[9px] text-center leading-tight" style={{ color: "var(--sell)" }}>
          again
        </span>
      )}
    </div>
  );
}
