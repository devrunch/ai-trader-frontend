"use client";

import { useState } from "react";
import Link from "next/link";
import type { StrategyRunRecord } from "@/lib/api";
import { TradeTable } from "./TradeTable";

/**
 * One backtest the agent ran.
 *
 * Collapsed it answers "what was run and how did it do"; expanded it answers
 * "on what rules, and which trades". The question that caused the run is shown
 * either way — a row that only says "8 trades, 50%" cannot tell you why it
 * exists a week later.
 */

/** Below this a win rate is noise, and reads as a result unless it is labelled. */
const RELIABLE_SAMPLE = 30;

function ago(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

export function StrategyRunCard({ run }: { run: StrategyRunRecord }) {
  const [open, setOpen] = useState(false);
  const d = run.detail;

  const name = d.name ?? d.strategy ?? "Strategy";
  const trades = d.trades ?? [];
  const numTrades = d.num_trades ?? trades.length;
  const totalReturn = d.total_return_pct;
  const positive = (totalReturn ?? 0) >= 0;
  const thin = numTrades < RELIABLE_SAMPLE;

  return (
    <article className="border border-border bg-card">
      <div className="px-4 py-3 flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold">{name}</h3>
            <span className="text-[11px] font-mono px-1.5 py-0.5 border border-border text-muted-foreground">
              {run.symbol}
            </span>
            {d.interval && (
              <span className="text-[11px] font-mono text-muted-foreground">{d.interval}</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Asked: &ldquo;{run.askedFor}&rdquo; · {ago(run.ranAt)}
          </p>
        </div>

        <dl className="flex items-center gap-5 font-mono text-xs tabular-nums shrink-0">
          <Stat label="Trades" value={String(numTrades)} />
          <Stat label="Win rate" value={d.win_rate != null ? `${d.win_rate}%` : "—"} />
          <Stat
            label="Return"
            value={totalReturn != null ? `${positive ? "+" : "−"}${Math.abs(totalReturn)}%` : "—"}
            colour={totalReturn != null ? (positive ? "var(--buy)" : "var(--sell)") : undefined}
          />
        </dl>
      </div>

      {thin && (
        <p className="px-4 pb-3 -mt-1 text-[11px] text-muted-foreground leading-relaxed">
          {numTrades} trades is too few to judge. This is a sketch of how the rules
          behaved, not evidence that they work.
        </p>
      )}

      <div className="px-4 pb-3 flex items-center gap-4">
        <button
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="text-xs text-link hover:underline"
        >
          {open ? "Hide trades" : `Show ${trades.length || "the"} trades`}
        </button>
        <Link
          href={`/dashboard/strategies/${encodeURIComponent(run.turnId)}`}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          The full analysis →
        </Link>
      </div>

      {open && (
        <div className="border-t border-border px-4 py-3 space-y-4">
          {d.spec && (
            <div>
              <h4 className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">
                Rules
              </h4>
              {/* The spec is a validated JSON object, never code — see
                  app/signals/conditions.py for why that distinction matters. */}
              <pre className="text-[11px] font-mono bg-secondary border border-border p-2.5 overflow-x-auto">
                {JSON.stringify(d.spec, null, 2)}
              </pre>
            </div>
          )}
          <div>
            <h4 className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">
              Trades
            </h4>
            <TradeTable trades={trades} />
          </div>
        </div>
      )}
    </article>
  );
}

function Stat({ label, value, colour }: { label: string; value: string; colour?: string }) {
  return (
    <div className="text-right">
      <dt className="text-[10px] uppercase tracking-wider text-muted-foreground font-sans">
        {label}
      </dt>
      <dd className="font-semibold" style={colour ? { color: colour } : undefined}>
        {value}
      </dd>
    </div>
  );
}
