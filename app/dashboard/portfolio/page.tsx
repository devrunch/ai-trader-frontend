"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  getPaperPortfolio, getPaperPositions,
  type ApiPortfolioSummary, type ApiPosition,
} from "@/lib/api";

/* ─── Asset classes ─── */
const ASSETS = [
  { label: "Stocks",        value: 1_84_320,  invested: 1_62_450, color: "#00b386", icon: "ST", pct: 41.2 },
  { label: "Mutual Funds",  value:  98_540,   invested:  85_000,  color: "#6366f1", icon: "MF", pct: 22.1 },
  { label: "ETFs",          value:  52_180,   invested:  48_000,  color: "#3b82f6", icon: "ET", pct: 11.7 },
  { label: "F&O",           value:  38_600,   invested:  40_000,  color: "#f59e0b", icon: "FO", pct:  8.6 },
  { label: "Crypto",        value:  62_400,   invested:  45_000,  color: "#e84040", icon: "CR", pct: 14.0 },
  { label: "Bonds / NPS",   value:  10_500,   invested:  10_000,  color: "#8b5cf6", icon: "BD", pct:  2.4 },
];

const TOTAL_CURRENT  = ASSETS.reduce((s, a) => s + a.value,    0);
const TOTAL_INVESTED = ASSETS.reduce((s, a) => s + a.invested, 0);
const TOTAL_PNL      = TOTAL_CURRENT - TOTAL_INVESTED;
const TOTAL_PCT      = (TOTAL_PNL / TOTAL_INVESTED) * 100;

/* ─── Donut ─── */
function AssetDonut() {
  const R = 56, cx = 68, cy = 68, strokeW = 20, circ = 2 * Math.PI * R;
  let offset = 0;
  const slices = ASSETS.map(a => {
    const pct  = a.value / TOTAL_CURRENT;
    const dash = pct * circ;
    const s    = { ...a, pct, dash, offset };
    offset    += dash;
    return s;
  });
  return (
    <div className="flex items-center gap-6">
      <svg width="136" height="136" viewBox="0 0 136 136" className="shrink-0">
        {slices.map((s, i) => (
          <circle key={i} cx={cx} cy={cy} r={R} fill="none" stroke={s.color}
            strokeWidth={strokeW} strokeDasharray={`${s.dash} ${circ - s.dash}`}
            strokeDashoffset={-s.offset} transform={`rotate(-90 ${cx} ${cy})`} />
        ))}
        <circle cx={cx} cy={cy} r={R - strokeW / 2 - 3} fill="white" />
        <text x={cx} y={cy - 6}  textAnchor="middle" fill="#1a1a1a" fontSize="13" fontWeight="700">₹{(TOTAL_CURRENT/100000).toFixed(1)}L</text>
        <text x={cx} y={cy + 10} textAnchor="middle" fill="#9ca3af" fontSize="9">total value</text>
      </svg>
      <div className="space-y-2 flex-1">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
            <span className="text-[#6b7280] text-xs flex-1">{s.label}</span>
            <span className="text-[#1a1a1a] text-xs font-semibold">₹{s.value.toLocaleString("en-IN")}</span>
            <span className="text-[#9ca3af] text-xs w-10 text-right">{s.pct.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Portfolio performance chart ─── */
function PortfolioChart({ period }: { period: string }) {
  const W = 700, H = 120, pad = 8;
  const points = { "1M": 30, "3M": 90, "6M": 180, "1Y": 365, "All": 500 };
  const n = points[period as keyof typeof points] ?? 30;
  const sr = (s: number) => { const x = Math.sin(s * 0.31 + 7) * 10000; return x - Math.floor(x); };
  const data = Array.from({ length: n }, (_, i) => {
    const trend = TOTAL_INVESTED * (0.88 + (i / n) * 0.18);
    return trend + (sr(i + 1) - 0.45) * TOTAL_INVESTED * 0.025;
  });
  const min = Math.min(...data), max = Math.max(...data), range = max - min || 1;
  const gX = (i: number) => pad + (i / (data.length - 1)) * (W - pad * 2);
  const gY = (v: number) => pad + (H - pad * 2) - ((v - min) / range) * (H - pad * 2);
  const pts = data.map((v, i) => `${gX(i).toFixed(1)},${gY(v).toFixed(1)}`);
  const line = `M ${pts.join(" L ")}`;
  const area = `${line} L ${gX(n-1).toFixed(1)},${H} L ${pad},${H} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 120 }} preserveAspectRatio="none">
      <defs>
        <linearGradient id="port-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#00b386" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#00b386" stopOpacity="0"    />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#port-grad)" />
      <path d={line}  fill="none" stroke="#00b386" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ─── Recent transactions ─── */
const TXN = [
  { date: "05 Jun", type: "BUY",  asset: "TATACAP",         cat: "Stocks",       amount: 6182, qty: "20 shares"  },
  { date: "04 Jun", type: "SIP",  asset: "Mirae Asset ELSS",cat: "Mutual Funds", amount: 5000, qty: "₹5,000 SIP" },
  { date: "03 Jun", type: "SELL", asset: "INFY",            cat: "Stocks",       amount: 19200,qty: "10 shares"  },
  { date: "02 Jun", type: "BUY",  asset: "HDFCBANK",        cat: "Stocks",       amount: 5202, qty: "3 shares"   },
  { date: "01 Jun", type: "BUY",  asset: "BTC-USDT",        cat: "Crypto",       amount: 8400, qty: "0.001 BTC"  },
  { date: "30 May", type: "SIP",  asset: "Nifty 50 ETF",    cat: "ETFs",         amount: 2000, qty: "₹2,000 SIP" },
];

/* ─── Monthly activity ─── */
const MONTHLY = [
  { m: "Jan", buys: 4, sells: 1, vol: 48000  },
  { m: "Feb", buys: 6, sells: 2, vol: 73000  },
  { m: "Mar", buys: 3, sells: 3, vol: 55000  },
  { m: "Apr", buys: 8, sells: 2, vol: 1_04000 },
  { m: "May", buys: 7, sells: 4, vol: 92000  },
  { m: "Jun", buys: 5, sells: 2, vol: 41000  },
];

const CAT_COLORS: Record<string, string> = {
  "Stocks": "#00b386", "Mutual Funds": "#6366f1",
  "ETFs": "#3b82f6", "Crypto": "#e84040", "Bonds / NPS": "#8b5cf6", "F&O": "#f59e0b",
};

export default function PortfolioPage() {
  const [period, setPeriod] = useState("1M");
  const [paper,     setPaper]     = useState<ApiPortfolioSummary | null>(null);
  const [positions, setPositions] = useState<ApiPosition[]>([]);
  const [paperLoading, setPaperLoading] = useState(true);

  useEffect(() => {
    Promise.all([getPaperPortfolio(), getPaperPositions()])
      .then(([summary, pos]) => {
        setPaper(summary);
        setPositions(pos);
      })
      .catch(() => {/* API not available — section stays empty */})
      .finally(() => setPaperLoading(false));
  }, []);

  const PERIODS = ["1M","3M","6M","1Y","All"];

  return (
    <div className="h-full overflow-y-auto no-scrollbar">
      <div className="max-w-[1400px] py-6 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-[#1a1a1a]">Portfolio Overview</h1>
          <Link href="/dashboard/holdings" className="text-[#00b386] text-sm font-medium hover:underline">
            View Holdings →
          </Link>
        </div>

        {/* ── Top summary row ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Portfolio",  value: `₹${(TOTAL_CURRENT/100000).toFixed(2)}L`,    sub: `₹${(TOTAL_INVESTED/100000).toFixed(2)}L invested`, color: "#1a1a1a" },
            { label: "Total P&L",        value: `+₹${(TOTAL_PNL/1000).toFixed(1)}K`,         sub: `+${TOTAL_PCT.toFixed(2)}% all time`,               color: "#00b386" },
            { label: "1D Change",        value: "+₹1,248",                                   sub: "+0.28% today",                                     color: "#00b386" },
            { label: "Trades (30d)",     value: "23",                                        sub: "16 buy · 7 sell",                                  color: "#f59e0b" },
          ].map(c => (
            <div key={c.label} className="bg-white border border-[#e8e8e8] rounded-xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
              <div className="text-[#9ca3af] text-xs mb-1">{c.label}</div>
              <div className="text-xl font-bold tracking-tight" style={{ color: c.color }}>{c.value}</div>
              <div className="text-[#9ca3af] text-xs mt-0.5">{c.sub}</div>
            </div>
          ))}
        </div>

        {/* ── Portfolio chart + allocation ── */}
        <div className="grid xl:grid-cols-[1fr_380px] gap-5">

          {/* Chart */}
          <div className="bg-white border border-[#e8e8e8] rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.04)] overflow-hidden">
            <div className="px-5 pt-5 pb-2 flex items-center justify-between">
              <div>
                <div className="text-[#9ca3af] text-xs">Portfolio value</div>
                <div className="text-2xl font-bold text-[#1a1a1a] tracking-tight">₹{TOTAL_CURRENT.toLocaleString("en-IN")}</div>
              </div>
              <div className="flex gap-1">
                {PERIODS.map(p => (
                  <button key={p} onClick={() => setPeriod(p)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${period === p ? "bg-[#00b386] text-white" : "text-[#6b7280] hover:bg-[#f8f9fa]"}`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div className="px-2 pb-2">
              <PortfolioChart period={period} />
            </div>
            <div className="px-5 pb-4 flex gap-6 flex-wrap">
              {[
                { l: "1M returns",  v: "+3.4%",  c: "#00b386" },
                { l: "3M returns",  v: "+7.8%",  c: "#00b386" },
                { l: "6M returns",  v: "+11.2%", c: "#00b386" },
                { l: "1Y returns",  v: "+18.6%", c: "#00b386" },
                { l: "XIRR (est.)", v: "14.8%",  c: "#6366f1" },
              ].map(m => (
                <div key={m.l}>
                  <div className="text-[#9ca3af] text-[10px]">{m.l}</div>
                  <div className="text-sm font-bold" style={{ color: m.c }}>{m.v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Allocation donut */}
          <div className="bg-white border border-[#e8e8e8] rounded-xl p-5 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
            <h3 className="text-[#1a1a1a] font-semibold text-sm mb-4">Asset Allocation</h3>
            <AssetDonut />
          </div>
        </div>

        {/* ── Asset class cards ── */}
        <div>
          <h2 className="text-[#1a1a1a] font-semibold text-sm mb-3">By Asset Class</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
            {ASSETS.map(a => {
              const pnl = a.value - a.invested;
              const pct = (pnl / a.invested) * 100;
              const up  = pnl >= 0;
              return (
                <div key={a.label} className="bg-white border border-[#e8e8e8] rounded-xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.04)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)] transition-shadow">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ background: a.color }}>
                      {a.icon}
                    </div>
                    <span className="text-[#6b7280] text-xs font-medium">{a.label}</span>
                  </div>
                  <div className="text-[#1a1a1a] text-base font-bold">₹{(a.value/1000).toFixed(1)}K</div>
                  <div className={`text-xs font-semibold mt-0.5 ${up ? "text-[#00b386]" : "text-[#e84040]"}`}>
                    {up ? "+" : ""}{pct.toFixed(1)}%
                  </div>
                  <div className="text-[#9ca3af] text-[10px] mt-1">{a.pct}% of portfolio</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Activity + Transactions ── */}
        <div className="grid xl:grid-cols-[1fr_360px] gap-5">

          {/* Monthly activity bar chart */}
          <div className="bg-white border border-[#e8e8e8] rounded-xl p-5 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[#1a1a1a] font-semibold text-sm">Trading Activity</h3>
              <span className="text-[#9ca3af] text-xs">Last 6 months</span>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { l: "Total trades",   v: "23",      c: "#1a1a1a" },
                { l: "Total buy vol",  v: "₹4.13L",  c: "#00b386" },
                { l: "Total sell vol", v: "₹1.92L",  c: "#e84040" },
              ].map(s => (
                <div key={s.l} className="bg-[#f8f9fa] rounded-lg p-3">
                  <div className="text-[#9ca3af] text-xs mb-1">{s.l}</div>
                  <div className="text-sm font-bold" style={{ color: s.c }}>{s.v}</div>
                </div>
              ))}
            </div>

            {/* Bar chart */}
            <div className="flex items-end gap-3">
              {MONTHLY.map(m => {
                const maxVol = Math.max(...MONTHLY.map(x => x.vol));
                const h = (m.vol / maxVol) * 80;
                return (
                  <div key={m.m} className="flex-1 flex flex-col items-center gap-1">
                    <div className="text-[#9ca3af] text-[10px] font-mono">₹{(m.vol/1000).toFixed(0)}K</div>
                    <div className="w-full rounded-t-md bg-[#e8f9f4]" style={{ height: h }}>
                      <div className="w-full rounded-t-md bg-[#00b386]" style={{ height: `${(m.buys/(m.buys+m.sells))*100}%` }} />
                    </div>
                    <div className="text-[#6b7280] text-[10px]">{m.m}</div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#00b386]" /><span className="text-[#6b7280] text-xs">Buy</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#e8f9f4]" /><span className="text-[#6b7280] text-xs">Sell</span></div>
            </div>
          </div>

          {/* Recent transactions */}
          <div className="bg-white border border-[#e8e8e8] rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.04)] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#f0f0f0] flex items-center justify-between">
              <h3 className="text-[#1a1a1a] font-semibold text-sm">Recent Transactions</h3>
              <span className="text-[#9ca3af] text-xs">June 2026</span>
            </div>
            {TXN.map((t, i) => (
              <div key={i} className={`flex items-center gap-3 px-5 py-3.5 hover:bg-[#f8f9fa] transition-colors ${i < TXN.length-1 ? "border-b border-[#f5f5f5]" : ""}`}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                  style={{ background: CAT_COLORS[t.cat] ?? "#6b7280" }}>
                  {t.cat.slice(0,2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#1a1a1a] text-sm font-semibold truncate">{t.asset}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                      t.type === "BUY"  ? "bg-[#e8f9f4] text-[#00b386]" :
                      t.type === "SELL" ? "bg-[#fef2f2] text-[#e84040]" :
                      "bg-[#eff6ff] text-[#3b82f6]"
                    }`}>{t.type}</span>
                  </div>
                  <div className="text-[#9ca3af] text-xs mt-0.5">{t.qty} · {t.date}</div>
                </div>
                <div className={`text-sm font-bold shrink-0 ${t.type === "SELL" ? "text-[#00b386]" : "text-[#1a1a1a]"}`}>
                  {t.type === "SELL" ? "+" : "-"}₹{t.amount.toLocaleString("en-IN")}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Returns comparison ── */}
        <div className="bg-white border border-[#e8e8e8] rounded-xl p-5 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
          <h3 className="text-[#1a1a1a] font-semibold text-sm mb-4">Returns vs Benchmarks</h3>
          <div className="space-y-3">
            {[
              { l: "Your Portfolio",  v: 18.6, c: "#00b386" },
              { l: "Nifty 50",        v: 12.4, c: "#6b7280" },
              { l: "Sensex",          v: 11.8, c: "#6b7280" },
              { l: "Nifty Midcap",    v: 15.2, c: "#6b7280" },
              { l: "Fixed Deposit",   v:  7.1, c: "#9ca3af" },
            ].map(r => (
              <div key={r.l} className="flex items-center gap-3">
                <span className="text-[#6b7280] text-xs w-32 shrink-0">{r.l}</span>
                <div className="flex-1 h-2 bg-[#f0f0f0] rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(r.v/25)*100}%`, background: r.c }} />
                </div>
                <span className="text-sm font-bold w-12 text-right" style={{ color: r.c }}>{r.v}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Paper Trading ── */}
        <div className="bg-white border border-[#e8e8e8] rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#f0f0f0] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-[#1a1a1a] font-semibold text-sm">Paper Trading</h3>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#eff6ff] text-[#3b82f6]">SIMULATED</span>
            </div>
            {paper && (
              <span className={`text-sm font-bold ${paper.totalPnl >= 0 ? "text-[#00b386]" : "text-[#e84040]"}`}>
                {paper.totalPnl >= 0 ? "+" : ""}₹{paper.totalPnl.toLocaleString("en-IN")} ({paper.pnlPct >= 0 ? "+" : ""}{paper.pnlPct.toFixed(2)}%)
              </span>
            )}
          </div>

          {paperLoading ? (
            <div className="px-5 py-8 text-center text-[#9ca3af] text-sm">Loading paper positions…</div>
          ) : !paper || positions.length === 0 ? (
            <div className="px-5 py-8 text-center text-[#9ca3af] text-sm">No paper positions yet. Place a simulated trade to get started.</div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-px bg-[#f0f0f0]">
                {[
                  { l: "Invested",      v: `₹${paper.totalInvested.toLocaleString("en-IN")}` },
                  { l: "Current Value", v: `₹${paper.currentValue.toLocaleString("en-IN")}` },
                  { l: "Total P&L",     v: `${paper.totalPnl >= 0 ? "+" : ""}₹${paper.totalPnl.toLocaleString("en-IN")}` },
                ].map(s => (
                  <div key={s.l} className="bg-[#fafafa] px-4 py-3">
                    <div className="text-[#9ca3af] text-xs">{s.l}</div>
                    <div className="text-[#1a1a1a] text-sm font-bold mt-0.5">{s.v}</div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] px-5 py-2 bg-[#fafafa] border-b border-[#f0f0f0] text-xs text-[#9ca3af] font-medium">
                <span>Symbol</span><span className="text-right">Qty</span><span className="text-right">Avg Cost</span><span className="text-right">LTP</span><span className="text-right">P&amp;L</span>
              </div>
              {positions.map((p, i) => {
                const up  = p.unrealisedPnl >= 0;
                const pct = p.averageCost > 0
                  ? (p.unrealisedPnl / (p.averageCost * p.quantity)) * 100
                  : 0;
                return (
                  <div key={p._id} className={`grid grid-cols-[2fr_1fr_1fr_1fr_1fr] items-center px-5 py-3.5 ${i < positions.length - 1 ? "border-b border-[#f5f5f5]" : ""} hover:bg-[#f8f9fa] transition-colors`}>
                    <div>
                      <div className="text-[#1a1a1a] text-sm font-semibold">{p.symbol}</div>
                      <div className="text-[#9ca3af] text-xs">{p.exchange}</div>
                    </div>
                    <div className="text-right text-sm text-[#1a1a1a]">{p.quantity}</div>
                    <div className="text-right text-sm text-[#1a1a1a]">₹{p.averageCost.toLocaleString("en-IN")}</div>
                    <div className="text-right text-sm text-[#1a1a1a]">₹{p.currentPrice.toLocaleString("en-IN")}</div>
                    <div className={`text-right text-sm font-semibold ${up ? "text-[#00b386]" : "text-[#e84040]"}`}>
                      {up ? "+" : ""}₹{p.unrealisedPnl.toLocaleString("en-IN")}
                      <div className="text-[10px] font-normal">{up ? "+" : ""}{pct.toFixed(2)}%</div>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>

      </div>
    </div>
  );
}
