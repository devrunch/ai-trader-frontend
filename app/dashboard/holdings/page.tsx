"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getHoldings, clearHoldings, type Holding } from "@/lib/portfolioStore";

const CMP: Record<string, number> = {
  TATACAP: 309.10, AVNSM: 4168.00, APOLLOHOSP: 8292.00,
  UNIONBANK: 166.89, CANARABANK: 131.83, TATAMOTORS: 398.20,
  RELIANCE: 2847.50, HDFCBANK: 1734.20, INFY: 1892.00,
  TCS: 3944.50, WIPRO: 472.80,
};

const DAY_CHG: Record<string, number> = {
  TCS: 1.40, WIPRO: -1.54, RELIANCE: 0.62, TATACAP: 2.78,
  HDFCBANK: 1.99, INFY: -1.48, AVNSM: 2.74, APOLLOHOSP: 2.50,
  UNIONBANK: 2.59, CANARABANK: 2.13, TATAMOTORS: 2.05,
};

const LOGO_COLORS: Record<string, string> = {
  TCS: "#0052cc", WIPRO: "#7b2d8b", RELIANCE: "#0070ba",
  TATACAP: "#1c3f6e", HDFCBANK: "#e4002b", INFY: "#007cc3",
  AVNSM: "#00529b", APOLLOHOSP: "#0077c8", UNIONBANK: "#003087",
  CANARABANK: "#fdb714", TATAMOTORS: "#00205b",
};

const SEED_HOLDINGS: Holding[] = [
  { symbol: "TCS",       name: "Tata Consultancy Services", qty: 10, avgPrice: 3890.00, exchange: "NSE", type: "Delivery", purchasedAt: "2026-05-01T09:17:00Z" },
  { symbol: "WIPRO",     name: "Wipro Ltd",                 qty: 25, avgPrice: 480.20,  exchange: "NSE", type: "Delivery", purchasedAt: "2026-05-02T09:20:00Z" },
  { symbol: "RELIANCE",  name: "Reliance Industries",       qty:  5, avgPrice: 2830.00, exchange: "NSE", type: "Delivery", purchasedAt: "2026-05-10T09:47:00Z" },
  { symbol: "TATACAP",   name: "Tata Capital",              qty: 20, avgPrice: 295.00,  exchange: "NSE", type: "Delivery", purchasedAt: "2026-05-15T09:30:00Z" },
  { symbol: "HDFCBANK",  name: "HDFC Bank",                 qty:  3, avgPrice: 1695.00, exchange: "NSE", type: "Intraday", purchasedAt: "2026-06-03T10:12:00Z" },
  { symbol: "INFY",      name: "Infosys",                   qty: 10, avgPrice: 1920.00, exchange: "NSE", type: "Intraday", purchasedAt: "2026-06-03T10:35:00Z" },
  { symbol: "APOLLOHOSP",name: "Apollo Hospitals",          qty:  2, avgPrice: 8150.00, exchange: "NSE", type: "Delivery", purchasedAt: "2026-04-22T09:15:00Z" },
  { symbol: "TATAMOTORS",name: "Tata Motors",               qty: 15, avgPrice: 385.00,  exchange: "NSE", type: "Delivery", purchasedAt: "2026-04-18T10:00:00Z" },
];

function Sparkline({ symbol, up }: { symbol: string; up: boolean }) {
  const seed = symbol.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const sr = (s: number) => { const x = Math.sin(s * seed + 1) * 10000; return x - Math.floor(x); };
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
        <linearGradient id={`hg-${symbol}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={c} stopOpacity="0.15" />
          <stop offset="100%" stopColor={c} stopOpacity="0"    />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#hg-${symbol})`} />
      <path d={line} fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AllocationDonut({ holdings }: { holdings: Holding[] }) {
  const COLORS = ["#00b386","#6366f1","#f59e0b","#3b82f6","#e84040","#8b5cf6","#ec4899","#14b8a6"];
  const total = holdings.reduce((s, h) => s + h.qty * (CMP[h.symbol] ?? h.avgPrice), 0);
  if (total === 0) return <p className="text-[#9ca3af] text-xs">No data</p>;
  let offset = 0;
  const R = 36, cx = 44, cy = 44, strokeW = 14, circ = 2 * Math.PI * R;
  const slices = holdings.map((h, i) => {
    const val = h.qty * (CMP[h.symbol] ?? h.avgPrice);
    const pct = val / total;
    const dash = pct * circ;
    const slice = { h, pct, dash, offset, color: COLORS[i % COLORS.length] };
    offset += dash;
    return slice;
  });
  return (
    <div className="flex items-center gap-4">
      <svg width="88" height="88" viewBox="0 0 88 88" className="shrink-0">
        {slices.map((s, i) => (
          <circle key={i} cx={cx} cy={cy} r={R} fill="none" stroke={s.color}
            strokeWidth={strokeW} strokeDasharray={`${s.dash} ${circ - s.dash}`}
            strokeDashoffset={-s.offset} transform={`rotate(-90 ${cx} ${cy})`} />
        ))}
        <circle cx={cx} cy={cy} r={R - strokeW / 2 - 2} fill="white" />
      </svg>
      <div className="space-y-1.5 flex-1 min-w-0">
        {slices.slice(0, 5).map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
            <span className="text-[#1a1a1a] text-xs truncate flex-1">{s.h.symbol}</span>
            <span className="text-[#6b7280] text-xs shrink-0">{(s.pct * 100).toFixed(1)}%</span>
          </div>
        ))}
        {slices.length > 5 && <div className="text-[#9ca3af] text-xs">+{slices.length - 5} more</div>}
      </div>
    </div>
  );
}

export default function HoldingsPage() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [tab, setTab]           = useState<"Delivery" | "Intraday">("Delivery");
  const [loaded, setLoaded]     = useState(false);
  const [sort, setSort]         = useState<"value" | "pnl" | "name">("value");

  useEffect(() => {
    const h = getHoldings();
    setHoldings(h.length > 0 ? h : SEED_HOLDINGS);
    setLoaded(true);
  }, []);

  const delivery = holdings.filter(h => h.type === "Delivery");
  const intraday = holdings.filter(h => h.type === "Intraday");
  const displayed = (tab === "Delivery" ? delivery : intraday).slice().sort((a, b) => {
    if (sort === "name") return a.name.localeCompare(b.name);
    if (sort === "pnl") {
      const pA = ((CMP[a.symbol] ?? a.avgPrice) - a.avgPrice) * a.qty;
      const pB = ((CMP[b.symbol] ?? b.avgPrice) - b.avgPrice) * b.qty;
      return pB - pA;
    }
    return (CMP[b.symbol] ?? b.avgPrice) * b.qty - (CMP[a.symbol] ?? a.avgPrice) * a.qty;
  });

  const totalInvested = delivery.reduce((s, h) => s + h.qty * h.avgPrice, 0);
  const totalCurrent  = delivery.reduce((s, h) => s + h.qty * (CMP[h.symbol] ?? h.avgPrice), 0);
  const totalPnL      = totalCurrent - totalInvested;
  const totalPct      = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;
  const oneDayPnL     = delivery.reduce((s, h) => {
    const cmp = CMP[h.symbol] ?? h.avgPrice;
    return s + cmp * h.qty * ((DAY_CHG[h.symbol] ?? 0) / 100);
  }, 0);
  const oneDayPct = totalCurrent > 0 ? (oneDayPnL / totalCurrent) * 100 : 0;

  const gainers = [...delivery].filter(h => (CMP[h.symbol] ?? h.avgPrice) > h.avgPrice).length;
  const losers  = delivery.length - gainers;

  if (!loaded) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-[#6b7280] text-sm">Loading holdings…</div>
    </div>
  );

  return (
    <div className="h-full overflow-y-auto no-scrollbar">
      <div className="flex gap-6 items-start max-w-[1400px] py-6">

        {/* ── Left ── */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* Header */}
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-[#1a1a1a]">Holdings</h1>
            <div className="flex items-center gap-3">
              <button onClick={() => { clearHoldings(); setHoldings(SEED_HOLDINGS); }}
                className="text-xs text-[#9ca3af] hover:text-[#e84040] transition-colors">Reset demo</button>
              <Link href="/dashboard/charts/TATACAP"
                className="px-4 py-2 rounded-lg bg-[#00b386] text-white text-sm font-semibold hover:bg-[#009e78] transition-colors">
                + Buy stocks
              </Link>
            </div>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Current value",  value: `₹${totalCurrent.toLocaleString("en-IN",{maximumFractionDigits:0})}`, sub: `Invested ₹${totalInvested.toLocaleString("en-IN",{maximumFractionDigits:0})}`, color: "#1a1a1a" },
              { label: "Total P&L",      value: `${totalPnL>=0?"+":""}₹${Math.abs(totalPnL).toLocaleString("en-IN",{maximumFractionDigits:0})}`, sub: `${totalPct>=0?"+":""}${totalPct.toFixed(2)}% overall`, color: totalPnL>=0?"#00b386":"#e84040" },
              { label: "1D P&L",         value: `${oneDayPnL>=0?"+":""}₹${Math.abs(oneDayPnL).toLocaleString("en-IN",{maximumFractionDigits:0})}`, sub: `${oneDayPct>=0?"+":""}${oneDayPct.toFixed(2)}% today`, color: oneDayPnL>=0?"#00b386":"#e84040" },
              { label: "Gainers / Losers", value: `${gainers} / ${losers}`, sub: `of ${delivery.length} holdings`, color: "#f59e0b" },
            ].map(c => (
              <div key={c.label} className="bg-white border border-[#e8e8e8] rounded-xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
                <div className="text-[#9ca3af] text-xs mb-1">{c.label}</div>
                <div className="text-lg font-bold tracking-tight" style={{ color: c.color }}>{c.value}</div>
                <div className="text-[#9ca3af] text-xs mt-0.5">{c.sub}</div>
              </div>
            ))}
          </div>

          {/* Holdings table */}
          <div className="bg-white border border-[#e8e8e8] rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.04)] overflow-hidden">

            {/* Tab + sort bar */}
            <div className="flex items-center border-b border-[#e8e8e8] px-4">
              {(["Delivery","Intraday"] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`py-3.5 px-2 mr-4 text-sm font-medium border-b-2 transition-colors ${
                    tab === t ? "text-[#00b386] border-[#00b386]" : "text-[#6b7280] border-transparent hover:text-[#1a1a1a]"
                  }`}>
                  {t}
                  <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${tab === t ? "bg-[#e8f9f4] text-[#00b386]" : "bg-[#f0f0f0] text-[#6b7280]"}`}>
                    {t === "Delivery" ? delivery.length : intraday.length}
                  </span>
                </button>
              ))}
              <div className="ml-auto flex items-center gap-1 py-3">
                <span className="text-[#9ca3af] text-xs mr-1">Sort:</span>
                {(["value","pnl","name"] as const).map(s => (
                  <button key={s} onClick={() => setSort(s)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${sort === s ? "bg-[#e8f9f4] text-[#00b386]" : "text-[#6b7280] hover:bg-[#f8f9fa]"}`}>
                    {s === "value" ? "Value" : s === "pnl" ? "P&L" : "Name"}
                  </button>
                ))}
              </div>
            </div>

            {/* Column headers */}
            <div className="grid grid-cols-[1.8fr_72px_1fr_1fr_1fr] px-5 py-2.5 bg-[#fafafa] border-b border-[#f0f0f0] text-xs text-[#9ca3af] font-medium">
              <span>Company</span>
              <span className="text-center">Chart</span>
              <span className="text-right">Avg Buy / CMP</span>
              <span className="text-right">Current value</span>
              <span className="text-right pr-1">P&L</span>
            </div>

            {displayed.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d0d0d0" strokeWidth="1.5" className="mb-3">
                  <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
                </svg>
                <p className="text-[#9ca3af] text-sm mb-4">No {tab.toLowerCase()} holdings.</p>
                <Link href="/dashboard" className="px-4 py-2 rounded-lg bg-[#00b386] text-white text-sm font-semibold hover:bg-[#009e78] transition-colors">
                  Explore Stocks
                </Link>
              </div>
            ) : (
              <>
                {displayed.map((h, i) => {
                  const cmp      = CMP[h.symbol] ?? h.avgPrice;
                  const pnl      = (cmp - h.avgPrice) * h.qty;
                  const pct      = ((cmp - h.avgPrice) / h.avgPrice) * 100;
                  const dayChg   = DAY_CHG[h.symbol] ?? 0;
                  const up       = pct >= 0;
                  const logoBg   = LOGO_COLORS[h.symbol] ?? "#6b7280";
                  const invested = h.avgPrice * h.qty;
                  const current  = cmp * h.qty;

                  return (
                    <Link key={`${h.symbol}-${i}`} href={`/dashboard/charts/${h.symbol}`}
                      className={`grid grid-cols-[1.8fr_72px_1fr_1fr_1fr] items-center px-5 py-4 hover:bg-[#f8f9fa] transition-colors ${i < displayed.length - 1 ? "border-b border-[#f5f5f5]" : ""}`}>

                      {/* Company */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0" style={{ background: logoBg }}>
                          {h.symbol.slice(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[#1a1a1a] font-semibold text-sm leading-tight truncate">{h.name}</div>
                          <div className="text-[#9ca3af] text-xs mt-0.5">{h.qty} shares · NSE</div>
                        </div>
                      </div>

                      {/* Chart */}
                      <div className="flex justify-center">
                        <Sparkline symbol={h.symbol} up={up} />
                      </div>

                      {/* Avg buy / CMP */}
                      <div className="text-right">
                        <div className="text-[#1a1a1a] text-sm font-semibold font-mono">₹{cmp.toLocaleString("en-IN",{minimumFractionDigits:2})}</div>
                        <div className="text-[#9ca3af] text-xs mt-0.5">avg ₹{h.avgPrice.toLocaleString("en-IN",{minimumFractionDigits:2})}</div>
                        <div className={`text-xs font-medium mt-0.5 ${dayChg >= 0 ? "text-[#00b386]" : "text-[#e84040]"}`}>
                          {dayChg >= 0 ? "+" : ""}{dayChg.toFixed(2)}% today
                        </div>
                      </div>

                      {/* Current value */}
                      <div className="text-right">
                        <div className="text-[#1a1a1a] text-sm font-semibold font-mono">₹{current.toLocaleString("en-IN",{maximumFractionDigits:0})}</div>
                        <div className="text-[#9ca3af] text-xs mt-0.5">₹{invested.toLocaleString("en-IN",{maximumFractionDigits:0})} invested</div>
                      </div>

                      {/* P&L */}
                      <div className="text-right pr-1">
                        <div className={`text-sm font-bold ${up ? "text-[#00b386]" : "text-[#e84040]"}`}>
                          {up ? "+" : ""}₹{Math.abs(pnl).toLocaleString("en-IN",{maximumFractionDigits:0})}
                        </div>
                        <div className={`text-xs font-semibold mt-0.5 px-1.5 py-0.5 rounded-full inline-block ${up ? "bg-[#e8f9f4] text-[#00b386]" : "bg-[#fef2f2] text-[#e84040]"}`}>
                          {up ? "+" : ""}{pct.toFixed(2)}%
                        </div>
                      </div>
                    </Link>
                  );
                })}

                {/* Footer totals */}
                <div className="grid grid-cols-[1.8fr_72px_1fr_1fr_1fr] px-5 py-3.5 bg-[#fafafa] border-t border-[#e8e8e8] text-xs">
                  <span className="text-[#6b7280] font-semibold">{displayed.length} stocks</span>
                  <span />
                  <span />
                  <div className="text-right">
                    <div className="text-[#1a1a1a] font-bold">₹{displayed.reduce((s,h) => s + h.qty*(CMP[h.symbol]??h.avgPrice),0).toLocaleString("en-IN",{maximumFractionDigits:0})}</div>
                    <div className="text-[#9ca3af] text-[10px]">total current</div>
                  </div>
                  <div className="text-right pr-1">
                    <div className={`font-bold ${totalPnL>=0?"text-[#00b386]":"text-[#e84040]"}`}>
                      {totalPnL>=0?"+":""}₹{Math.abs(totalPnL).toLocaleString("en-IN",{maximumFractionDigits:0})}
                    </div>
                    <div className={`text-[10px] font-medium ${totalPnL>=0?"text-[#00b386]":"text-[#e84040]"}`}>
                      {totalPct>=0?"+":""}{totalPct.toFixed(2)}%
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Right sidebar ── */}
        <div className="hidden xl:flex flex-col gap-4 w-[280px] shrink-0 sticky top-[138px]">

          {/* P&L breakdown */}
          <div className="bg-white border border-[#e8e8e8] rounded-xl p-5 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
            <h3 className="text-[#1a1a1a] font-semibold text-sm mb-4">P&L Breakdown</h3>
            <div className="space-y-3">
              {[
                { l: "Unrealised P&L",  v: `${totalPnL>=0?"+":""}₹${Math.abs(totalPnL).toLocaleString("en-IN",{maximumFractionDigits:0})}`, c: totalPnL>=0?"#00b386":"#e84040" },
                { l: "1D change",       v: `${oneDayPnL>=0?"+":""}₹${Math.abs(oneDayPnL).toLocaleString("en-IN",{maximumFractionDigits:0})}`, c: oneDayPnL>=0?"#00b386":"#e84040" },
                { l: "Stocks gaining",  v: `${gainers}`,  c: "#00b386" },
                { l: "Stocks losing",   v: `${losers}`,   c: losers > 0 ? "#e84040" : "#9ca3af" },
                { l: "XIRR (est.)",     v: "14.8%",       c: "#00b386" },
              ].map(s => (
                <div key={s.l} className="flex justify-between items-center">
                  <span className="text-[#6b7280] text-xs">{s.l}</span>
                  <span className="text-sm font-bold" style={{ color: s.c }}>{s.v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Allocation donut */}
          <div className="bg-white border border-[#e8e8e8] rounded-xl p-5 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
            <h3 className="text-[#1a1a1a] font-semibold text-sm mb-4">Stock Allocation</h3>
            <AllocationDonut holdings={tab === "Delivery" ? delivery : intraday} />
          </div>

          {/* Top performer */}
          <div className="bg-white border border-[#e8e8e8] rounded-xl p-5 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
            <h3 className="text-[#1a1a1a] font-semibold text-sm mb-3">Leaders</h3>
            {(() => {
              const sorted = [...delivery].sort((a,b) => {
                const pa = ((CMP[a.symbol]??a.avgPrice)-a.avgPrice)/a.avgPrice;
                const pb = ((CMP[b.symbol]??b.avgPrice)-b.avgPrice)/b.avgPrice;
                return pb - pa;
              });
              const top3 = sorted.slice(0, 3);
              const bot2 = sorted.slice(-2).reverse();
              return (
                <div className="space-y-2.5">
                  {[...top3, ...bot2].map((h, i) => {
                    const pct = ((CMP[h.symbol]??h.avgPrice)-h.avgPrice)/h.avgPrice*100;
                    const up  = pct >= 0;
                    return (
                      <div key={h.symbol+i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-[9px] font-bold shrink-0"
                            style={{ background: LOGO_COLORS[h.symbol]??"#6b7280" }}>
                            {h.symbol.slice(0,2)}
                          </div>
                          <span className="text-[#1a1a1a] text-xs font-medium">{h.symbol}</span>
                        </div>
                        <span className={`text-xs font-bold ${up?"text-[#00b386]":"text-[#e84040]"}`}>
                          {up?"+":""}{pct.toFixed(2)}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

        </div>
      </div>
    </div>
  );
}
