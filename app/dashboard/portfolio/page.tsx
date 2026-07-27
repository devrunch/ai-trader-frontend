"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  getPaperPortfolio, getPaperPositions, getPaperOrders, resetPaperPortfolio, errorMessage,
  type ApiPortfolioSummary, type ApiPosition, type ApiOrder,
} from "@/lib/api";

type Tab = "Positions" | "Orders";

/** Signed money, with the minus sign outside the currency symbol.
 *  A gain rendered "+₹1,234" and a loss "₹-1,234" — different glyph order for
 *  the same quantity, and the sign buried after the symbol. */
function signedMoney(n: number) {
  return `${n < 0 ? "−" : "+"}₹${Math.abs(n).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}
function signedPct(n: number) {
  return `${n < 0 ? "−" : "+"}${Math.abs(n).toFixed(2)}%`;
}

export default function PortfolioPage() {
  const [tab,       setTab]       = useState<Tab>("Positions");
  const [paper,     setPaper]     = useState<ApiPortfolioSummary | null>(null);
  const [positions, setPositions] = useState<ApiPosition[]>([]);
  const [orders,    setOrders]    = useState<ApiOrder[]>([]);
  const [loading,   setLoading]   = useState(true);
  /** Distinct from "no account": an outage must never render as "no account yet". */
  const [loadError, setLoadError] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetDone, setResetDone] = useState("");

  /* A promise chain, not async/await: this is called from an effect, and every
     setState must therefore sit in a callback rather than on the synchronous path. */
  function load() {
    return Promise.all([getPaperPortfolio(), getPaperPositions(), getPaperOrders()])
      .then(([p, pos, ords]) => {
        setPaper(p);
        setPositions(pos);
        setOrders(ords);
        setLoadError("");
      })
      .catch((e) => setLoadError(errorMessage(e, "Couldn't load your portfolio.")))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  function retry() {
    setLoading(true);
    setLoadError("");
    load();
  }

  async function handleReset() {
    setResetting(true);
    setResetError("");
    try {
      await resetPaperPortfolio("NSE");
      setConfirmReset(false);
      setResetDone("Paper account reset. Positions, orders and trade history were deleted.");
      setLoading(true);
      await load();
    } catch (e) {
      // Keep the confirmation open on failure — silently collapsing it left the
      // user unable to tell whether the reset had happened.
      setResetError(errorMessage(e, "Reset failed."));
    } finally {
      setResetting(false);
    }
  }

  const pnlUp   = (paper?.totalPnl ?? 0) >= 0;
  const retUp   = (paper?.pnlPct ?? 0) >= 0;

  const STATS = paper ? [
    { l: "Current value", v: `₹${paper.currentValue.toLocaleString("en-IN")}`, color: "var(--foreground)" },
    { l: "Total P&L", v: signedMoney(paper.totalPnl), color: pnlUp ? "var(--buy)" : "var(--sell)" },
    { l: "Return", v: signedPct(paper.pnlPct), color: retUp ? "var(--buy)" : "var(--sell)" },
    { l: "Invested", v: `₹${paper.totalInvested.toLocaleString("en-IN")}`, color: "var(--foreground)" },
  ] : [];

  return (
    <div className="h-full overflow-y-auto no-scrollbar py-5">
      <div className="max-w-[1100px] space-y-5">

        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl font-semibold tracking-tight">Portfolio</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Your paper positions, orders, and running P&amp;L.</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!confirmReset && (
              <button onClick={() => { setConfirmReset(true); setResetError(""); setResetDone(""); }}
                className="px-3 py-2 text-xs font-semibold border border-border text-muted-foreground hover:text-foreground hover:border-border transition-colors">
                Reset account
              </button>
            )}
            <Link href="/dashboard/terminal" className="px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold hover:brightness-110 transition-all">
              Trade in Terminal →
            </Link>
          </div>
        </div>

        {/* Destructive reset — the old copy said only "Reset to ₹1,00,000?", while
            the backend deleteMany's positions, orders AND trades. Name what is lost. */}
        {confirmReset && (
          <div className="border p-4" style={{ borderColor: "color-mix(in oklch, var(--sell) 45%, transparent)", background: "color-mix(in oklch, var(--sell) 7%, transparent)" }}>
            <h2 className="text-sm font-bold mb-1">Reset the paper account?</h2>
            <p className="text-xs text-muted-foreground leading-relaxed mb-3 max-w-xl">
              This permanently deletes <strong className="text-foreground">all positions, all orders and your entire
              trade history</strong>, and restores the cash balance to ₹1,00,000. Your track record is not
              recoverable afterwards. This cannot be undone.
            </p>
            {resetError && (
              <p role="alert" className="text-xs mb-3" style={{ color: "var(--sell)" }}>{resetError}</p>
            )}
            <div className="flex items-center gap-2">
              <button onClick={handleReset} disabled={resetting} aria-busy={resetting}
                className="px-3 py-2 text-xs font-semibold border border-[var(--sell)]/50 text-[var(--sell)] hover:bg-[var(--sell)]/10 transition-colors disabled:opacity-50">
                {resetting ? "Resetting…" : "Delete everything and reset"}
              </button>
              <button onClick={() => { setConfirmReset(false); setResetError(""); }} disabled={resetting}
                className="px-3 py-2 text-xs font-semibold border border-border text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50">
                Keep my history
              </button>
            </div>
          </div>
        )}

        {resetDone && (
          <div role="status" className="border border-border bg-card px-4 py-2.5 text-xs text-muted-foreground flex items-center justify-between gap-3">
            <span>{resetDone}</span>
            <button onClick={() => setResetDone("")} className="text-link hover:underline shrink-0">Dismiss</button>
          </div>
        )}

        {/* ── Summary — loading, error, empty and populated are four distinct renders ── */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border border border-border">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-card p-4 h-20 animate-pulse" />
            ))}
          </div>
        ) : loadError ? (
          <div role="alert" className="border border-border bg-card p-8 text-center">
            <p className="text-sm mb-1" style={{ color: "var(--sell)" }}>Couldn&apos;t load your portfolio</p>
            <p className="text-xs text-muted-foreground mb-3">{loadError}</p>
            <p className="text-[11px] text-muted-foreground mb-4">
              Your positions and cash are safe — this is a display problem, not a change to your account.
            </p>
            <button onClick={retry} className="px-4 py-2 text-xs font-semibold border border-border text-foreground hover:border-primary/50 transition-colors">
              Retry
            </button>
          </div>
        ) : paper ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border border border-border">
            {STATS.map(s => (
              <div key={s.l} className="bg-card p-4">
                <div className="text-muted-foreground text-xs mb-1.5 uppercase tracking-wide">{s.l}</div>
                <div className="text-xl font-bold font-mono tracking-tight" style={{ color: s.color }}>{s.v}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="border border-border bg-card p-8 text-center text-muted-foreground text-sm">
            No paper account yet. <Link href="/dashboard/terminal" className="text-link hover:underline">Place your first trade →</Link>
          </div>
        )}

        {/* ── Positions / Orders ── */}
        <div className="border border-border bg-card overflow-hidden">
          <div className="flex border-b border-border">
            {(["Positions", "Orders"] as Tab[]).map(t => (
              <button key={t} onClick={() => setTab(t)}
                aria-current={tab === t ? "true" : undefined}
                className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === t ? "text-link border-primary" : "text-muted-foreground border-transparent hover:text-foreground"}`}>
                {t}
                {t === "Positions" && positions.length > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 bg-secondary text-muted-foreground text-[9px] font-bold font-mono">{positions.length}</span>
                )}
              </button>
            ))}
          </div>

          {tab === "Positions" && (
            loading ? (
              <div className="p-10 text-center text-muted-foreground text-sm">Loading…</div>
            ) : loadError ? (
              <div role="alert" className="p-10 text-center">
                <p className="text-sm mb-2" style={{ color: "var(--sell)" }}>Couldn&apos;t load positions</p>
                <button onClick={retry} className="text-link text-xs hover:underline">Retry</button>
              </div>
            ) : positions.length === 0 ? (
              <div className="p-10 text-center text-muted-foreground text-sm">
                No open positions. <Link href="/dashboard/terminal" className="text-link hover:underline">Open one from Terminal →</Link>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1.2fr] px-5 py-2.5 bg-secondary/50 border-b border-border text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                  <span>Symbol</span><span className="text-right">Qty</span><span className="text-right">Avg cost</span><span className="text-right">LTP</span><span className="text-right">Unrealised P&amp;L</span>
                </div>
                {positions.map((p, i) => {
                  const up  = p.unrealisedPnl >= 0;
                  const pct = p.averageCost > 0 ? (p.unrealisedPnl / (p.averageCost * p.quantity)) * 100 : 0;
                  return (
                    <div key={p._id} className={`grid grid-cols-[2fr_1fr_1fr_1fr_1.2fr] items-center px-5 py-3.5 hover:bg-secondary/40 transition-colors ${i < positions.length - 1 ? "border-b border-border" : ""}`}>
                      <div>
                        {/* Carry the symbol through — this used to land every position on RELIANCE. */}
                        <Link href={`/dashboard/terminal?symbol=${encodeURIComponent(p.symbol)}`} className="text-sm font-semibold hover:text-link transition-colors">{p.symbol}</Link>
                        <div className="text-[10px] text-muted-foreground font-mono">{p.exchange}</div>
                      </div>
                      <div className="text-right text-sm font-mono">{p.quantity}</div>
                      <div className="text-right text-sm font-mono">₹{p.averageCost.toLocaleString("en-IN")}</div>
                      <div className="text-right text-sm font-mono">₹{p.currentPrice.toLocaleString("en-IN")}</div>
                      <div className="text-right text-sm font-semibold font-mono" style={{ color: up ? "var(--buy)" : "var(--sell)" }}>
                        {signedMoney(p.unrealisedPnl)}
                        <div className="text-[10px] font-normal">{signedPct(pct)}</div>
                      </div>
                    </div>
                  );
                })}
              </>
            )
          )}

          {tab === "Orders" && (
            loading ? (
              <div className="p-10 text-center text-muted-foreground text-sm">Loading…</div>
            ) : loadError ? (
              <div role="alert" className="p-10 text-center">
                <p className="text-sm mb-2" style={{ color: "var(--sell)" }}>Couldn&apos;t load orders</p>
                <button onClick={retry} className="text-link text-xs hover:underline">Retry</button>
              </div>
            ) : orders.length === 0 ? (
              <div className="p-10 text-center text-muted-foreground text-sm">No orders yet.</div>
            ) : (
              <>
                <div className="grid grid-cols-[1.7fr_70px_60px_1fr_1.1fr_90px_82px] px-5 py-2.5 bg-secondary/50 border-b border-border text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                  <span>Symbol</span><span className="text-center">Side</span><span className="text-right">Qty</span><span className="text-right">Price</span><span className="text-right">Placed</span><span className="text-center">Status</span><span className="text-right">Why</span>
                </div>
                {orders.map((o, i) => {
                  const filled = o.executedPrice != null;
                  return (
                  <div key={o._id} className={`grid grid-cols-[1.7fr_70px_60px_1fr_1.1fr_90px_82px] items-center px-5 py-3 ${i < orders.length - 1 ? "border-b border-border" : ""}`}>
                    <div>
                      <div className="text-sm font-semibold">{o.symbol}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{o.exchange}{o.type ? ` · ${o.type}` : ""}</div>
                    </div>
                    <div className="text-center">
                      <span className="px-1.5 py-0.5 text-[9px] font-bold" style={{ background: o.side === "BUY" ? "var(--buy)" : "var(--sell)", color: "#0b0e14" }}>{o.side}</span>
                    </div>
                    <div className="text-right text-sm font-mono">{o.quantity}</div>
                    {/* An unfilled order has no fill price — showing ₹0 invented one. */}
                    <div className="text-right text-sm font-mono">
                      {filled
                        ? `₹${o.executedPrice!.toLocaleString("en-IN")}`
                        : o.limitPrice != null
                          ? <span className="text-muted-foreground">₹{o.limitPrice.toLocaleString("en-IN")} <span className="text-[9px]">limit</span></span>
                          : <span className="text-muted-foreground">—</span>}
                    </div>
                    <div className="text-right text-[10px] text-muted-foreground font-mono">
                      {o.createdAt
                        ? new Date(o.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
                        : "—"}
                    </div>
                    <div className="text-center">
                      <span className="text-[9px] font-bold px-1.5 py-0.5 font-mono uppercase"
                        style={{
                          background: o.status === "EXECUTED" ? "color-mix(in oklch, var(--buy) 15%, transparent)" : o.status === "PENDING" ? "color-mix(in oklch, var(--amber, #e0ab4a) 18%, transparent)" : "var(--secondary)",
                          color: o.status === "EXECUTED" ? "var(--buy)" : o.status === "PENDING" ? "#e0ab4a" : "var(--muted-foreground)",
                        }}>
                        {o.status}
                      </span>
                    </div>
                    {/* An order placed on the agent's analysis links back to it.
                        One placed by hand says so — an empty cell would read as
                        a reasoning panel that failed to load. */}
                    <div className="text-right">
                      {o.decisionTurnId ? (
                        <Link
                          href={`/dashboard/strategies/${encodeURIComponent(o.decisionTurnId)}`}
                          className="text-[10px] text-link hover:underline"
                        >
                          AI analysis →
                        </Link>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">Manual</span>
                      )}
                    </div>
                  </div>
                  );
                })}
              </>
            )
          )}
        </div>

        <p className="text-[10px] text-muted-foreground text-center">Simulated paper trading — no real money involved.</p>
      </div>
    </div>
  );
}
