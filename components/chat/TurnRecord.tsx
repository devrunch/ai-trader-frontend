"use client";

import type { ChatTurnRecord } from "@/lib/api";
import { Markdown } from "./Markdown";

/**
 * What the agent did, after the fact.
 *
 * The answer to "why did I take this trade". Rendered from the events recorded
 * while the turn ran — not from a re-run, which would produce a different
 * answer on different prices and quietly rewrite history.
 *
 * Shared by the strategy detail page and the trade detail panel, because both
 * are asking the same question of the same record.
 */

/** Steps that are internal bookkeeping rather than something the agent did. */
const HIDDEN = new Set(["thinking", "message", "turn_finished", "turn_started"]);

const STOP_REASONS: Record<string, string> = {
  rounds: "The agent reached its research limit and answered with what it had.",
  time: "The agent ran out of time and answered with what it had.",
  tokens: "The agent reached its cost limit and answered with what it had.",
  error: "The analysis did not complete.",
  no_data: "There was not enough chart data to analyse.",
};

function stamp(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
}

export function TurnRecord({ turn }: { turn: ChatTurnRecord }) {
  const steps = turn.events.filter((e) => !HIDDEN.has(e.kind));
  const caveat = turn.stopReason ? STOP_REASONS[turn.stopReason] : null;

  return (
    <div className="space-y-5">
      <section>
        <h2 className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">
          What you asked
        </h2>
        <p className="text-sm">{turn.message}</p>
        <p className="text-[11px] text-muted-foreground mt-1 font-mono">
          {turn.symbol} · {stamp(turn.createdAt)}
        </p>
      </section>

      <section>
        <h2 className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">
          What it answered
        </h2>
        <div className="text-sm"><Markdown text={turn.answer} /></div>
        {caveat && (
          <p className="text-xs text-muted-foreground mt-2 border-l-2 border-border pl-2.5">
            {caveat}
          </p>
        )}
      </section>

      <section>
        <h2 className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">
          What it looked at
        </h2>
        {steps.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            It answered from the chart in front of it, without looking anything up.
          </p>
        ) : (
          <ol className="space-y-1">
            {steps.map((step, i) => (
              <li key={i} className="flex items-baseline gap-2 text-xs">
                <span className="font-mono text-[10px] text-muted-foreground tabular-nums shrink-0 w-10 text-right">
                  {step.at_ms != null ? `${(step.at_ms / 1000).toFixed(1)}s` : ""}
                </span>
                <span className={step.kind === "tool_failed" ? "text-[var(--sell)]" : ""}>
                  {step.label}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      {turn.usage?.total_tokens ? (
        <p className="text-[11px] text-muted-foreground font-mono border-t border-border pt-3">
          {turn.usage.llm_calls ?? 0} model {turn.usage.llm_calls === 1 ? "call" : "calls"} ·{" "}
          {turn.usage.total_tokens.toLocaleString("en-IN")} tokens
        </p>
      ) : null}
    </div>
  );
}
