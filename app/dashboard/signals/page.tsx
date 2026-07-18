"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getSignals, type ApiSignal } from "@/lib/api";

/* ─── Types ─── */
type Action    = "BUY" | "SELL";
type SigType   = "Technical Confluence" | "Breakout" | "Reversal" | "News Driven" | "Momentum";
type Timeframe = "Intraday" | "Swing" | "Positional";
type Status    = "ACTIVE" | "TARGET HIT" | "STOPLOSS HIT" | "EXPIRED";

interface Signal {
  id: string;
  symbol: string;
  name: string;
  exchange: string;
  sector: string;
  action: Action;
  confidence: number;
  entry: number;
  target: number;
  sl: number;
  rr: number;
  type: SigType;
  timeframe: Timeframe;
  reasoning: string;
  generatedAt: string;
  status: Status;
  color: string;
}

/* ─── Map API signal → UI Signal ─── */
const SYMBOL_COLORS: Record<string, string> = {
  RELIANCE:"#0070ba",HDFCBANK:"#e4002b",INFY:"#007cc3",TATAMOTORS:"#00205b",
  AXISBANK:"#8b0000",TCS:"#0052cc",WIPRO:"#7b2d8b",ICICIBANK:"#f58220",
  SBIN:"#2563eb",LT:"#92400e",KOTAKBANK:"#15803d",HINDUNILVR:"#b45309",
  ITC:"#065f46",BAJFINANCE:"#1d4ed8",MARUTI:"#7c3aed",
};
function symbolColor(sym: string) {
  return SYMBOL_COLORS[sym] ?? `hsl(${sym.split("").reduce((a,c)=>a+c.charCodeAt(0),0)%360},60%,40%)`;
}
function mapSignal(s: ApiSignal): Signal {
  const isBuy = s.direction === "BUY";
  const rr    = parseFloat(
    ((Math.abs(s.targetPrice - s.entryPrice)) / Math.max(Math.abs(s.entryPrice - s.stopLoss), 0.01)).toFixed(1)
  );
  const t     = new Date(s.generatedAt ?? s.createdAt);
  return {
    id:          s._id,
    symbol:      s.symbol,
    name:        s.symbol,
    exchange:    s.exchange ?? "NSE",
    sector:      "Equity",
    action:      isBuy ? "BUY" : "SELL",
    confidence:  Math.round(s.confidence * 100),
    entry:       s.entryPrice,
    target:      s.targetPrice,
    sl:          s.stopLoss,
    rr,
    type:        "Technical Confluence",
    timeframe:   "Intraday",
    reasoning:   s.reasoning,
    generatedAt: t.toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit" }),
    status:      "ACTIVE",
    color:       symbolColor(s.symbol),
  };
}

const PERFORMANCE = [
  { label: "Total Signals (30d)", value: "148",  color: "#1a1a1a" },
  { label: "Win Rate",            value: "73%",  color: "#00b386" },
  { label: "Avg R:R Achieved",    value: "2.1×", color: "#00b386" },
  { label: "Accuracy (7d)",       value: "81%",  color: "#00b386" },
];

/* ─── Sparkline ─── */
function Sparkline({ symbol, up }: { symbol: string; up: boolean }) {
  const seed = symbol.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const sr   = (s: number) => { const x = Math.sin(s * seed * 0.1 + 1) * 10000; return x - Math.floor(x); };
  const data = Array.from({ length: 20 }, (_, i) => sr(i + 1));
  const min = Math.min(...data), max = Math.max(...data), range = max - min || 1;
  const w = 72, h = 28, p = 2;
  const pts = data.map((v, i) => {
    const x = p + (i / (data.length - 1)) * (w - p * 2);
    const y = (h - p) - ((v - min) / range) * (h - p * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const line = `M ${pts.join(" L ")}`;
  const [fx] = pts[0].split(","), [lx] = pts[pts.length - 1].split(",");
  const area = `${line} L ${lx},${h} L ${fx},${h} Z`;
  const c = up ? "#00b386" : "#e84040";
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <defs>
        <linearGradient id={`sg-${symbol}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c} stopOpacity="0.15" />
          <stop offset="100%" stopColor={c} stopOpacity="0"  />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sg-${symbol})`} />
      <path d={line}  fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ─── Confidence bar ─── */
function ConfidenceBar({ v }: { v: number }) {
  const c = v >= 75 ? "#00b386" : v >= 65 ? "#f59e0b" : "#9ca3af";
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-16 h-1.5 bg-[#f0f0f0] rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${v}%`, background: c }} />
      </div>
      <span className="text-[10px] font-semibold" style={{ color: c }}>{v}%</span>
    </div>
  );
}

/* ─── Status badge ─── */
function StatusBadge({ s }: { s: Status }) {
  const map: Record<Status, { bg: string; text: string }> = {
    "ACTIVE":       { bg: "#e8f9f4", text: "#00b386" },
    "TARGET HIT":   { bg: "#f0fdf4", text: "#16a34a" },
    "STOPLOSS HIT": { bg: "#fef2f2", text: "#e84040" },
    "EXPIRED":      { bg: "#f3f4f6", text: "#6b7280" },
  };
  const st = map[s];
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
      style={{ background: st.bg, color: st.text }}>
      {s}
    </span>
  );
}

/* ─── Page ─── */
export default function SignalsPage() {
  const [subTab,      setSubTab]      = useState<"Live" | "History" | "Performance" | "Watchlist">("Live");
  const [actionFilter,setActionFilter]= useState<"All" | "BUY" | "SELL">("All");
  const [confFilter,  setConfFilter]  = useState<"All" | "High" | "Medium">("All");
  const [tfFilter,    setTfFilter]    = useState<"All" | "Intraday" | "Swing" | "Positional">("All");
  const [expanded,    setExpanded]    = useState<string | null>(null);
  const [signals,     setSignals]     = useState<Signal[]>([]);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    getSignals(100)
      .then(data => setSignals(data.map(mapSignal)))
      .catch(() => {/* API unavailable — stay empty */})
      .finally(() => setLoading(false));

    // poll every 30s for new signals
    const id = setInterval(() => {
      getSignals(100)
        .then(data => setSignals(data.map(mapSignal)))
        .catch(() => {});
    }, 30_000);
    return () => clearInterval(id);
  }, []);

  const active  = signals.filter(s => s.status === "ACTIVE");
  const history = signals.filter(s => s.status !== "ACTIVE");

  const filtered = (subTab === "Live" ? active : history).filter(s => {
    if (actionFilter !== "All" && s.action !== actionFilter) return false;
    if (confFilter === "High"   && s.confidence < 75) return false;
    if (confFilter === "Medium" && (s.confidence < 65 || s.confidence >= 75)) return false;
    if (tfFilter !== "All" && s.timeframe !== tfFilter) return false;
    return true;
  });

  return (
    <div className="h-full overflow-y-auto no-scrollbar">
    <div className="max-w-[1440px] py-6">

      {/* Sub-nav */}
      <div className="flex items-center gap-1 border-b border-[#f0f0f0] -mx-8 sm:-mx-12 px-8 sm:px-12 mb-5 bg-white">
        {(["Live","History","Performance","Watchlist"] as const).map(t => (
          <button key={t} onClick={() => setSubTab(t)}
            className={`py-3 px-1 mr-5 text-sm font-medium border-b-2 transition-colors shrink-0 ${subTab === t ? "text-[#00b386] border-[#00b386]" : "text-[#6b7280] border-transparent hover:text-[#1a1a1a]"}`}>
            {t === "Live" ? "Live Signals" : t}
            {t === "Live" && (
              <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full bg-[#e8f9f4] text-[#00b386]">
                {active.length} active
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ════════ LIVE SIGNALS ════════ */}
      {(subTab === "Live" || subTab === "History") && (
        <div className="flex gap-6 items-start">

          {/* Main */}
          <div className="flex-1 min-w-0 space-y-4">

            {/* Filter bar */}
            <div className="bg-white border border-[#e8e8e8] rounded-xl px-4 py-3 shadow-[0_1px_4px_rgba(0,0,0,0.04)] flex flex-wrap items-center gap-3">
              {/* Action */}
              <div className="flex gap-1.5">
                {(["All","BUY","SELL"] as const).map(f => (
                  <button key={f} onClick={() => setActionFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      actionFilter === f
                        ? f === "BUY"  ? "bg-[#00b386] text-white border-[#00b386]"
                        : f === "SELL" ? "bg-[#e84040] text-white border-[#e84040]"
                        : "bg-[#1a1a1a] text-white border-[#1a1a1a]"
                        : "border-[#e8e8e8] text-[#6b7280] hover:border-[#c8c8c8]"
                    }`}>{f}</button>
                ))}
              </div>

              <div className="h-4 w-px bg-[#e8e8e8]" />

              {/* Confidence */}
              <div className="flex gap-1.5">
                {(["All","High","Medium"] as const).map(f => (
                  <button key={f} onClick={() => setConfFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${confFilter === f ? "bg-[#e8f9f4] text-[#00b386] border-[#00b386]/30" : "border-[#e8e8e8] text-[#6b7280] hover:border-[#c8c8c8]"}`}>
                    {f === "All" ? "All Confidence" : f === "High" ? "High (≥75%)" : "Medium (65–75%)"}
                  </button>
                ))}
              </div>

              <div className="h-4 w-px bg-[#e8e8e8]" />

              {/* Timeframe */}
              <div className="flex gap-1.5">
                {(["All","Intraday","Swing","Positional"] as const).map(f => (
                  <button key={f} onClick={() => setTfFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${tfFilter === f ? "bg-[#eff6ff] text-[#3b82f6] border-[#3b82f6]/30" : "border-[#e8e8e8] text-[#6b7280] hover:border-[#c8c8c8]"}`}>
                    {f}
                  </button>
                ))}
              </div>

              <div className="ml-auto text-xs text-[#9ca3af]">{filtered.length} signals</div>
            </div>

            {/* Signals table */}
            <div className="bg-white border border-[#e8e8e8] rounded-xl overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
              {/* Header */}
              <div className="grid grid-cols-[2fr_72px_80px_1fr_1fr_1fr_80px_120px_36px] items-center px-5 py-2.5 bg-[#fafafa] border-b border-[#f0f0f0]">
                {["Stock","Signal","Confidence","Entry","Target","Stop Loss","R:R","Status",""].map(h => (
                  <span key={h} className={`text-[#9ca3af] text-xs font-medium ${h === "Entry" || h === "Target" || h === "Stop Loss" || h === "R:R" ? "text-right" : h === "Signal" || h === "Confidence" || h === "Status" ? "text-center" : ""}`}>{h}</span>
                ))}
              </div>

              {loading ? (
                <div className="py-16 text-center">
                  <p className="text-[#9ca3af] text-sm">Loading signals…</p>
                </div>
              ) : filtered.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="text-[#d0d0d0] mb-2 flex justify-center">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                  </div>
                  <p className="text-[#9ca3af] text-sm">No signals yet — the screener runs every 15 min during market hours</p>
                </div>
              ) : filtered.map((sig, i) => {
                const isBuy   = sig.action === "BUY";
                const isOpen  = expanded === sig.id;
                const tgtPct  = ((sig.target - sig.entry) / sig.entry * 100).toFixed(2);
                const slPct   = ((sig.sl    - sig.entry) / sig.entry * 100).toFixed(2);

                return (
                  <div key={sig.id}>
                    {/* Row */}
                    <div
                      className={`grid grid-cols-[2fr_72px_80px_1fr_1fr_1fr_80px_120px_36px] items-center px-5 py-4 cursor-pointer transition-colors hover:bg-[#f8f9fa] ${i < filtered.length - 1 && !isOpen ? "border-b border-[#f5f5f5]" : ""} ${isBuy ? "border-l-[3px] border-l-[#00b386]" : "border-l-[3px] border-l-[#e84040]"}`}
                      onClick={() => setExpanded(isOpen ? null : sig.id)}>

                      {/* Stock */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ background: sig.color }}>
                          {sig.symbol.slice(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[#1a1a1a] font-semibold text-sm leading-tight">{sig.symbol}</div>
                          <div className="text-[#9ca3af] text-xs mt-0.5 truncate">{sig.name}</div>
                        </div>
                      </div>

                      {/* Action badge */}
                      <div className="flex justify-center">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${isBuy ? "bg-[#e8f9f4] text-[#00b386]" : "bg-[#fef2f2] text-[#e84040]"}`}>
                          {sig.action}
                        </span>
                      </div>

                      {/* Confidence */}
                      <div className="flex justify-center">
                        <ConfidenceBar v={sig.confidence} />
                      </div>

                      {/* Entry */}
                      <div className="text-right">
                        <div className="text-[#1a1a1a] text-sm font-semibold font-mono">₹{sig.entry.toLocaleString("en-IN")}</div>
                        <div className="text-[#9ca3af] text-[10px]">{sig.timeframe}</div>
                      </div>

                      {/* Target */}
                      <div className="text-right">
                        <div className="text-[#00b386] text-sm font-semibold font-mono">₹{sig.target.toLocaleString("en-IN")}</div>
                        <div className="text-[#00b386] text-[10px]">{isBuy ? "+" : ""}{tgtPct}%</div>
                      </div>

                      {/* SL */}
                      <div className="text-right">
                        <div className="text-[#e84040] text-sm font-semibold font-mono">₹{sig.sl.toLocaleString("en-IN")}</div>
                        <div className="text-[#e84040] text-[10px]">{slPct}%</div>
                      </div>

                      {/* R:R */}
                      <div className="text-right">
                        <span className="text-[#f59e0b] text-sm font-bold">{sig.rr}×</span>
                      </div>

                      {/* Status */}
                      <div className="flex justify-center">
                        <StatusBadge s={sig.status} />
                      </div>

                      {/* Expand chevron */}
                      <div className="flex justify-center text-[#9ca3af]">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={`transition-transform ${isOpen ? "rotate-180" : ""}`}>
                          <polyline points="6 9 12 15 18 9"/>
                        </svg>
                      </div>
                    </div>

                    {/* Expanded detail */}
                    {isOpen && (
                      <div className="px-5 py-4 bg-[#f8fffe] border-b border-[#e8e8e8]">
                        <div className="grid sm:grid-cols-[1fr_280px] gap-5">
                          {/* AI Reasoning */}
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-5 h-5 rounded-full bg-[#e8f9f4] flex items-center justify-center">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00b386" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/></svg>
                              </div>
                              <span className="text-[#1a1a1a] text-xs font-semibold">Claude AI Reasoning</span>
                              <span className="text-[#9ca3af] text-xs">· {sig.type} · Generated {sig.generatedAt}</span>
                            </div>
                            <p className="text-[#6b7280] text-sm leading-relaxed bg-white rounded-lg border border-[#e8e8e8] p-3">
                              {sig.reasoning}
                            </p>
                          </div>

                          {/* Quick stats + Actions */}
                          <div className="space-y-3">
                            <div className="bg-white rounded-lg border border-[#e8e8e8] p-3 grid grid-cols-2 gap-2 text-xs">
                              {[
                                { l: "Sector",    v: sig.sector },
                                { l: "Exchange",  v: sig.exchange },
                                { l: "Type",      v: sig.type.split(" ")[0] },
                                { l: "Timeframe", v: sig.timeframe },
                              ].map(s => (
                                <div key={s.l}>
                                  <div className="text-[#9ca3af]">{s.l}</div>
                                  <div className="text-[#1a1a1a] font-semibold mt-0.5">{s.v}</div>
                                </div>
                              ))}
                            </div>
                            <div className="flex gap-2">
                              <Link href={`/dashboard/charts/${sig.symbol}`}
                                className={`flex-1 py-2 rounded-xl text-xs font-bold text-center text-white transition-colors ${isBuy ? "bg-[#00b386] hover:bg-[#009e78]" : "bg-[#e84040] hover:bg-[#dc2626]"}`}>
                                Place Order
                              </Link>
                              <Link href={`/dashboard/charts/${sig.symbol}`}
                                className="px-4 py-2 rounded-xl text-xs font-medium border border-[#e8e8e8] text-[#6b7280] hover:border-[#c8c8c8] hover:text-[#1a1a1a] transition-colors">
                                View Chart
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right sidebar */}
          <div className="hidden xl:flex flex-col gap-4 w-[280px] shrink-0 sticky top-[138px]">

            {/* Today's stats */}
            <div className="bg-white border border-[#e8e8e8] rounded-xl p-5 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
              <h3 className="text-[#1a1a1a] font-semibold text-sm mb-4">Today's Summary</h3>
              <div className="space-y-3">
                {[
                  { l: "Signals Generated", v: "12",    c: "#1a1a1a" },
                  { l: "BUY Signals",        v: "8",    c: "#00b386" },
                  { l: "SELL Signals",       v: "4",    c: "#e84040" },
                  { l: "High Confidence",    v: "5",    c: "#f59e0b" },
                  { l: "Avg Confidence",     v: "72%",  c: "#6366f1" },
                ].map(s => (
                  <div key={s.l} className="flex justify-between items-center">
                    <span className="text-[#6b7280] text-xs">{s.l}</span>
                    <span className="text-sm font-bold" style={{ color: s.c }}>{s.v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Accuracy */}
            <div className="bg-white border border-[#e8e8e8] rounded-xl p-5 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[#1a1a1a] font-semibold text-sm">AI Accuracy</h3>
                <span className="text-[#9ca3af] text-xs">30 days</span>
              </div>
              <div className="text-center mb-4">
                <div className="text-3xl font-bold text-[#00b386]">73%</div>
                <div className="text-[#9ca3af] text-xs mt-0.5">Win Rate</div>
              </div>
              <div className="space-y-2.5">
                {[
                  { label: "Technical",  v: 78, c: "#6366f1" },
                  { label: "Breakout",   v: 71, c: "#00b386" },
                  { label: "Reversal",   v: 68, c: "#f59e0b" },
                  { label: "News Driven",v: 64, c: "#3b82f6" },
                  { label: "Momentum",   v: 76, c: "#00b386" },
                ].map(m => (
                  <div key={m.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[#6b7280]">{m.label}</span>
                      <span className="font-semibold" style={{ color: m.c }}>{m.v}%</span>
                    </div>
                    <div className="h-1.5 bg-[#f0f0f0] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${m.v}%`, background: m.c }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Active signals by sector */}
            <div className="bg-white border border-[#e8e8e8] rounded-xl p-5 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
              <h3 className="text-[#1a1a1a] font-semibold text-sm mb-3">Active by Sector</h3>
              <div className="space-y-2">
                {Object.entries(
                  active.reduce((acc, s) => ({ ...acc, [s.sector]: (acc[s.sector] || 0) + 1 }), {} as Record<string, number>)
                ).sort((a, b) => b[1] - a[1]).map(([sector, count]) => (
                  <div key={sector} className="flex items-center justify-between">
                    <span className="text-[#6b7280] text-xs">{sector}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 bg-[#f0f0f0] rounded-full overflow-hidden">
                        <div className="h-full bg-[#00b386] rounded-full" style={{ width: `${(count / active.length) * 100}%` }} />
                      </div>
                      <span className="text-[#1a1a1a] text-xs font-semibold w-3">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════ PERFORMANCE ════════ */}
      {subTab === "Performance" && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {PERFORMANCE.map(p => (
              <div key={p.label} className="bg-white border border-[#e8e8e8] rounded-xl p-5 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
                <div className="text-[#9ca3af] text-xs mb-1">{p.label}</div>
                <div className="text-2xl font-bold tracking-tight" style={{ color: p.color }}>{p.value}</div>
              </div>
            ))}
          </div>

          {/* Outcome breakdown */}
          <div className="bg-white border border-[#e8e8e8] rounded-xl p-5 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
            <h3 className="text-[#1a1a1a] font-semibold text-sm mb-4">Signal Outcomes (Last 30 Days)</h3>
            <div className="flex items-center gap-3 mb-4">
              {[
                { label: "Target Hit",    pct: 73, color: "#00b386" },
                { label: "Stop Loss Hit", pct: 18, color: "#e84040" },
                { label: "Expired",       pct:  9, color: "#9ca3af" },
              ].map(b => (
                <div key={b.label} className="text-center">
                  <div className="text-2xl font-bold" style={{ color: b.color }}>{b.pct}%</div>
                  <div className="text-[#9ca3af] text-xs mt-0.5">{b.label}</div>
                </div>
              ))}
              {/* Stacked bar */}
              <div className="flex-1 h-4 rounded-full overflow-hidden flex ml-4">
                <div className="h-full bg-[#00b386]" style={{ width: "73%" }} />
                <div className="h-full bg-[#e84040]" style={{ width: "18%" }} />
                <div className="h-full bg-[#e8e8e8]" style={{ width: "9%"  }} />
              </div>
            </div>

            {/* By type table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#f0f0f0] text-xs text-[#9ca3af]">
                    {["Signal Type","Total","Target Hit","SL Hit","Expired","Win Rate","Avg R:R"].map(h => (
                      <th key={h} className={`py-2 font-medium ${h === "Signal Type" ? "text-left" : "text-right"}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { type: "Technical Confluence", total: 48, hit: 36, sl: 8,  exp: 4 },
                    { type: "Breakout",             total: 32, hit: 22, sl: 7,  exp: 3 },
                    { type: "Reversal",             total: 28, hit: 18, sl: 7,  exp: 3 },
                    { type: "News Driven",          total: 22, hit: 14, sl: 5,  exp: 3 },
                    { type: "Momentum",             total: 18, hit: 14, sl: 3,  exp: 1 },
                  ].map((r, i) => {
                    const wr = ((r.hit / r.total) * 100).toFixed(0);
                    const rr = (1.5 + i * 0.15).toFixed(1);
                    return (
                      <tr key={r.type} className={`${i < 4 ? "border-b border-[#f5f5f5]" : ""} hover:bg-[#f8f9fa] transition-colors`}>
                        <td className="py-3 text-[#1a1a1a] font-medium">{r.type}</td>
                        <td className="py-3 text-right text-[#6b7280]">{r.total}</td>
                        <td className="py-3 text-right text-[#00b386] font-semibold">{r.hit}</td>
                        <td className="py-3 text-right text-[#e84040]">{r.sl}</td>
                        <td className="py-3 text-right text-[#9ca3af]">{r.exp}</td>
                        <td className="py-3 text-right font-bold text-[#00b386]">{wr}%</td>
                        <td className="py-3 text-right text-[#f59e0b] font-semibold">{rr}×</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ════════ WATCHLIST ════════ */}
      {subTab === "Watchlist" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[#1a1a1a] font-semibold text-sm">Signal Watchlist</h2>
            <button className="px-4 py-2 rounded-lg bg-[#00b386] text-white text-sm font-semibold hover:bg-[#009e78] transition-colors">+ Add Symbol</button>
          </div>
          <div className="bg-white border border-[#e8e8e8] rounded-xl overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
            <div className="grid grid-cols-[2fr_72px_80px_1fr_1fr] px-5 py-2.5 bg-[#fafafa] border-b border-[#f0f0f0] text-xs text-[#9ca3af] font-medium">
              <span>Symbol</span><span className="text-center">Today</span><span className="text-center">Chart</span><span className="text-right">CMP</span><span className="text-right">Last Signal</span>
            </div>
            {signals.slice(0, 6).map((s, i) => (
              <Link key={s.id} href={`/dashboard/charts/${s.symbol}`}
                className={`grid grid-cols-[2fr_72px_80px_1fr_1fr] items-center px-5 py-4 hover:bg-[#f8f9fa] transition-colors ${i < 5 ? "border-b border-[#f5f5f5]" : ""}`}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl text-white text-xs font-bold flex items-center justify-center shrink-0" style={{ background: s.color }}>
                    {s.symbol.slice(0, 2)}
                  </div>
                  <div>
                    <div className="text-[#1a1a1a] font-semibold text-sm">{s.symbol}</div>
                    <div className="text-[#9ca3af] text-xs">{s.sector}</div>
                  </div>
                </div>
                <div className="flex justify-center">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${s.action === "BUY" ? "bg-[#e8f9f4] text-[#00b386]" : "bg-[#fef2f2] text-[#e84040]"}`}>{s.action}</span>
                </div>
                <div className="flex justify-center">
                  <Sparkline symbol={s.symbol} up={s.action === "BUY"} />
                </div>
                <div className="text-right text-[#1a1a1a] text-sm font-mono font-semibold">₹{s.entry.toLocaleString("en-IN")}</div>
                <div className="text-right">
                  <StatusBadge s={s.status} />
                  <div className="text-[#9ca3af] text-[10px] mt-0.5">{s.generatedAt}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

    </div>
    </div>
  );
}
