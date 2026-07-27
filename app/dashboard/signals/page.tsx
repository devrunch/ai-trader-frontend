"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { indicatorLabel, indicatorValue } from "@/lib/indicator-labels";
import { errorMessage, getSignals, getMarketNews, getSignalPerformance, MIN_BUCKET_SAMPLE,
  type ApiSignal, type ApiNewsItem, type SignalPerformance } from "@/lib/api";
import { useMarketStatus } from "@/lib/market-status";
import { Disclaimer } from "@/components/Disclaimer";
import { ErrorState } from "@/components/ErrorState";

/* ─── Signal mapping ─── */
interface Signal {
  id: string;
  symbol: string;
  exchange: string;
  action: "BUY" | "SELL";
  confidence: number;
  entry: number;
  target: number;
  sl: number;
  rr: number;
  reasoning: string;
  indicators: Record<string, number>;
  generatedAt: string;
  /** From an earlier session. These are intraday ideas — yesterday's is not actionable. */
  stale: boolean;
}

function mapSignal(s: ApiSignal): Signal {
  const rr = parseFloat(((Math.abs(s.targetPrice - s.entryPrice)) / Math.max(Math.abs(s.entryPrice - s.stopLoss), 0.01)).toFixed(1));
  const t = new Date(s.generatedAt ?? s.createdAt);
  const isToday = t.toDateString() === new Date().toDateString();
  return {
    id: s._id, symbol: s.symbol, exchange: s.exchange ?? "NSE",
    action: s.direction === "BUY" ? "BUY" : "SELL",
    confidence: Math.round(s.confidence * 100),
    entry: s.entryPrice, target: s.targetPrice, sl: s.stopLoss, rr,
    reasoning: s.reasoning, indicators: s.indicators ?? {},
    generatedAt: isToday
      ? t.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
      : t.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
    // Every signal here is an intraday idea with a same-session horizon, so one
    // from a previous session is history, not a suggestion. Without this, a
    // signal from last Tuesday sat in the list looking exactly like one from a
    // minute ago.
    stale: !isToday,
  };
}

function timeAgo(iso: string) {
  try {
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 3600)  return `${Math.round(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
    return `${Math.round(diff / 86400)}d ago`;
  } catch { return ""; }
}

type Tab = "Signals" | "Performance" | "News";
type ActionFilter = "All" | "BUY" | "SELL";
type ConfFilter = "All" | "High" | "Medium";
type NewsFilter = "All" | "POSITIVE" | "NEGATIVE" | "NEUTRAL";

export default function SignalsPage() {
  const [tab, setTab] = useState<Tab>("Signals");

  const [signals, setSignals] = useState<Signal[]>([]);
  const [sigLoading, setSigLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState<ActionFilter>("All");
  const [confFilter, setConfFilter] = useState<ConfFilter>("All");
  const [expanded, setExpanded] = useState<string | null>(null);

  const [news, setNews] = useState<ApiNewsItem[]>([]);
  const [newsFilter, setNewsFilter] = useState<NewsFilter>("All");
  const [loadedNews, setLoadedNews] = useState(false);

  const [perf, setPerf] = useState<SignalPerformance | null>(null);
  const [loadedPerf, setLoadedPerf] = useState(false);

  /* Derived, not stored. "Are we loading?" is fully determined by which tab is
     open and whether that tab has fetched yet — holding it in state meant
     setting it synchronously inside an effect, which cascades a render. */

  /* Failures are kept apart from emptiness. Collapsing them meant the API being
     down rendered as "no signals yet" — the user is told nothing was found when
     in fact nothing was asked. */
  const [sigError, setSigError] = useState("");
  const [newsError, setNewsError] = useState("");
  const [perfError, setPerfError] = useState("");
  const [retry, setRetry] = useState(0);

  /* One shared market-status poll, from the dashboard layout. */
  const { isLive: marketIsLive } = useMarketStatus();

  useEffect(() => {
    let alive = true;
    const load = () => getSignals(100)
      .then(d => { if (alive) { setSignals(d.map(mapSignal)); setSigError(""); } })
      .catch(e => { if (alive) setSigError(errorMessage(e)); })
      .finally(() => { if (alive) setSigLoading(false); });

    load();
    // Nothing generates signals outside market hours, so polling then spends
    // rate limit to re-fetch a list that cannot have changed. Fetch once and
    // stop until the market reopens.
    if (!marketIsLive) return () => { alive = false; };

    const id = setInterval(load, 30_000);
    return () => { alive = false; clearInterval(id); };
  }, [retry, marketIsLive]);

  useEffect(() => {
    if (tab !== "News" || loadedNews) return;
    getMarketNews(undefined, 25)
      .then(r => { setNews(r.articles); setNewsError(""); })
      .catch(e => setNewsError(errorMessage(e)))
      .finally(() => setLoadedNews(true));
  }, [tab, loadedNews]);

  useEffect(() => {
    if (tab !== "Performance" || loadedPerf) return;
    getSignalPerformance(40)
      .then(p => { setPerf(p); setPerfError(""); })
      .catch(e => setPerfError(errorMessage(e)))
      .finally(() => setLoadedPerf(true));
  }, [tab, loadedPerf]);

  function retryAll() {
    setSigLoading(true);
    setLoadedNews(false);
    setLoadedPerf(false);
    setRetry(n => n + 1);
  }

  const newsLoading = tab === "News" && !loadedNews;
  const perfLoading = tab === "Performance" && !loadedPerf;

  const buyCount  = signals.filter(s => s.action === "BUY").length;
  const sellCount = signals.filter(s => s.action === "SELL").length;
  const avgConf   = signals.length ? Math.round(signals.reduce((a, s) => a + s.confidence, 0) / signals.length) : 0;

  const filtered = signals.filter(s => {
    if (actionFilter !== "All" && s.action !== actionFilter) return false;
    if (confFilter === "High" && s.confidence < 75) return false;
    if (confFilter === "Medium" && (s.confidence < 65 || s.confidence >= 75)) return false;
    return true;
  });

  const filteredNews = newsFilter === "All" ? news : news.filter(n => n.sentiment === newsFilter);

  return (
    <div className="h-full overflow-y-auto no-scrollbar py-5">
      <div className="max-w-[1100px] space-y-5">

        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Signals &amp; News</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Everything the AI has flagged across your watchlist, plus market sentiment.</p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-1 border-b border-border">
          {(["Signals", "Performance", "News"] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === t ? "text-link border-primary" : "text-muted-foreground border-transparent hover:text-foreground"}`}>
              {t}
              {t === "Signals" && signals.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 bg-secondary text-muted-foreground text-[9px] font-bold font-mono">{signals.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* ══ SIGNALS ══ */}
        {tab === "Signals" && (
          <div className="space-y-4">
            {/* Stat strip */}
            <div className="grid grid-cols-3 gap-px bg-border border border-border">
              {[
                { l: "BUY", v: buyCount, c: "var(--buy)" },
                { l: "SELL", v: sellCount, c: "var(--sell)" },
                { l: "Avg confidence", v: `${avgConf}%`, c: "var(--foreground)" },
              ].map(s => (
                <div key={s.l} className="bg-card p-4">
                  <div className="text-muted-foreground text-[10px] uppercase tracking-wider mb-1">{s.l}</div>
                  <div className="text-xl font-bold font-mono" style={{ color: s.c }}>{s.v}</div>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              {(["All", "BUY", "SELL"] as ActionFilter[]).map(f => (
                <button key={f} onClick={() => setActionFilter(f)}
                  className="px-3 py-1.5 text-xs font-semibold border transition-colors"
                  style={actionFilter === f
                    ? (f === "BUY" ? { background: "var(--buy)", color: "#0b0e14", borderColor: "var(--buy)" }
                      : f === "SELL" ? { background: "var(--sell)", color: "#0b0e14", borderColor: "var(--sell)" }
                      : { background: "var(--foreground)", color: "var(--background)", borderColor: "var(--foreground)" })
                    : { borderColor: "var(--border)", color: "var(--muted-foreground)" }}>
                  {f}
                </button>
              ))}
              <div className="h-4 w-px bg-border mx-1" />
              {(["All", "High", "Medium"] as ConfFilter[]).map(f => (
                <button key={f} onClick={() => setConfFilter(f)}
                  className={`px-3 py-1.5 text-xs font-medium border transition-colors ${confFilter === f ? "bg-primary/15 text-link border-primary/30" : "border-border text-muted-foreground hover:text-foreground"}`}>
                  {f === "All" ? "All confidence" : f === "High" ? "High ≥75%" : "Medium 65–75%"}
                </button>
              ))}
              <span className="ml-auto text-xs text-muted-foreground font-mono">{filtered.length} signals</span>
            </div>

            {/* Table */}
            <div className="border border-border bg-card overflow-hidden">
              <div className="grid grid-cols-[1.6fr_70px_90px_1fr_1fr_1fr_60px_60px] items-center px-4 py-2.5 bg-secondary/50 border-b border-border text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                <span>Stock</span><span className="text-center">Signal</span><span>Confidence</span>
                <span className="text-right">Entry</span><span className="text-right">Target</span><span className="text-right">Stop</span>
                <span className="text-right">R:R</span><span className="text-right">Time</span>
              </div>

              {sigLoading ? (
                <div className="p-10 text-center text-muted-foreground text-sm">Loading signals…</div>
              ) : sigError ? (
                <ErrorState message={sigError} onRetry={retryAll} />
              ) : filtered.length === 0 ? (
                <div className="p-10 text-center">
                  <p className="text-muted-foreground text-sm">No signals yet.</p>
                  <p className="text-muted-foreground text-xs mt-1">The screener runs every 15 min during market hours — or ask on demand from <Link href="/dashboard/terminal" className="text-link hover:underline">Terminal</Link>.</p>
                </div>
              ) : filtered.map((sig, i) => {
                const isBuy = sig.action === "BUY";
                const col = isBuy ? "var(--buy)" : "var(--sell)";
                const open = expanded === sig.id;
                // De-emphasised, not hidden: the track record still includes it.
                const dim = sig.stale ? "opacity-55" : "";
                return (
                  <div key={sig.id} className={`${dim} ${i < filtered.length - 1 && !open ? "border-b border-border" : open ? "border-b border-border" : ""}`}>
                    {/* A real <button>, not a click handler on a div. The row
                        expansion was mouse-only, so the detail — reasoning,
                        indicators, R:R — was unreachable by keyboard entirely. */}
                    <button
                      type="button"
                      onClick={() => setExpanded(open ? null : sig.id)}
                      aria-expanded={open}
                      aria-controls={`signal-detail-${sig.id}`}
                      className="w-full text-left grid grid-cols-[1.6fr_70px_90px_1fr_1fr_1fr_60px_60px] items-center px-4 py-3 cursor-pointer hover:bg-secondary/40 focus-visible:bg-secondary/40 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--link)] transition-colors border-l-2"
                      style={{ borderLeftColor: col }}
                    >
                      <div>
                        <div className="text-sm font-semibold">{sig.symbol}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">{sig.exchange}</div>
                      </div>
                      <div className="text-center">
                        <span className="px-2 py-0.5 text-[10px] font-bold" style={{ background: col, color: "#0b0e14" }}>{sig.action}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="flex-1 h-1 bg-secondary overflow-hidden">
                          <div className="h-full" style={{ width: `${sig.confidence}%`, background: sig.confidence >= 75 ? "var(--buy)" : "#e0ab4a" }} />
                        </div>
                        <span className="text-[10px] font-mono font-semibold">{sig.confidence}%</span>
                      </div>
                      <div className="text-right text-sm font-mono">₹{sig.entry.toLocaleString("en-IN")}</div>
                      <div className="text-right text-sm font-mono" style={{ color: "var(--buy)" }}>₹{sig.target.toLocaleString("en-IN")}</div>
                      <div className="text-right text-sm font-mono" style={{ color: "var(--sell)" }}>₹{sig.sl.toLocaleString("en-IN")}</div>
                      <div className="text-right text-sm font-mono font-semibold" style={{ color: "#e0ab4a" }}>{sig.rr}×</div>
                      <div className="text-right text-[10px] text-muted-foreground font-mono">
                        {sig.generatedAt}
                        {sig.stale && (
                          <span
                            className="ml-1.5 px-1 py-0.5 border border-border text-[9px] uppercase tracking-wide"
                            title="Generated in an earlier session — intraday levels are no longer actionable"
                          >
                            past session
                          </span>
                        )}
                      </div>
                    </button>

                    {open && (
                      <div id={`signal-detail-${sig.id}`} className="px-4 py-4 bg-secondary/30 border-t border-border">
                        <p className="text-sm text-muted-foreground leading-relaxed mb-3">{sig.reasoning}</p>
                        {Object.keys(sig.indicators).length > 0 && (
                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-x-4 gap-y-1.5 mb-4">
                            {Object.entries(sig.indicators).map(([k, v]) => (
                              <div key={k} className="flex justify-between text-[11px]">
                                <span className="text-muted-foreground text-[10px]">{indicatorLabel(k)}</span>
                                <span className="font-mono font-semibold tabular-nums">
                                  {typeof v === "number" ? indicatorValue(k, Number(v.toFixed(2))) : String(v)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                        <Link href="/dashboard/terminal" className="inline-block px-4 py-2 bg-primary text-primary-foreground text-xs font-bold hover:brightness-110 transition-all">
                          Open in Terminal →
                        </Link>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══ PERFORMANCE ══ */}
        {tab === "Performance" && (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Each stored signal walked forward through real 15-minute bars from the moment it fired — did the target or the stop hit first?
            </p>

            {perfLoading ? (
              <div className="p-10 text-center text-muted-foreground text-sm">Backtesting signals against historical data…</div>
            ) : perfError ? (
              <ErrorState message={perfError} onRetry={retryAll} />
            ) : !perf || perf.signals.length === 0 ? (
              <div className="border border-border bg-card p-10 text-center text-muted-foreground text-sm">
                No signals to evaluate yet. Generate some from <Link href="/dashboard/terminal" className="text-link hover:underline">Terminal</Link>.
              </div>
            ) : (
              <>
                {/* Summary */}
                {(() => {
                  const sum = perf.summary;
                  const breakeven = sum.breakevenWinRate ?? null;
                  // Colour against THIS system's breakeven, never against 50%.
                  // Its average win is larger than its average loss, so it is
                  // profitable well below 50% — colouring against 50% would mark
                  // a winning system red and teach the wrong standard.
                  const beatsBar = breakeven === null ? null : sum.winRate >= breakeven;
                  const winColour = beatsBar === null
                    ? "var(--foreground)"
                    : beatsBar ? "var(--buy)" : "var(--sell)";
                  const exp = sum.expectancyPct;
                  const ci = sum.expectancyCi95;

                  return (
                    <>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border border border-border">
                        {[
                          {
                            l: "Win rate",
                            v: `${sum.winRate}%`,
                            c: winColour,
                            sub: breakeven !== null ? `breakeven ${breakeven}%` : "breakeven not yet computable",
                          },
                          {
                            l: "Expectancy / trade",
                            v: exp === undefined ? "—" : `${exp >= 0 ? "+" : "−"}${Math.abs(exp)}%`,
                            c: exp === undefined ? "var(--foreground)" : exp >= 0 ? "var(--buy)" : "var(--sell)",
                            sub: ci ? `95% CI ${ci.low}% to ${ci.high}%` : "interval needs more trades",
                          },
                          {
                            l: "Resolved",
                            v: `${sum.wins}W · ${sum.losses}L`,
                            c: "var(--foreground)",
                            sub: `n = ${sum.sampleSize ?? sum.resolved}`,
                          },
                          {
                            l: "Still open",
                            v: sum.open,
                            c: "var(--muted-foreground)",
                            sub: `${sum.noData} without data`,
                          },
                        ].map(s => (
                          <div key={s.l} className="bg-card p-4">
                            <div className="text-muted-foreground text-[10px] uppercase tracking-wider mb-1">{s.l}</div>
                            <div className="text-xl font-bold font-mono tabular-nums" style={{ color: s.c }}>{s.v}</div>
                            <div className="text-muted-foreground text-[10px] mt-1 font-mono">{s.sub}</div>
                          </div>
                        ))}
                      </div>

                      {/* The honest headline. A point estimate whose interval spans
                          zero has not established a direction, and saying so is the
                          whole point of publishing a track record. */}
                      {sum.inconclusive && (
                        <div className="border border-border bg-card px-4 py-3 text-xs text-muted-foreground">
                          <span className="font-semibold text-foreground">Not yet conclusive.</span>{" "}
                          The confidence interval on expectancy spans zero — on this sample
                          this system has not been shown to make money, and has not been shown
                          to lose money either. Treat the point estimate as a lean, not a result.
                        </div>
                      )}
                    </>
                  );
                })()}

                {/* Breakdown by confidence + symbol */}
                <div className="grid sm:grid-cols-2 gap-4">
                  {[
                    { title: "By confidence", rows: perf.byConfidence },
                    { title: "By symbol", rows: perf.bySymbol },
                  ].map(block => (
                    <div key={block.title} className="border border-border bg-card overflow-hidden">
                      <div className="px-4 py-2.5 bg-secondary/50 border-b border-border text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                        {block.title}
                      </div>
                      {block.rows.length === 0 ? (
                        <div className="px-4 py-3 text-xs text-muted-foreground">Not enough resolved trades yet</div>
                      ) : block.rows.map(b => {
                        // A bucket below the sample floor gets its number withheld
                        // rather than greyed: "1 trade · 100%" reads as a finding
                        // even in grey, and it is noise.
                        const enough = b.trades >= MIN_BUCKET_SAMPLE;
                        const bar = perf.summary.breakevenWinRate ?? null;
                        const colour = !enough || bar === null
                          ? "var(--muted-foreground)"
                          : b.winRate >= bar ? "var(--buy)" : "var(--sell)";
                        return (
                          <div key={b.key} className="flex items-center justify-between px-4 py-2 border-b border-border last:border-0 text-xs">
                            <span className="font-mono font-semibold">{b.key}</span>
                            <span className="text-muted-foreground tabular-nums">
                              {b.trades} {b.trades === 1 ? "trade" : "trades"}
                            </span>
                            {enough ? (
                              <span className="font-mono font-bold tabular-nums" style={{ color: colour }}>{b.winRate}%</span>
                            ) : (
                              <span
                                className="font-mono text-muted-foreground"
                                title={`Needs ${MIN_BUCKET_SAMPLE} resolved trades before a win rate means anything`}
                              >
                                n too small
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>

                {/* Per-signal outcomes */}
                <div className="border border-border bg-card overflow-hidden">
                  <div className="grid grid-cols-[1.4fr_60px_1fr_1fr_90px_70px] items-center px-4 py-2.5 bg-secondary/50 border-b border-border text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                    <span>Stock</span><span className="text-center">Dir</span><span className="text-right">Entry</span><span className="text-right">Exit</span><span className="text-center">Outcome</span><span className="text-right">P&amp;L</span>
                  </div>
                  {perf.signals.map(s => {
                    const oc = s.outcome;
                    const col = oc === "TARGET_HIT" ? "var(--buy)" : oc === "STOP_HIT" ? "var(--sell)" : "var(--muted-foreground)";
                    const label = oc === "TARGET_HIT" ? "TARGET" : oc === "STOP_HIT" ? "STOP" : oc === "OPEN" ? "OPEN" : "NO DATA";
                    return (
                      <div key={s._id} className="grid grid-cols-[1.4fr_60px_1fr_1fr_90px_70px] items-center px-4 py-3 border-b border-border last:border-0">
                        <div>
                          <div className="text-sm font-semibold">{s.symbol}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">{s.exchange}</div>
                        </div>
                        <div className="text-center">
                          <span className="text-[10px] font-bold" style={{ color: s.direction === "BUY" ? "var(--buy)" : "var(--sell)" }}>{s.direction}</span>
                        </div>
                        <div className="text-right text-sm font-mono">₹{s.entryPrice.toLocaleString("en-IN")}</div>
                        <div className="text-right text-sm font-mono">{s.exitPrice != null ? `₹${s.exitPrice.toLocaleString("en-IN")}` : "—"}</div>
                        <div className="text-center">
                          {oc === "OPEN" || oc === "NO_DATA" ? (
                            <span className="px-1.5 py-0.5 text-[9px] font-bold" style={{ border: `1px solid ${col}`, color: col }}>{label}</span>
                          ) : (
                            <span className="px-1.5 py-0.5 text-[9px] font-bold" style={{ background: col, color: "#0b0e14" }}>{label}</span>
                          )}
                        </div>
                        <div className="text-right text-sm font-mono font-semibold" style={{ color: s.pnlPct >= 0 ? "var(--buy)" : "var(--sell)" }}>
                          {s.pnlPct >= 0 ? "+" : ""}{s.pnlPct}%
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Conservative fill: if a bar&apos;s range spans both target and stop, the stop is assumed hit first. Gapped stops fill at the bar open, and round-trip costs are deducted. Signals older than ~58 days show &ldquo;no data&rdquo; (intraday history limit).
                  {" "}
                  <span className="text-foreground/70">
                    In-sample: every threshold in this system was tuned on the only ~58 days
                    of intraday history available, so the true out-of-sample result is worse
                    than what is shown here.
                  </span>
                </p>
              </>
            )}
          </div>
        )}

        {/* ══ NEWS ══ */}
        {tab === "News" && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {(["All", "POSITIVE", "NEGATIVE", "NEUTRAL"] as NewsFilter[]).map(f => (
                <button key={f} onClick={() => setNewsFilter(f)}
                  className="px-3 py-1.5 text-xs font-medium border transition-colors"
                  style={newsFilter === f
                    ? (f === "POSITIVE" ? { background: "var(--buy)", color: "#0b0e14", borderColor: "var(--buy)" }
                      : f === "NEGATIVE" ? { background: "var(--sell)", color: "#0b0e14", borderColor: "var(--sell)" }
                      : f === "NEUTRAL" ? { background: "var(--muted-foreground)", color: "var(--background)", borderColor: "var(--muted-foreground)" }
                      : { background: "var(--foreground)", color: "var(--background)", borderColor: "var(--foreground)" })
                    : { borderColor: "var(--border)", color: "var(--muted-foreground)" }}>
                  {f === "All" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
                </button>
              ))}
            </div>

            {newsLoading ? (
              <div className="p-10 text-center text-muted-foreground text-sm">Loading news…</div>
            ) : newsError ? (
              <ErrorState message={newsError} onRetry={retryAll} />
            ) : filteredNews.length === 0 ? (
              <div className="border border-border bg-card p-10 text-center text-muted-foreground text-sm">
                No articles right now. Live news needs a NEWS_API_KEY configured on the signals service.
              </div>
            ) : (
              <div className="border border-border bg-card">
                {filteredNews.map((n, i) => {
                  const col = n.sentiment === "POSITIVE" ? "var(--buy)" : n.sentiment === "NEGATIVE" ? "var(--sell)" : "var(--muted-foreground)";
                  return (
                    <a key={n.id} href={n.url} target="_blank" rel="noreferrer"
                      className={`block px-4 py-3.5 hover:bg-secondary/40 transition-colors ${i < filteredNews.length - 1 ? "border-b border-border" : ""}`}>
                      <div className="flex items-start justify-between gap-3 mb-1.5">
                        <h3 className="text-sm font-medium leading-snug">{n.headline}</h3>
                        <span className="shrink-0 px-1.5 py-0.5 text-[9px] font-bold uppercase" style={{ background: col, color: "#0b0e14" }}>{n.sentiment}</span>
                      </div>
                      {n.description && <p className="text-xs text-muted-foreground leading-relaxed mb-2 line-clamp-2">{n.description}</p>}
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono">
                        <span>{n.source}</span><span>·</span><span>{timeAgo(n.publishedAt)}</span>
                        {n.symbols?.slice(0, 3).map(s => (
                          <span key={s} className="px-1.5 py-0.5 bg-secondary">{s}</span>
                        ))}
                      </div>
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Every surface that shows a trade suggestion carries this. The News
            tab does not propose trades, so it does not need it. */}
        {tab !== "News" && <Disclaimer />}

      </div>
    </div>
  );
}
