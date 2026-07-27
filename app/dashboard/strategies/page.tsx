"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { errorMessage, getStrategyRuns, type StrategyRunRecord } from "@/lib/api";
import { ErrorState } from "@/components/ErrorState";
import { StrategyRunCard } from "@/components/strategies/StrategyRunCard";

/**
 * Every backtest the agent has run for this user.
 *
 * Read out of the stored turns rather than a strategies table: the run, its
 * rules and its trades were recorded in the turn's event stream as they
 * happened, and a second copy would be a second thing to keep in sync.
 */
export default function StrategiesPage() {
  const [runs, setRuns] = useState<StrategyRunRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  /* Bumped by the retry button. The fetch lives entirely inside the effect —
     setting state synchronously in an effect body cascades a render. */
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    getStrategyRuns()
      .then((r) => { if (alive) { setRuns(r); setError(""); } })
      .catch((err) => { if (alive) setError(errorMessage(err, "Couldn't load your strategy runs.")); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [attempt]);

  function retry() {
    setLoading(true);
    setError("");
    setAttempt((a) => a + 1);
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
      <header>
        <h1 className="text-lg font-bold">Strategies</h1>
        <p className="text-xs text-muted-foreground mt-1 max-w-2xl leading-relaxed">
          Every set of rules the AI has backtested for you, newest first — what was
          asked, what the rules were, and every trade they took.
        </p>
      </header>

      {/* Loading, empty and broken have to stay distinguishable: an outage that
          renders as "nothing here yet" tells the user their work is gone. */}
      {loading && <SkeletonList />}

      {!loading && error && <ErrorState message={error} onRetry={retry} />}

      {!loading && !error && runs.length === 0 && <EmptyState />}

      {!loading && !error && runs.length > 0 && (
        <div className="space-y-3">
          {runs.map((run, i) => (
            <StrategyRunCard key={`${run.turnId}-${i}`} run={run} />
          ))}
        </div>
      )}

      <p className="text-[11px] text-muted-foreground leading-relaxed border-t border-border pt-4">
        Every result here is in-sample: the rules were tested on the same history
        that suggested them, costs and a stop are applied, and nothing has been
        tested on data it has not already seen. Live performance would be worse.
      </p>
    </div>
  );
}

function SkeletonList() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading your strategy runs">
      {[0, 1, 2].map((i) => (
        <div key={i} className="border border-border bg-card px-4 py-5">
          <div className="h-3.5 w-40 bg-secondary animate-pulse motion-reduce:animate-none" />
          <div className="h-2.5 w-64 bg-secondary/70 mt-2.5 animate-pulse motion-reduce:animate-none" />
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="border border-border bg-card p-8 text-center">
      <p className="text-sm font-semibold mb-1">No strategies backtested yet</p>
      <p className="text-xs text-muted-foreground leading-relaxed max-w-md mx-auto">
        Describe a set of rules to the AI in the terminal — &ldquo;buy when RSI
        crosses above 30, sell when it passes 60&rdquo; — and it will test them on
        real bars. Every run shows up here.
      </p>
      <Link
        href="/dashboard/terminal"
        className="inline-block mt-4 px-3 py-1.5 text-xs font-semibold border border-border hover:border-foreground/40 hover:text-foreground text-muted-foreground transition-colors"
      >
        Open the terminal
      </Link>
    </div>
  );
}
