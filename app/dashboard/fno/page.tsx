"use client";

import { useState } from "react";

/* ─── Index data ─── */
const INDICES = {
  NIFTY:      { name: "NIFTY 50",   price: 23393.25, change: -90.30,  pct: -0.38, lot: 50,  lotMargin: "₹1.24L"  },
  BANKNIFTY:  { name: "BANKNIFTY",  price: 54149.20, change: 434.55,  pct:  0.81, lot: 15,  lotMargin: "₹2.81L"  },
  MIDCPNIFTY: { name: "MIDCPNIFTY", price: 14137.55, change: -102.90, pct: -0.72, lot: 75,  lotMargin: "₹0.82L"  },
  FINNIFTY:   { name: "FINNIFTY",   price: 24927.10, change: 124.30,  pct:  0.50, lot: 40,  lotMargin: "₹1.52L"  },
};
type IndexKey = keyof typeof INDICES;

const EXPIRIES = ["Jun 12 (Weekly)", "Jun 26", "Jul 31", "Aug 28"];

const POPULAR_STOCKS = [
  { symbol: "RELIANCE",  price: 2847.50, chg: 0.62,  lot: 250, color: "#0070ba" },
  { symbol: "HDFCBANK",  price: 1734.20, chg: 1.99,  lot: 550, color: "#e4002b" },
  { symbol: "INFY",      price: 1892.00, chg: -1.48, lot: 400, color: "#007cc3" },
  { symbol: "TCS",       price: 3944.50, chg: 1.40,  lot: 175, color: "#0052cc" },
  { symbol: "ITC",       price: 432.80,  chg: 0.34,  lot: 3200,color: "#006633" },
  { symbol: "SBIN",      price: 824.55,  chg: -0.92, lot: 1500,color: "#1e3a8a" },
  { symbol: "ICICIBANK", price: 1248.30, chg: 1.12,  lot: 700, color: "#f58220" },
  { symbol: "AXISBANK",  price: 1187.45, chg: -0.45, lot: 1200,color: "#8b0000" },
];

/* ─── Deterministic option chain ─── */
function sr(n: number) { const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453123; return x - Math.floor(x); }

function genChain(spot: number, expIdx: number) {
  const atm = Math.round(spot / 50) * 50;
  const strikes = Array.from({ length: 17 }, (_, i) => atm - 400 + i * 50);
  return strikes.map(strike => {
    const dist = Math.abs(strike - atm);
    const seed  = (strike / 100) + expIdx * 7.3;
    const decay = Math.max(0, 1 - dist / 600);

    const cLtp    = parseFloat(Math.max(0.5, (strike < atm ? (atm - strike) : 0) + 180 * decay * (0.8 + sr(seed)     * 0.4)).toFixed(1));
    const cIv     = parseFloat((13 + dist / 30 + sr(seed + 1) * 4).toFixed(1));
    const cOi     = Math.round((sr(seed + 2) * 1500000 + 200000 + decay * 2000000) / 1000) * 1000;
    const cVol    = Math.round(cOi * (0.08 + sr(seed + 3) * 0.12));
    const cChg    = parseFloat(((sr(seed + 4) - 0.5) * 6).toFixed(1));
    const cChgOi  = Math.round((sr(seed + 5) - 0.5) * 200000 / 1000) * 1000;

    const pLtp    = parseFloat(Math.max(0.5, (strike > atm ? (strike - atm) : 0) + 180 * decay * (0.8 + sr(seed + 6) * 0.4)).toFixed(1));
    const pIv     = parseFloat((13 + dist / 30 + sr(seed + 7) * 4).toFixed(1));
    const pOi     = Math.round((sr(seed + 8) * 1200000 + 200000 + decay * 1800000) / 1000) * 1000;
    const pVol    = Math.round(pOi * (0.08 + sr(seed + 9) * 0.12));
    const pChg    = parseFloat(((sr(seed + 10) - 0.5) * 6).toFixed(1));
    const pChgOi  = Math.round((sr(seed + 11) - 0.5) * 180000 / 1000) * 1000;

    return {
      strike, isAtm: strike === atm,
      callItm: strike < atm, putItm: strike > atm,
      call: { ltp: cLtp, iv: cIv, oi: cOi, vol: cVol, chg: cChg, chgOi: cChgOi },
      put:  { ltp: pLtp, iv: pIv, oi: pOi, vol: pVol, chg: pChg, chgOi: pChgOi },
    };
  });
}

/* ─── Mock positions ─── */
const POSITIONS = [
  { symbol: "NIFTY 23400 CE",  expiry: "Jun 12",  type: "CE", action: "BUY",  qty: 50,  avgPrice: 142.30, ltp: 187.60, pnl:  2265, pnlPct:  31.9 },
  { symbol: "NIFTY 23500 PE",  expiry: "Jun 12",  type: "PE", action: "SELL", qty: 50,  avgPrice:  88.50, ltp:  54.20, pnl:  1715, pnlPct:  38.7 },
  { symbol: "BANKNIFTY 54000 CE", expiry: "Jun 12", type: "CE", action: "BUY", qty: 15, avgPrice: 312.00, ltp: 248.40, pnl:  -954, pnlPct: -20.4 },
  { symbol: "RELIANCE 2850 CE", expiry: "Jun 26", type: "CE", action: "BUY",  qty: 250, avgPrice:  34.80, ltp:  41.25, pnl:  1612, pnlPct:  18.5 },
];

/* ─── Helpers ─── */
function fmt(n: number) { return n >= 100000 ? `${(n/100000).toFixed(1)}L` : n >= 1000 ? `${(n/1000).toFixed(0)}K` : String(n); }

function ChgBadge({ v }: { v: number }) {
  const up = v >= 0;
  return <span className={`text-xs font-semibold ${up ? "text-[#00b386]" : "text-[#e84040]"}`}>{up ? "+" : ""}{v.toFixed(1)}%</span>;
}

/* ─── Page ─── */
export default function FnOPage() {
  const [subTab,   setSubTab]   = useState<"Explore" | "Positions" | "Orders" | "Watchlist">("Explore");
  const [segment,  setSegment]  = useState<"Options" | "Futures">("Options");
  const [selIndex, setSelIndex] = useState<IndexKey>("NIFTY");
  const [expiry,   setExpiry]   = useState(0);
  const [showCall, setShowCall] = useState(true);
  const [showPut,  setShowPut]  = useState(true);

  const idx   = INDICES[selIndex];
  const chain = genChain(idx.price, expiry);
  const atm   = Math.round(idx.price / 50) * 50;
  const totalCallOi = chain.reduce((s, r) => s + r.call.oi, 0);
  const totalPutOi  = chain.reduce((s, r) => s + r.put.oi, 0);
  const pcr = (totalPutOi / totalCallOi).toFixed(2);
  const totalPnL = POSITIONS.reduce((s, p) => s + p.pnl, 0);

  return (
    <div className="max-w-[1440px]">

      {/* ── F&O Sub-nav ── */}
      <div className="flex items-center gap-1 border-b border-[#f0f0f0] -mx-8 sm:-mx-12 px-8 sm:px-12 mb-5 bg-white">
        {(["Explore","Positions","Orders","Watchlist"] as const).map(t => (
          <button key={t} onClick={() => setSubTab(t)}
            className={`py-3 px-1 mr-5 text-sm font-medium border-b-2 transition-colors shrink-0 ${
              subTab === t ? "text-[#00b386] border-[#00b386]" : "text-[#6b7280] border-transparent hover:text-[#1a1a1a]"
            }`}>
            {t}
            {t === "Positions" && <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full bg-[#fef2f2] text-[#e84040]">{POSITIONS.length}</span>}
          </button>
        ))}
      </div>

      {/* ════════ EXPLORE ════════ */}
      {subTab === "Explore" && (
        <div className="space-y-5">

          {/* Index selector cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(Object.keys(INDICES) as IndexKey[]).map(k => {
              const ix = INDICES[k];
              const active = selIndex === k;
              return (
                <button key={k} onClick={() => setSelIndex(k)}
                  className={`bg-white rounded-xl border p-4 text-left transition-all ${active ? "border-[#00b386] shadow-[0_0_0_2px_rgba(0,179,134,0.12)]" : "border-[#e8e8e8] hover:border-[#c8c8c8]"}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-semibold ${active ? "text-[#00b386]" : "text-[#9ca3af]"}`}>{ix.name}</span>
                    {active && <span className="w-2 h-2 rounded-full bg-[#00b386]" />}
                  </div>
                  <div className="text-[#1a1a1a] text-lg font-bold tracking-tight">{ix.price.toLocaleString("en-IN")}</div>
                  <div className={`text-xs font-semibold mt-0.5 ${ix.pct >= 0 ? "text-[#00b386]" : "text-[#e84040]"}`}>
                    {ix.pct >= 0 ? "▲" : "▼"} {Math.abs(ix.change).toFixed(2)} ({Math.abs(ix.pct).toFixed(2)}%)
                  </div>
                  <div className="text-[#9ca3af] text-[10px] mt-1.5">Lot: {ix.lot} · Margin: {ix.lotMargin}</div>
                </button>
              );
            })}
          </div>

          {/* Controls: Options/Futures + Expiry */}
          <div className="bg-white border border-[#e8e8e8] rounded-xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
            <div className="flex flex-wrap items-center gap-3">
              {/* Options / Futures */}
              <div className="flex rounded-lg border border-[#e8e8e8] overflow-hidden">
                {(["Options","Futures"] as const).map(s => (
                  <button key={s} onClick={() => setSegment(s)}
                    className={`px-4 py-2 text-sm font-semibold transition-colors ${segment === s ? "bg-[#00b386] text-white" : "text-[#6b7280] hover:bg-[#f8f9fa]"}`}>
                    {s}
                  </button>
                ))}
              </div>

              {/* Expiry */}
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-[#9ca3af] text-xs mr-1">Expiry:</span>
                {EXPIRIES.map((e, i) => (
                  <button key={e} onClick={() => setExpiry(i)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${expiry === i ? "bg-[#00b386] text-white border-[#00b386]" : "border-[#e8e8e8] text-[#6b7280] hover:border-[#c8c8c8]"}`}>
                    {e}
                  </button>
                ))}
              </div>

              <div className="ml-auto flex items-center gap-3 text-xs text-[#6b7280]">
                <span>ATM: <strong className="text-[#1a1a1a]">{atm.toLocaleString()}</strong></span>
                <span className="h-4 w-px bg-[#e8e8e8]" />
                <span>PCR: <strong className={`${Number(pcr) > 1 ? "text-[#00b386]" : "text-[#e84040]"}`}>{pcr}</strong></span>
                <span className="h-4 w-px bg-[#e8e8e8]" />
                <span>Total CE OI: <strong className="text-[#1a1a1a]">{fmt(totalCallOi)}</strong></span>
                <span>Total PE OI: <strong className="text-[#1a1a1a]">{fmt(totalPutOi)}</strong></span>
              </div>
            </div>
          </div>

          {/* Option Chain */}
          {segment === "Options" && (
            <div className="bg-white border border-[#e8e8e8] rounded-xl overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
              <div className="flex items-center px-4 py-2.5 border-b border-[#f0f0f0] bg-[#fafafa]">
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowCall(!showCall)}
                    className={`px-2.5 py-1 rounded text-xs font-semibold border transition-all ${showCall ? "bg-[#eff6ff] border-[#3b82f6] text-[#3b82f6]" : "border-[#e8e8e8] text-[#9ca3af]"}`}>
                    CALL
                  </button>
                  <button onClick={() => setShowPut(!showPut)}
                    className={`px-2.5 py-1 rounded text-xs font-semibold border transition-all ${showPut ? "bg-[#fef2f2] border-[#e84040] text-[#e84040]" : "border-[#e8e8e8] text-[#9ca3af]"}`}>
                    PUT
                  </button>
                </div>
                <div className="ml-auto flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-amber-100 border border-amber-300 inline-block" />
                  <span className="text-[#9ca3af] text-xs">ATM</span>
                  <span className="w-2.5 h-2.5 rounded-sm bg-blue-50 border border-blue-200 inline-block ml-2" />
                  <span className="text-[#9ca3af] text-xs">ITM (Call)</span>
                  <span className="w-2.5 h-2.5 rounded-sm bg-red-50 border border-red-200 inline-block ml-2" />
                  <span className="text-[#9ca3af] text-xs">ITM (Put)</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[800px]">
                  <thead>
                    <tr className="border-b border-[#f0f0f0]">
                      {showCall && <>
                        <th className="px-3 py-2 text-right text-[#9ca3af] font-medium bg-blue-50/30">OI</th>
                        <th className="px-3 py-2 text-right text-[#9ca3af] font-medium bg-blue-50/30">Chg OI</th>
                        <th className="px-3 py-2 text-right text-[#9ca3af] font-medium bg-blue-50/30">Volume</th>
                        <th className="px-3 py-2 text-right text-[#9ca3af] font-medium bg-blue-50/30">IV%</th>
                        <th className="px-3 py-2 text-right text-[#9ca3af] font-medium bg-blue-50/30">LTP</th>
                        <th className="px-3 py-2 text-right text-[#9ca3af] font-medium bg-blue-50/30">Chg%</th>
                      </>}
                      <th className="px-4 py-2 text-center text-[#1a1a1a] font-bold bg-amber-50">Strike</th>
                      {showPut && <>
                        <th className="px-3 py-2 text-left text-[#9ca3af] font-medium bg-red-50/30">Chg%</th>
                        <th className="px-3 py-2 text-left text-[#9ca3af] font-medium bg-red-50/30">LTP</th>
                        <th className="px-3 py-2 text-left text-[#9ca3af] font-medium bg-red-50/30">IV%</th>
                        <th className="px-3 py-2 text-left text-[#9ca3af] font-medium bg-red-50/30">Volume</th>
                        <th className="px-3 py-2 text-left text-[#9ca3af] font-medium bg-red-50/30">Chg OI</th>
                        <th className="px-3 py-2 text-left text-[#9ca3af] font-medium bg-red-50/30">OI</th>
                      </>}
                    </tr>
                  </thead>
                  <tbody>
                    {chain.map(row => {
                      const atmBg   = row.isAtm   ? "bg-amber-50"  : "";
                      const callBg  = !row.isAtm && row.callItm ? "bg-blue-50/40"  : "";
                      const putBg   = !row.isAtm && row.putItm  ? "bg-red-50/40"   : "";

                      return (
                        <tr key={row.strike} className={`border-b border-[#f5f5f5] hover:brightness-95 transition-all ${row.isAtm ? "font-semibold" : ""}`}>
                          {showCall && <>
                            <td className={`px-3 py-2.5 text-right text-[#6b7280] ${callBg || atmBg}`}>{fmt(row.call.oi)}</td>
                            <td className={`px-3 py-2.5 text-right ${row.call.chgOi >= 0 ? "text-[#00b386]" : "text-[#e84040]"} ${callBg || atmBg}`}>{row.call.chgOi >= 0 ? "+" : ""}{fmt(Math.abs(row.call.chgOi))}</td>
                            <td className={`px-3 py-2.5 text-right text-[#6b7280] ${callBg || atmBg}`}>{fmt(row.call.vol)}</td>
                            <td className={`px-3 py-2.5 text-right text-[#6b7280] ${callBg || atmBg}`}>{row.call.iv}%</td>
                            <td className={`px-3 py-2.5 text-right font-semibold text-[#1a1a1a] ${callBg || atmBg}`}>{row.call.ltp}</td>
                            <td className={`px-3 py-2.5 text-right ${callBg || atmBg}`}>
                              <span className={`font-semibold ${row.call.chg >= 0 ? "text-[#00b386]" : "text-[#e84040]"}`}>{row.call.chg >= 0 ? "+" : ""}{row.call.chg}%</span>
                            </td>
                          </>}

                          {/* Strike */}
                          <td className="px-4 py-2.5 text-center font-bold text-[#1a1a1a] bg-amber-50 border-x border-amber-200/60">
                            {row.strike.toLocaleString()}
                            {row.isAtm && <div className="text-[8px] text-amber-600 font-normal leading-none">ATM</div>}
                          </td>

                          {showPut && <>
                            <td className={`px-3 py-2.5 text-left ${putBg || atmBg}`}>
                              <span className={`font-semibold ${row.put.chg >= 0 ? "text-[#00b386]" : "text-[#e84040]"}`}>{row.put.chg >= 0 ? "+" : ""}{row.put.chg}%</span>
                            </td>
                            <td className={`px-3 py-2.5 text-left font-semibold text-[#1a1a1a] ${putBg || atmBg}`}>{row.put.ltp}</td>
                            <td className={`px-3 py-2.5 text-left text-[#6b7280] ${putBg || atmBg}`}>{row.put.iv}%</td>
                            <td className={`px-3 py-2.5 text-left text-[#6b7280] ${putBg || atmBg}`}>{fmt(row.put.vol)}</td>
                            <td className={`px-3 py-2.5 text-left ${row.put.chgOi >= 0 ? "text-[#00b386]" : "text-[#e84040]"} ${putBg || atmBg}`}>{row.put.chgOi >= 0 ? "+" : ""}{fmt(Math.abs(row.put.chgOi))}</td>
                            <td className={`px-3 py-2.5 text-left text-[#6b7280] ${putBg || atmBg}`}>{fmt(row.put.oi)}</td>
                          </>}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Futures (simple) */}
          {segment === "Futures" && (
            <div className="bg-white border border-[#e8e8e8] rounded-xl overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
              <div className="px-5 py-3 bg-[#fafafa] border-b border-[#f0f0f0]">
                <span className="text-[#9ca3af] text-xs font-medium">Futures contracts · {idx.name}</span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#f0f0f0] text-xs text-[#9ca3af]">
                    {["Contract","Expiry","LTP","Change","Volume","Open Interest","Margin"].map(h => (
                      <th key={h} className="px-5 py-3 text-left font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {EXPIRIES.slice(0, 3).map((exp, i) => {
                    const premium = [2, 18, 45][i];
                    const chg = [0.38, 0.41, 0.35][i];
                    return (
                      <tr key={exp} className={`hover:bg-[#f8f9fa] transition-colors ${i < 2 ? "border-b border-[#f5f5f5]" : ""}`}>
                        <td className="px-5 py-3.5 text-[#1a1a1a] font-semibold">{selIndex} FUT</td>
                        <td className="px-5 py-3.5 text-[#6b7280]">{exp.replace(" (Weekly)","")}</td>
                        <td className="px-5 py-3.5 text-[#1a1a1a] font-semibold font-mono">{(idx.price + premium).toLocaleString("en-IN")}</td>
                        <td className="px-5 py-3.5"><ChgBadge v={idx.pct} /></td>
                        <td className="px-5 py-3.5 text-[#6b7280]">{fmt(Math.round(500000 * (1 - i * 0.2)))}</td>
                        <td className="px-5 py-3.5 text-[#6b7280]">{fmt(Math.round(8000000 * (1 - i * 0.3)))}</td>
                        <td className="px-5 py-3.5 text-[#1a1a1a] font-medium">{idx.lotMargin}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Popular F&O Stocks */}
          <div>
            <h2 className="text-[#1a1a1a] font-semibold text-sm mb-3">Popular F&O Stocks</h2>
            <div className="bg-white border border-[#e8e8e8] rounded-xl overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
              <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr] px-5 py-2.5 bg-[#fafafa] border-b border-[#f0f0f0] text-xs text-[#9ca3af] font-medium">
                <span>Symbol</span><span className="text-right">Price</span><span className="text-right">Change</span><span className="text-right">Lot Size</span><span />
              </div>
              {POPULAR_STOCKS.map((s, i) => (
                <div key={s.symbol}
                  className={`grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr] items-center px-5 py-3.5 hover:bg-[#f8f9fa] transition-colors ${i < POPULAR_STOCKS.length - 1 ? "border-b border-[#f5f5f5]" : ""}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[10px] font-bold shrink-0" style={{ background: s.color }}>
                      {s.symbol.slice(0, 2)}
                    </div>
                    <span className="text-[#1a1a1a] font-semibold text-sm">{s.symbol}</span>
                  </div>
                  <div className="text-right text-[#1a1a1a] text-sm font-mono font-semibold">₹{s.price.toLocaleString("en-IN")}</div>
                  <div className="text-right"><ChgBadge v={s.chg} /></div>
                  <div className="text-right text-[#6b7280] text-sm">{s.lot}</div>
                  <div className="flex justify-end">
                    <button className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#00b386] border border-[#00b386] hover:bg-[#00b386] hover:text-white transition-all">
                      Options
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ════════ POSITIONS ════════ */}
      {subTab === "Positions" && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { l: "Total P&L",      v: `${totalPnL >= 0 ? "+" : ""}₹${Math.abs(totalPnL).toLocaleString()}`, c: totalPnL >= 0 ? "#00b386" : "#e84040" },
              { l: "Open Positions", v: `${POSITIONS.length}`,    c: "#1a1a1a" },
              { l: "Margin Used",    v: "₹38,420",               c: "#1a1a1a" },
              { l: "Available",      v: "₹1,61,580",             c: "#1a1a1a" },
            ].map(s => (
              <div key={s.l} className="bg-white border border-[#e8e8e8] rounded-xl p-5 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
                <div className="text-[#9ca3af] text-xs mb-1">{s.l}</div>
                <div className="text-xl font-bold tracking-tight" style={{ color: s.c }}>{s.v}</div>
              </div>
            ))}
          </div>

          {/* Positions table */}
          <div className="bg-white border border-[#e8e8e8] rounded-xl overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
            <div className="grid grid-cols-[2fr_80px_80px_1fr_1fr_1fr_1fr] px-5 py-3 bg-[#fafafa] border-b border-[#f0f0f0] text-xs text-[#9ca3af] font-medium">
              <span>Contract</span><span className="text-center">Type</span><span className="text-center">Side</span>
              <span className="text-right">Qty</span><span className="text-right">Avg Price</span><span className="text-right">LTP</span><span className="text-right pr-1">P&L</span>
            </div>
            {POSITIONS.map((p, i) => (
              <div key={p.symbol}
                className={`grid grid-cols-[2fr_80px_80px_1fr_1fr_1fr_1fr] items-center px-5 py-4 hover:bg-[#f8f9fa] transition-colors ${i < POSITIONS.length - 1 ? "border-b border-[#f5f5f5]" : ""}`}>
                <div>
                  <div className="text-[#1a1a1a] font-semibold text-sm">{p.symbol}</div>
                  <div className="text-[#9ca3af] text-xs mt-0.5">Expiry {p.expiry}</div>
                </div>
                <div className="text-center">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${p.type === "CE" ? "bg-[#eff6ff] text-[#3b82f6]" : "bg-[#fef2f2] text-[#e84040]"}`}>{p.type}</span>
                </div>
                <div className="text-center">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${p.action === "BUY" ? "bg-[#e8f9f4] text-[#00b386]" : "bg-[#fef2f2] text-[#e84040]"}`}>{p.action}</span>
                </div>
                <div className="text-right text-[#1a1a1a] text-sm">{p.qty}</div>
                <div className="text-right text-[#1a1a1a] text-sm font-mono">{p.avgPrice.toFixed(2)}</div>
                <div className="text-right text-[#1a1a1a] text-sm font-mono">{p.ltp.toFixed(2)}</div>
                <div className="text-right pr-1">
                  <div className={`text-sm font-bold ${p.pnl >= 0 ? "text-[#00b386]" : "text-[#e84040]"}`}>
                    {p.pnl >= 0 ? "+" : ""}₹{Math.abs(p.pnl).toLocaleString()}
                  </div>
                  <div className={`text-xs ${p.pnl >= 0 ? "text-[#00b386]" : "text-[#e84040]"}`}>
                    {p.pnlPct >= 0 ? "+" : ""}{p.pnlPct.toFixed(1)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ════════ ORDERS ════════ */}
      {subTab === "Orders" && (
        <div className="bg-white border border-[#e8e8e8] rounded-xl overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
          <div className="grid grid-cols-[2fr_80px_80px_1fr_1fr_1fr_1fr] px-5 py-3 bg-[#fafafa] border-b border-[#f0f0f0] text-xs text-[#9ca3af] font-medium">
            <span>Contract</span><span className="text-center">Type</span><span className="text-center">Side</span>
            <span className="text-right">Qty</span><span className="text-right">Price</span><span className="text-right">Status</span><span className="text-right">Time</span>
          </div>
          {[
            { sym: "NIFTY 23400 CE",    expiry: "Jun 12", type: "CE", side: "BUY",  qty: 50,  price: 142.30, status: "COMPLETE", time: "09:18 AM" },
            { sym: "NIFTY 23500 PE",    expiry: "Jun 12", type: "PE", side: "SELL", qty: 50,  price:  88.50, status: "COMPLETE", time: "09:22 AM" },
            { sym: "BANKNIFTY 54000 CE",expiry: "Jun 12", type: "CE", side: "BUY",  qty: 15,  price: 312.00, status: "COMPLETE", time: "10:05 AM" },
            { sym: "RELIANCE 2850 CE",  expiry: "Jun 26", type: "CE", side: "BUY",  qty: 250, price:  34.80, status: "COMPLETE", time: "10:31 AM" },
            { sym: "NIFTY 23600 CE",    expiry: "Jun 12", type: "CE", side: "BUY",  qty: 50,  price:  28.50, status: "REJECTED", time: "11:14 AM" },
          ].map((o, i) => (
            <div key={i}
              className={`grid grid-cols-[2fr_80px_80px_1fr_1fr_1fr_1fr] items-center px-5 py-4 hover:bg-[#f8f9fa] transition-colors ${i < 4 ? "border-b border-[#f5f5f5]" : ""}`}>
              <div>
                <div className="text-[#1a1a1a] font-semibold text-sm">{o.sym}</div>
                <div className="text-[#9ca3af] text-xs">Expiry {o.expiry}</div>
              </div>
              <div className="text-center"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${o.type === "CE" ? "bg-[#eff6ff] text-[#3b82f6]" : "bg-[#fef2f2] text-[#e84040]"}`}>{o.type}</span></div>
              <div className="text-center"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${o.side === "BUY" ? "bg-[#e8f9f4] text-[#00b386]" : "bg-[#fef2f2] text-[#e84040]"}`}>{o.side}</span></div>
              <div className="text-right text-[#1a1a1a] text-sm">{o.qty}</div>
              <div className="text-right text-[#1a1a1a] text-sm font-mono">₹{o.price}</div>
              <div className="text-right">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${o.status === "COMPLETE" ? "bg-[#e8f9f4] text-[#00b386]" : "bg-[#fef2f2] text-[#e84040]"}`}>{o.status}</span>
              </div>
              <div className="text-right text-[#9ca3af] text-xs">{o.time}</div>
            </div>
          ))}
        </div>
      )}

      {/* ════════ WATCHLIST ════════ */}
      {subTab === "Watchlist" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[#1a1a1a] font-semibold text-sm">F&O Watchlist</h2>
            <button className="px-4 py-2 rounded-lg bg-[#00b386] text-white text-sm font-semibold hover:bg-[#009e78] transition-colors">+ Add Contract</button>
          </div>
          <div className="bg-white border border-[#e8e8e8] rounded-xl overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
            {[
              { sym: "NIFTY 23400 CE", expiry: "Jun 12", ltp: 187.60, chg:  31.9, oi: "12.4L", vol: "3.2L", type: "CE" },
              { sym: "NIFTY 23400 PE", expiry: "Jun 12", ltp:  54.20, chg: -38.7, oi: "9.8L",  vol: "2.1L", type: "PE" },
              { sym: "BANKNIFTY 54000 CE", expiry: "Jun 12", ltp: 248.40, chg: -20.4, oi: "4.2L", vol: "1.4L", type: "CE" },
              { sym: "NIFTY JUN FUT",  expiry: "Jun 26", ltp: 23411.25, chg: -0.38, oi: "8.9L", vol: "6.7L", type: "FUT" },
            ].map((w, i) => (
              <div key={i} className={`flex items-center px-5 py-4 hover:bg-[#f8f9fa] transition-colors ${i < 3 ? "border-b border-[#f5f5f5]" : ""}`}>
                <div className="flex-1">
                  <div className="text-[#1a1a1a] font-semibold text-sm">{w.sym}</div>
                  <div className="text-[#9ca3af] text-xs mt-0.5">Expiry {w.expiry} · OI {w.oi} · Vol {w.vol}</div>
                </div>
                <div className="text-right mr-6">
                  <div className="text-[#1a1a1a] text-sm font-mono font-semibold">{w.ltp.toLocaleString("en-IN")}</div>
                  <ChgBadge v={w.chg} />
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold mr-4 ${w.type === "CE" ? "bg-[#eff6ff] text-[#3b82f6]" : w.type === "PE" ? "bg-[#fef2f2] text-[#e84040]" : "bg-[#f5f3ff] text-[#6366f1]"}`}>{w.type}</span>
                <button className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#00b386] border border-[#00b386] hover:bg-[#00b386] hover:text-white transition-all">Buy</button>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
