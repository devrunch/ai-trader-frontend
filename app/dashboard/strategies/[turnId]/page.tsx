"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { errorMessage, getChatTurn, type ChatTurnRecord } from "@/lib/api";
import { ErrorState } from "@/components/ErrorState";
import { TurnRecord } from "@/components/chat/TurnRecord";
import { TradeTable } from "@/components/strategies/TradeTable";
import type { StrategyRunDetail } from "@/lib/api";

/**
 * One turn in full: the question, the answer, every step, and any strategy it
 * ran.
 *
 * The same record a trade links back to. Reached from a strategy row here, and
 * later from an order's "why was this taken".
 */
export default function TurnDetailPage() {
  const params = useParams<{ turnId: string }>();
  const turnId = params?.turnId ?? "";

  const [turn, setTurn] = useState<ChatTurnRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!turnId) return;
    let alive = true;
    getChatTurn(turnId)
      .then((t) => { if (alive) { setTurn(t); setError(""); } })
      .catch((err) => { if (alive) setError(errorMessage(err, "Couldn't load this analysis.")); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [turnId, attempt]);

  function retry() {
    setLoading(true);
    setError("");
    setAttempt((a) => a + 1);
  }

  const strategies = (turn?.events ?? [])
    .filter((e) => e.kind === "strategy_run")
    .map((e) => (e.detail ?? {}) as StrategyRunDetail);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
      <Link href="/dashboard/strategies" className="text-xs text-link hover:underline">
        ← All strategies
      </Link>

      {loading && (
        <div className="border border-border bg-card p-8" aria-busy="true" aria-label="Loading the analysis">
          <div className="h-3.5 w-52 bg-secondary animate-pulse motion-reduce:animate-none" />
          <div className="h-2.5 w-full bg-secondary/70 mt-3 animate-pulse motion-reduce:animate-none" />
          <div className="h-2.5 w-4/5 bg-secondary/70 mt-2 animate-pulse motion-reduce:animate-none" />
        </div>
      )}

      {!loading && error && <ErrorState message={error} onRetry={retry} />}

      {!loading && !error && turn && (
        <>
          <div className="border border-border bg-card px-5 py-5">
            <TurnRecord turn={turn} />
          </div>

          {strategies.map((s, i) => (
            <section key={i} className="border border-border bg-card px-5 py-4 space-y-3">
              <h2 className="text-sm font-semibold">
                {s.name ?? s.strategy ?? "Strategy"}{" "}
                <span className="font-mono text-[11px] text-muted-foreground">
                  {s.symbol} {s.interval}
                </span>
              </h2>

              {s.spec && (
                <div>
                  <h3 className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">
                    Rules
                  </h3>
                  {/* A validated JSON spec, never code — the model chooses the
                      rules, it does not author anything that runs. */}
                  <pre className="text-[11px] font-mono bg-secondary border border-border p-2.5 overflow-x-auto">
                    {JSON.stringify(s.spec, null, 2)}
                  </pre>
                </div>
              )}

              <div>
                <h3 className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">
                  Trades
                </h3>
                <TradeTable trades={s.trades ?? []} />
              </div>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
