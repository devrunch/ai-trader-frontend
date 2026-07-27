"use client";

import type { StrategyTrade } from "@/lib/api";

/**
 * Every trade a backtest took, with when it opened, when it closed and why.
 *
 * The exit reason is the column that matters. "signal" means the rules said to
 * leave; "stop" means the loss cap fired, which is a different outcome the win
 * rate alone hides — a strategy whose losses are all stops behaves nothing like
 * one whose losses drift out on their own.
 */

const REASONS: Record<string, string> = {
  signal: "Exit rule",
  stop: "Stop hit",
  end: "Still open at the end",
};

function when(ms: number | null | undefined): string {
  if (!ms) return "—";
  return new Date(ms).toLocaleString("en-IN", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false,
  });
}

const rupees = (n: number) => `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function TradeTable({ trades }: { trades: StrategyTrade[] }) {
  if (trades.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-3">
        These rules never triggered on this data — no trades to show.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs font-mono tabular-nums">
        <caption className="sr-only">
          Every trade this strategy took, with entry, exit and the reason it closed
        </caption>
        <thead>
          <tr className="text-muted-foreground text-left">
            <th scope="col" className="font-normal font-sans py-1.5 pr-3">Entered</th>
            <th scope="col" className="font-normal font-sans py-1.5 pr-3 text-right">Entry</th>
            <th scope="col" className="font-normal font-sans py-1.5 pr-3">Exited</th>
            <th scope="col" className="font-normal font-sans py-1.5 pr-3 text-right">Exit</th>
            <th scope="col" className="font-normal font-sans py-1.5 pr-3">Why it closed</th>
            <th scope="col" className="font-normal font-sans py-1.5 text-right">P&amp;L</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((t, i) => {
            const won = t.pnl_pct >= 0;
            return (
              <tr key={`${t.entry_ts}-${i}`} className="border-t border-border">
                <td className="py-1.5 pr-3 whitespace-nowrap">{when(t.entry_ts)}</td>
                <td className="py-1.5 pr-3 text-right">{rupees(t.entry_price)}</td>
                <td className="py-1.5 pr-3 whitespace-nowrap">{when(t.exit_ts)}</td>
                <td className="py-1.5 pr-3 text-right">
                  {t.exit_price != null ? rupees(t.exit_price) : "—"}
                </td>
                <td className="py-1.5 pr-3 font-sans whitespace-nowrap">
                  {REASONS[t.exit_reason ?? ""] ?? t.exit_reason ?? "—"}
                </td>
                <td
                  className="py-1.5 text-right font-semibold"
                  style={{ color: won ? "var(--buy)" : "var(--sell)" }}
                >
                  {/* Explicit sign: colour must reinforce direction, never carry it. */}
                  {won ? "+" : "−"}{Math.abs(t.pnl_pct).toFixed(2)}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed font-sans">
        P&amp;L is net of round-trip costs, and entries fill at the next bar&apos;s open
        rather than the price that triggered the signal.
      </p>
    </div>
  );
}
