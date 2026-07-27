"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ApiError, errorMessage, getMorningBrief, type MorningBrief, type GlobalCue, type BriefCandidate } from "@/lib/api";
import { ErrorState } from "@/components/ErrorState";

const GROUP_ORDER = ["us", "asia", "commodity", "currency", "volatility", "india"] as const;
const GROUP_LABEL: Record<string, string> = {
  us: "US markets", asia: "Asia", commodity: "Commodities",
  currency: "Currency", volatility: "Volatility", india: "India",
};

function pct(n: number) {
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}
function moveColor(n: number) {
  return n >= 0 ? "var(--buy)" : "var(--sell)";
}

/* ── While you slept ── */
function CueGrid({ cues }: { cues: GlobalCue[] }) {
  const grouped = GROUP_ORDER
    .map(g => ({ group: g, items: cues.filter(c => c.group === g) }))
    .filter(g => g.items.length > 0);

  return (
    <div className="grid gap-px bg-border border border-border sm:grid-cols-2 lg:grid-cols-3">
      {grouped.map(({ group, items }) => (
        <div key={group} className="bg-card p-4">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono mb-2">
            {GROUP_LABEL[group] ?? group}
          </div>
          <div className="space-y-1.5">
            {items.map(c => (
              <div key={c.symbol} className="flex items-baseline justify-between gap-3" title={c.why}>
                <span className="text-sm">{c.name}</span>
                <span className="font-mono text-sm tabular-nums">
                  <span className="text-muted-foreground mr-2">{c.value.toLocaleString("en-IN")}</span>
                  <span style={{ color: moveColor(c.change_pct) }}>{pct(c.change_pct)}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── One trade candidate ── */
function CandidateCard({ c, rank, onOpen }: { c: BriefCandidate; rank: number; onOpen: (s: string) => void }) {
  const [open, setOpen] = useState(false);
  const isBuy = c.direction === "BUY";
  const dirColor = isBuy ? "var(--buy)" : "var(--sell)";
  const conflict = c.global_context.agrees_with_direction === false;

  return (
    <div className="border border-border bg-card">
      <div className="flex items-start gap-3 p-4">
        <span className="font-mono text-xs text-muted-foreground mt-1 w-4">{rank}</span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold">{c.symbol}</span>
            <span className="px-2 py-0.5 text-[10px] font-extrabold" style={{ background: dirColor, color: "#0b0e14" }}>
              {c.direction}
            </span>
            {c.reward_risk && (
              <span className="text-[11px] text-muted-foreground font-mono">R:R {c.reward_risk}</span>
            )}
            <span className="text-[11px] text-muted-foreground font-mono">
              {Math.round(c.confidence * 100)}% conf
            </span>
            {conflict && (
              <span className="px-1.5 py-0.5 text-[9px] font-bold border" style={{ borderColor: "var(--sell)", color: "var(--sell)" }}>
                CONFLICTING SIGNAL
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
            {[
              { l: "Entry", v: c.entry, c: "var(--foreground)" },
              { l: "Target", v: c.target, c: "var(--buy)" },
              { l: "Stop", v: c.stop, c: "var(--sell)" },
            ].map(x => (
              <div key={x.l} className="bg-secondary border border-border p-2 text-center">
                <div className="text-muted-foreground text-[9.5px] uppercase tracking-wide mb-0.5">{x.l}</div>
                <div className="font-mono font-bold" style={{ color: x.c }}>₹{x.v}</div>
              </div>
            ))}
          </div>

          {c.global_context.reasons.length > 0 && (
            <div className="mt-3 space-y-1">
              {c.global_context.reasons.map((r, i) => (
                <p key={i} className="text-xs leading-relaxed"
                   style={{ color: r.startsWith("CONFLICT") ? "var(--sell)" : "var(--muted-foreground)" }}>
                  {r}
                </p>
              ))}
            </div>
          )}

          {open && (
            <p className="text-xs text-muted-foreground leading-relaxed mt-3 pt-3 border-t border-border">
              {c.reasoning}
            </p>
          )}

          <div className="flex items-center gap-2 mt-3">
            <button onClick={() => setOpen(v => !v)}
              className="text-[11px] font-semibold text-link hover:underline">
              {open ? "▾ Hide" : "▸ Why this?"}
            </button>
            <button onClick={() => onOpen(c.symbol)}
              className="ml-auto px-3 py-1.5 text-[11px] font-semibold border border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors">
              Open in Terminal →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BriefPage() {
  const router = useRouter();
  const [brief, setBrief] = useState<MorningBrief | null>(null);
  const [loading, setLoading] = useState(true);

  /* A 404 means the brief genuinely has not been generated today. Anything else
     is a failure, and the two must not render as the same screen — "No brief
     yet" told the user nothing was produced when in fact nothing was asked. */
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let alive = true;
    getMorningBrief()
      .then(b => { if (alive) { setBrief(b); setError(""); } })
      .catch(e => {
        if (!alive) return;
        setBrief(null);
        if (!(e instanceof ApiError && e.status === 404)) setError(errorMessage(e));
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [retry]);

  function openInTerminal(symbol: string) {
    router.push(`/dashboard/terminal?symbol=${encodeURIComponent(symbol)}`);
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-7 h-7 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <ErrorState
            message={error}
            onRetry={() => { setLoading(true); setRetry(n => n + 1); }}
          />
        </div>
      </div>
    );
  }

  if (!brief) {
    return (
      <div className="h-full overflow-y-auto no-scrollbar py-5">
        <div className="max-w-2xl border border-border bg-card p-10 text-center">
          <h1 className="font-heading text-xl font-semibold mb-2">No brief yet</h1>
          <p className="text-sm text-muted-foreground">
            The morning brief is generated automatically at 06:30 IST on trading days,
            after the US close and before the Indian market opens.
          </p>
        </div>
      </div>
    );
  }

  const mr = brief.marketRead;
  const biasColor =
    mr.bias === "positive" ? "var(--buy)" : mr.bias === "negative" ? "var(--sell)" : "var(--muted-foreground)";

  return (
    <div className="h-full overflow-y-auto no-scrollbar py-5">
      <div className="max-w-[1100px] space-y-5">

        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-heading text-2xl font-semibold tracking-tight">Morning Brief</h1>
            <p className="text-muted-foreground text-sm mt-0.5 font-mono">
              {brief.date} · generated {new Date(brief.generatedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} IST
            </p>
          </div>
        </div>

        {/* While you slept */}
        <section className="space-y-2">
          <h2 className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">While you slept</h2>
          <CueGrid cues={brief.globalCues} />
        </section>

        {/* Today's read */}
        <section className="border border-border bg-card p-5">
          <div className="flex items-center gap-3 flex-wrap mb-3">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">Today&apos;s bias</span>
            <span className="px-2.5 py-1 text-xs font-extrabold" style={{ background: biasColor, color: "#0b0e14" }}>
              {mr.label}
            </span>
            <span className="text-xs text-muted-foreground font-mono">confidence: {mr.confidence}</span>
          </div>
          <p className="text-sm leading-relaxed">{brief.narrative}</p>
          {mr.notes?.length > 0 && (
            <ul className="mt-3 space-y-1">
              {mr.notes.map((n, i) => (
                <li key={i} className="text-xs text-muted-foreground">• {n}</li>
              ))}
            </ul>
          )}
        </section>

        {/* Candidates */}
        <section className="space-y-2">
          <h2 className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
            Candidates ({brief.candidates.length})
          </h2>
          {brief.candidates.length === 0 ? (
            <div className="border border-border bg-card p-8 text-center">
              <p className="text-sm font-medium mb-1">No candidates cleared the filters today</p>
              <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                Every setup was rejected on trend strength, reward-to-risk, stop sizing or
                indicator agreement. Sitting out is a position — no trade is better than a forced one.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {brief.candidates.map((c, i) => (
                <CandidateCard key={c.symbol} c={c} rank={i + 1} onOpen={openInTerminal} />
              ))}
            </div>
          )}
        </section>

        <div className="border-t border-border pt-4 flex items-start justify-between gap-4 flex-wrap">
          <p className="text-[11px] text-muted-foreground leading-relaxed max-w-xl">
            {brief.disclaimer}
          </p>
          {/* Our own hit rate, one click away — the user should never have to
              discover the real number elsewhere. */}
          <button onClick={() => router.push("/dashboard/signals")}
            className="shrink-0 text-[11px] font-semibold text-link hover:underline">
            See our track record →
          </button>
        </div>
      </div>
    </div>
  );
}
