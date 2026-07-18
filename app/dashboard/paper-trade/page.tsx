"use client";

import { useState, useEffect } from "react";
import {
  getPaperPortfolio, getPaperPositions, getPaperOrders, placePaperOrder,
  type ApiPortfolioSummary, type ApiPosition, type ApiOrder,
} from "@/lib/api";

type Tab = "Positions" | "Orders";

export default function PaperTradePage() {
  const [tab,       setTab]       = useState<Tab>("Positions");
  const [paper,     setPaper]     = useState<ApiPortfolioSummary | null>(null);
  const [positions, setPositions] = useState<ApiPosition[]>([]);
  const [orders,    setOrders]    = useState<ApiOrder[]>([]);
  const [loading,   setLoading]   = useState(true);

  /* Order form */
  const [symbol,   setSymbol]   = useState("");
  const [exchange, setExchange] = useState("NSE");
  const [side,     setSide]     = useState<"BUY" | "SELL">("BUY");
  const [qty,      setQty]      = useState("");
  const [price,    setPrice]    = useState("");
  const [placing,  setPlacing]  = useState(false);
  const [formErr,  setFormErr]  = useState("");
  const [formOk,   setFormOk]   = useState("");

  async function load() {
    try {
      const [p, pos, ords] = await Promise.all([
        getPaperPortfolio(), getPaperPositions(), getPaperOrders(),
      ]);
      setPaper(p);
      setPositions(pos);
      setOrders(ords);
    } catch { /* stay empty */ }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handlePlace(e: React.FormEvent) {
    e.preventDefault();
    setFormErr(""); setFormOk("");
    if (!symbol.trim() || !qty || !price) { setFormErr("Fill in all fields"); return; }
    setPlacing(true);
    try {
      await placePaperOrder({
        symbol:   symbol.trim().toUpperCase(),
        exchange,
        side,
        quantity: parseInt(qty),
        limitPrice: parseFloat(price),
      });
      setFormOk(`${side} order placed for ${symbol.toUpperCase()}`);
      setSymbol(""); setQty(""); setPrice("");
      await load();
    } catch (err) {
      setFormErr(err instanceof Error ? err.message : "Order failed");
    } finally {
      setPlacing(false);
    }
  }

  const pnlUp = (paper?.totalPnl ?? 0) >= 0;

  return (
    <div className="h-full overflow-y-auto no-scrollbar">
      <div className="max-w-5xl py-6 space-y-5">

        <h1 className="text-lg font-semibold text-[#1a1a1a]">Paper Trading</h1>

        {/* ── Summary strip ── */}
        {paper && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { l: "Invested",     v: `₹${paper.totalInvested.toLocaleString("en-IN")}`,                                              c: "#1a1a1a" },
              { l: "Current Value",v: `₹${paper.currentValue.toLocaleString("en-IN")}`,                                               c: "#1a1a1a" },
              { l: "Total P&L",    v: `${pnlUp ? "+" : ""}₹${paper.totalPnl.toLocaleString("en-IN")}`,                               c: pnlUp ? "#00b386" : "#e84040" },
              { l: "Return",       v: `${paper.pnlPct >= 0 ? "+" : ""}${paper.pnlPct.toFixed(2)}%`,                                  c: paper.pnlPct >= 0 ? "#00b386" : "#e84040" },
            ].map(c => (
              <div key={c.l} className="bg-white border border-[#e8e8e8] rounded-xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
                <div className="text-[#9ca3af] text-xs mb-1">{c.l}</div>
                <div className="text-lg font-bold" style={{ color: c.c }}>{c.v}</div>
              </div>
            ))}
          </div>
        )}

        <div className="grid lg:grid-cols-[1fr_340px] gap-5 items-start">

          {/* ── Positions / Orders ── */}
          <div className="bg-white border border-[#e8e8e8] rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.04)] overflow-hidden">
            <div className="flex border-b border-[#f0f0f0]">
              {(["Positions", "Orders"] as Tab[]).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-5 py-3 text-sm font-medium transition-colors ${tab === t ? "text-[#00b386] border-b-2 border-[#00b386]" : "text-[#6b7280] hover:text-[#1a1a1a]"}`}>
                  {t}
                  {t === "Positions" && positions.length > 0 && (
                    <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-[#f0f0f0] text-[#6b7280] text-[9px] font-bold">{positions.length}</span>
                  )}
                </button>
              ))}
            </div>

            {tab === "Positions" && (
              loading ? (
                <div className="p-8 text-center text-[#9ca3af] text-sm">Loading…</div>
              ) : positions.length === 0 ? (
                <div className="p-8 text-center text-[#9ca3af] text-sm">No open positions. Place your first paper trade →</div>
              ) : (
                <>
                  <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] px-5 py-2 bg-[#fafafa] border-b border-[#f0f0f0] text-xs text-[#9ca3af] font-medium">
                    <span>Symbol</span><span className="text-right">Qty</span><span className="text-right">Avg Cost</span><span className="text-right">LTP</span><span className="text-right">P&amp;L</span>
                  </div>
                  {positions.map((p, i) => {
                    const up  = p.unrealisedPnl >= 0;
                    const pct = p.averageCost > 0 ? (p.unrealisedPnl / (p.averageCost * p.quantity)) * 100 : 0;
                    return (
                      <div key={p._id} className={`grid grid-cols-[2fr_1fr_1fr_1fr_1fr] items-center px-5 py-3.5 hover:bg-[#f8f9fa] ${i < positions.length - 1 ? "border-b border-[#f5f5f5]" : ""}`}>
                        <div>
                          <div className="text-sm font-semibold text-[#1a1a1a]">{p.symbol}</div>
                          <div className="text-[10px] text-[#9ca3af]">{p.exchange}</div>
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
              )
            )}

            {tab === "Orders" && (
              loading ? (
                <div className="p-8 text-center text-[#9ca3af] text-sm">Loading…</div>
              ) : orders.length === 0 ? (
                <div className="p-8 text-center text-[#9ca3af] text-sm">No orders yet.</div>
              ) : (
                <>
                  <div className="grid grid-cols-[2fr_60px_1fr_1fr_80px] px-5 py-2 bg-[#fafafa] border-b border-[#f0f0f0] text-xs text-[#9ca3af] font-medium">
                    <span>Symbol</span><span className="text-center">Side</span><span className="text-right">Qty</span><span className="text-right">Price</span><span className="text-center">Status</span>
                  </div>
                  {orders.map((o, i) => (
                    <div key={o._id} className={`grid grid-cols-[2fr_60px_1fr_1fr_80px] items-center px-5 py-3 ${i < orders.length - 1 ? "border-b border-[#f5f5f5]" : ""}`}>
                      <div>
                        <div className="text-sm font-semibold text-[#1a1a1a]">{o.symbol}</div>
                        <div className="text-[10px] text-[#9ca3af]">{o.exchange}</div>
                      </div>
                      <div className="text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${o.side === "BUY" ? "bg-[#e8f9f4] text-[#00b386]" : "bg-[#fef2f2] text-[#e84040]"}`}>{o.side}</span>
                      </div>
                      <div className="text-right text-sm text-[#1a1a1a]">{o.quantity}</div>
                      <div className="text-right text-sm text-[#1a1a1a]">
                        ₹{(o.executedPrice ?? o.limitPrice ?? 0).toLocaleString("en-IN")}
                      </div>
                      <div className="text-center">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          o.status === "EXECUTED"  ? "bg-[#e8f9f4] text-[#00b386]" :
                          o.status === "PENDING"   ? "bg-[#fffbeb] text-[#f59e0b]" :
                          "bg-[#fef2f2] text-[#e84040]"
                        }`}>{o.status}</span>
                      </div>
                    </div>
                  ))}
                </>
              )
            )}
          </div>

          {/* ── Order form ── */}
          <div className="bg-white border border-[#e8e8e8] rounded-xl p-5 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
            <h2 className="text-sm font-semibold text-[#1a1a1a] mb-4">Place Order</h2>

            <form onSubmit={handlePlace} className="space-y-3">
              {/* BUY / SELL toggle */}
              <div className="grid grid-cols-2 gap-1 p-1 bg-[#f8f9fa] rounded-xl">
                {(["BUY", "SELL"] as const).map(s => (
                  <button key={s} type="button" onClick={() => setSide(s)}
                    className={`py-2 rounded-lg text-sm font-semibold transition-all ${
                      side === s
                        ? s === "BUY" ? "bg-[#00b386] text-white shadow-sm" : "bg-[#e84040] text-white shadow-sm"
                        : "text-[#6b7280] hover:text-[#1a1a1a]"
                    }`}>
                    {s}
                  </button>
                ))}
              </div>

              <div>
                <label className="text-xs font-medium text-[#6b7280] mb-1 block">Symbol</label>
                <input value={symbol} onChange={e => setSymbol(e.target.value.toUpperCase())}
                  placeholder="e.g. RELIANCE"
                  className="w-full px-3 py-2 rounded-xl border border-[#e8e8e8] text-sm text-[#1a1a1a] placeholder-[#c4c4c4] focus:border-[#00b386] focus:outline-none focus:ring-2 focus:ring-[#00b386]/10 transition-colors uppercase" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-[#6b7280] mb-1 block">Exchange</label>
                  <select value={exchange} onChange={e => setExchange(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#e8e8e8] text-sm text-[#1a1a1a] focus:border-[#00b386] focus:outline-none transition-colors bg-white">
                    <option>NSE</option>
                    <option>BSE</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-[#6b7280] mb-1 block">Quantity</label>
                  <input type="number" min="1" value={qty} onChange={e => setQty(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-xl border border-[#e8e8e8] text-sm text-[#1a1a1a] placeholder-[#c4c4c4] focus:border-[#00b386] focus:outline-none focus:ring-2 focus:ring-[#00b386]/10 transition-colors" />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-[#6b7280] mb-1 block">Price (₹)</label>
                <input type="number" step="0.05" min="0" value={price} onChange={e => setPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 rounded-xl border border-[#e8e8e8] text-sm text-[#1a1a1a] placeholder-[#c4c4c4] focus:border-[#00b386] focus:outline-none focus:ring-2 focus:ring-[#00b386]/10 transition-colors" />
              </div>

              {formErr && <p className="text-xs text-[#e84040] bg-[#fef2f2] px-3 py-2 rounded-lg">{formErr}</p>}
              {formOk  && <p className="text-xs text-[#00b386] bg-[#e8f9f4] px-3 py-2 rounded-lg">{formOk}</p>}

              <button type="submit" disabled={placing}
                className={`w-full py-2.5 rounded-xl text-white text-sm font-semibold transition-colors disabled:opacity-60 ${
                  side === "BUY" ? "bg-[#00b386] hover:bg-[#009e78]" : "bg-[#e84040] hover:bg-[#cc3535]"
                }`}>
                {placing ? "Placing…" : `Place ${side} Order`}
              </button>
            </form>

            <p className="text-[10px] text-[#9ca3af] text-center mt-3">
              Simulated only — no real money involved
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
