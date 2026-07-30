"use client";

import { useState } from "react";
import type { ChatDrawing } from "@/lib/api";

/**
 * What the agent put on the chart, listed next to the answer that put it there.
 *
 * The chart gains lines and markers mid-conversation with nothing saying which
 * message added them or what they mean. Scroll up, come back tomorrow, open a
 * second symbol and return — the marks are still there and their explanation is
 * somewhere in the transcript, if it was ever given at all.
 *
 * So each answer carries a key to its own marks: the colour as drawn, the
 * label, and the price. Not decoration — on a chart with support, resistance,
 * a trend line and sixty trade markers, this is the difference between a
 * picture and a claim you can check.
 */

const KIND_LABEL: Record<string, string> = {
  priceline: "Level",
  segment: "Trend line",
  fibonacci: "Fibonacci",
  trade_marker: "Trade",
  series: "Indicator line",
};

const money = (n: number) =>
  `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface Row {
  colour: string;
  text: string;
  detail: string;
}

/**
 * Trade markers are summarised, never listed.
 *
 * A backtest can draw sixty of them; sixty rows would bury the answer they
 * belong to, and no one reads the forty-first.
 */
function toRows(drawings: ChatDrawing[]): Row[] {
  const rows: Row[] = [];
  const trades = drawings.filter((d) => d.kind === "trade_marker");
  const rest = drawings.filter((d) => d.kind !== "trade_marker");

  for (const d of rest) {
    rows.push({
      colour: d.color || "var(--muted-foreground)",
      text: d.label || KIND_LABEL[d.kind] || d.kind,
      detail: d.value != null ? money(d.value) : "",
    });
  }

  if (trades.length) {
    const entries = trades.filter((t) => t.side === "BUY").length;
    rows.push({
      colour: "var(--muted-foreground)",
      text: `${entries} backtested ${entries === 1 ? "trade" : "trades"}`,
      detail: "entries and exits",
    });
  }
  return rows;
}

export function DrawingLegend({
  drawings,
  onRemove,
  onRestore,
}: {
  drawings: ChatDrawing[];
  /** Take these marks off the chart, leaving every other answer's alone. */
  onRemove?: () => void;
  /** Put them back. The drawings live on the message, so nothing was lost. */
  onRestore?: () => void;
}) {
  const [removed, setRemoved] = useState(false);
  const rows = toRows(drawings);
  if (rows.length === 0) return null;

  // A toggle, not a one-way delete. The marks are data on this message, so
  // taking them off the chart costs nothing to reverse — and a Remove that
  // cannot be undone makes the user weigh a decision that has no stakes.
  const canToggle = Boolean(onRemove && onRestore);

  return (
    <div className="mt-2 pt-2 border-t border-border/60">
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {removed ? "Hidden from the chart" : "Added to the chart"}
        </span>
        {canToggle && (
          <button
            onClick={() => {
              if (removed) onRestore!();
              else onRemove!();
              setRemoved((v) => !v);
            }}
            aria-pressed={removed}
            className={`ml-auto text-[10px] transition-colors ${
              removed
                ? "text-link hover:underline"
                : "text-muted-foreground hover:text-[var(--sell)]"
            }`}
          >
            {removed ? "Put back" : "Remove"}
          </button>
        )}
      </div>
      {/* Kept visible while hidden, greyed but NOT struck through: the answer
          still refers to these levels, and strike-through would read as
          "deleted" when the marks are one click from coming back. */}
      <ul className={`space-y-0.5 ${removed ? "opacity-45" : ""}`}>
        {rows.map((row, i) => (
          <li key={i} className="flex items-center gap-2 text-[11px]">
            {/* The same colour it was drawn in — the only thing that connects a
                row here to a line over there. */}
            <span
              className="w-2.5 h-0.5 shrink-0"
              style={{ background: row.colour }}
              aria-hidden="true"
            />
            <span className="text-foreground min-w-0 truncate">{row.text}</span>
            {row.detail && (
              <span className="ml-auto font-mono text-muted-foreground shrink-0 tabular-nums">
                {row.detail}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
