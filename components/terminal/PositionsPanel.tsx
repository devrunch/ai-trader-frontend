"use client";

import { ErrorState } from "@/components/ErrorState";
import type { ApiPosition } from "@/lib/api";

export interface PositionsPanelProps {
  positions: ApiPosition[];
  /** Only true on the first visit — a refetch keeps the previous list on screen. */
  loading: boolean;
  /**
   * The fetch failed. Kept separate from an empty list: an outage rendered as
   * "No open positions" tells the user they hold nothing when we simply could
   * not find out.
   */
  error?: string;
  onRetry?: () => void;
  onSelect: (symbol: string, exchange: string) => void;
}

/** Open positions, each a shortcut to that symbol's chart. */
export function PositionsPanel({
  positions, loading, error, onRetry, onSelect,
}: PositionsPanelProps) {
  if (loading) {
    return (
      <div className="text-center py-8 text-xs text-muted-foreground" aria-busy="true">
        Loading positions…
      </div>
    );
  }

  if (error) return <ErrorState message={error} onRetry={onRetry} compact />;

  if (positions.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-muted-foreground">No open positions</p>
        <p className="text-xs text-muted-foreground mt-1">Place a trade to see it here.</p>
      </div>
    );
  }

  return (
    <div className="border border-border">
      {positions.map((p, i) => {
        const up = p.unrealisedPnl >= 0;
        const pct = p.averageCost > 0 ? (p.unrealisedPnl / (p.averageCost * p.quantity)) * 100 : 0;
        const colour = up ? "var(--buy)" : "var(--sell)";
        return (
          <button
            key={p._id}
            onClick={() => onSelect(p.symbol, p.exchange)}
            className={`w-full flex items-center justify-between px-3 py-3 text-left hover:bg-secondary/40 transition-colors ${
              i < positions.length - 1 ? "border-b border-border" : ""
            }`}
          >
            <div>
              <div className="text-sm font-semibold">{p.symbol}</div>
              <div className="text-[10px] text-muted-foreground font-mono">
                {p.quantity} @ ₹{p.averageCost.toLocaleString("en-IN")}
              </div>
            </div>
            <div className="text-right font-mono">
              {/* Explicit sign: colour reinforces direction, it never carries it. */}
              <div className="text-sm font-semibold" style={{ color: colour }}>
                {up ? "+" : "−"}₹{Math.abs(p.unrealisedPnl).toLocaleString("en-IN")}
              </div>
              <div className="text-[10px]" style={{ color: colour }}>
                {up ? "+" : "−"}{Math.abs(pct).toFixed(2)}%
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
