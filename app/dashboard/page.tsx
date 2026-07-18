"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  getPaperPortfolio, getPaperPositions, getSignals,
  type ApiPortfolioSummary, type ApiPosition, type ApiSignal,
} from "@/lib/api";

/* ─── Mini sparkline ─── */
function Spark({ vals, up }: { vals: number[]; up: boolean }) {
  const W = 72, H = 28;
  const min = Math.min(...vals), max = Math.max(...vals), rng = max - min || 1;
  const pts = vals.map((v, i) => `${(i / (vals.length - 1)) * W},${H - ((v - min) / rng) * H}`).join(" ");
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="shrink-0">
      <polyline points={pts} fill="none" stroke={up ? "#00b386" : "#e84040"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function DashboardPage() {
  const [paper,     setPaper]     = useState<ApiPortfolioSummary | null>(null);
  const [positions, setPositions] = useState<ApiPosition[]>([]);
  const [signals,   setSignals]   = useState<ApiSignal[]>([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([getPaperPortfolio(), getPaperPositions(), getSignals(6)])
      .then(([p, pos, sigs]) => {
        setPaper(p);
        setPositions(pos);
        setSignals(sigs.filter(s => s.direction !== "HOLD").slice(0, 6));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const pnlUp = (paper?.totalPnl ?? 0) >= 0;

  return (
    <div className="h-full overflow-y-auto no-scrollbar">
      <div className="max-w-5xl py-6 space-y-5">

        {/* ── Paper account summary ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-semibold text-[#1a1a1a]">Paper Account</h1>
            <Link href="/dashboard/paper-trade" className="text-[#00b386] text-sm font-medium hover:underline">
              Trade →
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white border border-[#e8e8e8] rounded-xl p-4 animate-pulse h-20" />
              ))
            ) : paper ? ([
              { label: "Total Value",   value: `₹${paper.currentValue.toLocaleString("en-IN")}`,                                            color: "#1a1a1a" },
              { label: "Total P&L",     value: `${pnlUp ? "+" : ""}₹${paper.totalPnl.toLocaleString("en-IN")}`,                             color: pnlUp ? "#00b386" : "#e84040" },
              { label: "P&L %",         value: `${paper.pnlPct >= 0 ? "+" : ""}${paper.pnlPct.toFixed(2)}%`,                                color: paper.pnlPct >= 0 ? "#00b386" : "#e84040" },
              { label: "Open Positions",value: `${positions.length}`,                                                                        color: "#1a1a1a" },
            ] as {label:string;value:string;color:string}[]).map(c => (
              <div key={c.label} className="bg-white border border-[#e8e8e8] rounded-xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
                <div className="text-[#9ca3af] text-xs mb-1">{c.label}</div>
                <div className="text-xl font-bold tracking-tight" style={{ color: c.color }}>{c.value}</div>
              </div>
            )) : (
              <div className="col-span-4 bg-white border border-[#e8e8e8] rounded-xl p-6 text-center text-[#9ca3af] text-sm">
                No paper account yet.{" "}
                <Link href="/dashboard/paper-trade" className="text-[#00b386] hover:underline">Create one →</Link>
              </div>
            )}
          </div>
        </div>

        {/* ── Open positions ── */}
        {positions.length > 0 && (
          <div className="bg-white border border-[#e8e8e8] rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.04)] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#f0f0f0] flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#1a1a1a]">Open Positions</h2>
              <Link href="/dashboard/paper-trade" className="text-[#9ca3af] text-xs hover:text-[#00b386]">View all →</Link>
            </div>
            <div className="grid grid-cols-[2fr_1fr_1fr_80px_1fr] px-5 py-2 bg-[#fafafa] border-b border-[#f0f0f0] text-xs text-[#9ca3af] font-medium">
              <span>Symbol</span><span className="text-right">Qty</span><span className="text-right">Avg</span><span className="text-center">Trend</span><span className="text-right">Unr. P&L</span>
            </div>
            {positions.map((p, i) => {
              const up  = p.unrealisedPnl >= 0;
              const pct = p.averageCost > 0 ? (p.unrealisedPnl / (p.averageCost * p.quantity)) * 100 : 0;
              const spark = Array.from({ length: 10 }, (_, j) =>
                p.averageCost + (p.currentPrice - p.averageCost) * (j / 9) + (Math.sin(j * 1.3 + i) * p.averageCost * 0.003)
              );
              return (
                <div key={p._id} className={`grid grid-cols-[2fr_1fr_1fr_80px_1fr] items-center px-5 py-3 ${i < positions.length - 1 ? "border-b border-[#f5f5f5]" : ""}`}>
                  <div>
                    <div className="text-sm font-semibold text-[#1a1a1a]">{p.symbol}</div>
                    <div className="text-[10px] text-[#9ca3af]">{p.exchange}</div>
                  </div>
                  <div className="text-right text-sm text-[#1a1a1a]">{p.quantity}</div>
                  <div className="text-right text-sm text-[#1a1a1a]">₹{p.averageCost.toLocaleString("en-IN")}</div>
                  <div className="flex justify-center"><Spark vals={spark} up={up} /></div>
                  <div className={`text-right text-sm font-semibold ${up ? "text-[#00b386]" : "text-[#e84040]"}`}>
                    {up ? "+" : ""}₹{p.unrealisedPnl.toLocaleString("en-IN")}
                    <div className="text-[10px] font-normal">{up ? "+" : ""}{pct.toFixed(2)}%</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Recent AI signals ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[#1a1a1a]">Recent AI Signals</h2>
            <Link href="/dashboard/signals" className="text-[#00b386] text-sm font-medium hover:underline">
              All signals →
            </Link>
          </div>

          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white border border-[#e8e8e8] rounded-xl p-4 animate-pulse h-28" />
              ))}
            </div>
          ) : signals.length === 0 ? (
            <div className="bg-white border border-[#e8e8e8] rounded-xl p-8 text-center text-[#9ca3af] text-sm">
              No signals yet — screener runs every 15 min during market hours.
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {signals.map(s => {
                const isBuy = s.direction === "BUY";
                const rr = ((Math.abs(s.targetPrice - s.entryPrice)) / Math.max(Math.abs(s.entryPrice - s.stopLoss), 0.01)).toFixed(1);
                const conf = Math.round(s.confidence * 100);
                return (
                  <div key={s._id} className="bg-white border border-[#e8e8e8] rounded-xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.04)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)] transition-shadow">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="text-sm font-bold text-[#1a1a1a]">{s.symbol}</div>
                        <div className="text-[10px] text-[#9ca3af]">{s.exchange}</div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isBuy ? "bg-[#e8f9f4] text-[#00b386]" : "bg-[#fef2f2] text-[#e84040]"}`}>
                          {s.direction}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-[#f5f3ff] text-[#6366f1] text-[10px] font-bold">{conf}%</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-1 text-center mb-2">
                      {[
                        { l: "Entry",  v: `₹${s.entryPrice}`  },
                        { l: "Target", v: `₹${s.targetPrice}` },
                        { l: "SL",     v: `₹${s.stopLoss}`    },
                      ].map(x => (
                        <div key={x.l} className="bg-[#f8f9fa] rounded-lg py-1">
                          <div className="text-[9px] text-[#9ca3af]">{x.l}</div>
                          <div className="text-[11px] font-semibold text-[#1a1a1a]">{x.v}</div>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-[#9ca3af]">R:R {rr}×</span>
                      <Link href="/dashboard/paper-trade"
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                          isBuy ? "bg-[#00b386] text-white hover:bg-[#009e78]" : "bg-[#e84040] text-white hover:bg-[#cc3535]"
                        }`}>
                        Paper {s.direction}
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
