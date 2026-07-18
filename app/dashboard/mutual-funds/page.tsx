"use client";

import { useState } from "react";
import Link from "next/link";

/* ─── Types ─── */
type Risk = "Very High" | "High" | "Moderate" | "Low to Moderate" | "Low";

interface Fund {
  id: string;
  name: string;
  amc: string;
  amcColor: string;
  category: string;
  type: "Equity" | "Debt" | "Hybrid" | "Other";
  risk: Risk;
  returns1Y: number;
  returns3Y: number;
  returns5Y: number;
  nav: number;
  aum: string;
  minSip: number;
  minLumpsum: number;
  rating: number;
}

/* ─── Fund data ─── */
const FUNDS: Fund[] = [
  { id: "axis-bluechip",      name: "Axis Bluechip Fund",                 amc: "Axis MF",      amcColor: "#6c0a8e", category: "Large Cap",   type: "Equity",  risk: "Very High",      returns1Y: 12.4,  returns3Y: 18.2, returns5Y: 16.1, nav: 52.34,    aum: "₹32,450 Cr",   minSip: 500,  minLumpsum: 5000,  rating: 5 },
  { id: "mirae-largecap",     name: "Mirae Asset Large Cap Fund",         amc: "Mirae Asset",  amcColor: "#003087", category: "Large Cap",   type: "Equity",  risk: "Very High",      returns1Y: 11.8,  returns3Y: 17.9, returns5Y: 15.8, nav: 98.12,    aum: "₹38,200 Cr",   minSip: 1000, minLumpsum: 5000,  rating: 5 },
  { id: "hdfc-midcap",        name: "HDFC Mid-Cap Opportunities Fund",    amc: "HDFC MF",      amcColor: "#e4002b", category: "Mid Cap",     type: "Equity",  risk: "Very High",      returns1Y: 24.3,  returns3Y: 28.1, returns5Y: 22.4, nav: 187.45,   aum: "₹65,420 Cr",   minSip: 300,  minLumpsum: 5000,  rating: 5 },
  { id: "nippon-smallcap",    name: "Nippon India Small Cap Fund",        amc: "Nippon MF",    amcColor: "#e05c0a", category: "Small Cap",   type: "Equity",  risk: "Very High",      returns1Y: 35.2,  returns3Y: 38.4, returns5Y: 28.9, nav: 147.23,   aum: "₹48,320 Cr",   minSip: 100,  minLumpsum: 5000,  rating: 4 },
  { id: "axis-elss",          name: "Axis ELSS Tax Saver Fund",           amc: "Axis MF",      amcColor: "#6c0a8e", category: "ELSS",        type: "Equity",  risk: "Very High",      returns1Y: 14.2,  returns3Y: 19.8, returns5Y: 17.3, nav: 78.56,    aum: "₹34,120 Cr",   minSip: 500,  minLumpsum: 500,   rating: 5 },
  { id: "hdfc-nifty50",       name: "HDFC Nifty 50 Index Fund",           amc: "HDFC MF",      amcColor: "#e4002b", category: "Index Fund",  type: "Equity",  risk: "Very High",      returns1Y: 10.2,  returns3Y: 15.8, returns5Y: 13.9, nav: 186.32,   aum: "₹12,450 Cr",   minSip: 100,  minLumpsum: 100,   rating: 5 },
  { id: "parag-flexicap",     name: "Parag Parikh Flexi Cap Fund",        amc: "PPFAS MF",     amcColor: "#1a4480", category: "Flexi Cap",   type: "Equity",  risk: "Very High",      returns1Y: 22.1,  returns3Y: 24.3, returns5Y: 19.8, nav: 78.12,    aum: "₹58,340 Cr",   minSip: 1000, minLumpsum: 1000,  rating: 5 },
  { id: "quant-smallcap",     name: "Quant Small Cap Fund",               amc: "Quant MF",     amcColor: "#c41230", category: "Small Cap",   type: "Equity",  risk: "Very High",      returns1Y: 42.3,  returns3Y: 45.2, returns5Y: 38.4, nav: 234.56,   aum: "₹22,340 Cr",   minSip: 1000, minLumpsum: 5000,  rating: 4 },
  { id: "dsp-nifty-next50",   name: "DSP Nifty Next 50 Index Fund",       amc: "DSP MF",       amcColor: "#00539b", category: "Index Fund",  type: "Equity",  risk: "Very High",      returns1Y: 18.3,  returns3Y: 21.4, returns5Y: 16.2, nav: 42.34,    aum: "₹3,240 Cr",    minSip: 100,  minLumpsum: 500,   rating: 4 },
  { id: "icici-balanced",     name: "ICICI Pru Balanced Advantage Fund",  amc: "ICICI Pru MF", amcColor: "#f58220", category: "Hybrid",      type: "Hybrid",  risk: "Moderate",       returns1Y: 13.4,  returns3Y: 17.2, returns5Y: 14.8, nav: 64.23,    aum: "₹52,340 Cr",   minSip: 500,  minLumpsum: 5000,  rating: 5 },
  { id: "sbi-liquid",         name: "SBI Liquid Fund",                    amc: "SBI MF",       amcColor: "#1e3a8a", category: "Liquid",      type: "Debt",    risk: "Low",            returns1Y: 7.2,   returns3Y: 6.8,  returns5Y: 6.5,  nav: 3842.45,  aum: "₹78,230 Cr",   minSip: 500,  minLumpsum: 5000,  rating: 4 },
  { id: "kotak-gilt",         name: "Kotak Gilt Fund",                    amc: "Kotak MF",     amcColor: "#da291c", category: "Gilt",        type: "Debt",    risk: "Moderate",       returns1Y: 8.4,   returns3Y: 7.2,  returns5Y: 8.1,  nav: 92.34,    aum: "₹3,450 Cr",    minSip: 1000, minLumpsum: 5000,  rating: 3 },
  { id: "hdfc-short-term",    name: "HDFC Short Term Debt Fund",          amc: "HDFC MF",      amcColor: "#e4002b", category: "Short Duration", type: "Debt", risk: "Low to Moderate", returns1Y: 7.8,  returns3Y: 6.9,  returns5Y: 7.4,  nav: 26.78,    aum: "₹14,230 Cr",   minSip: 300,  minLumpsum: 5000,  rating: 4 },
];

const CATEGORIES = [
  { label: "All",            filter: "all"    },
  { label: "Equity",         filter: "Equity" },
  { label: "Debt",           filter: "Debt"   },
  { label: "Hybrid",         filter: "Hybrid" },
  { label: "ELSS",           filter: "ELSS"   },
  { label: "Index Funds",    filter: "Index Fund" },
  { label: "International",  filter: "International" },
];

const EXPLORE_CARDS = [
  { label: "Large Cap",    sub: "Stable, top 100 companies",     color: "#6366f1", funds: 45,  returns: "~14%/yr" },
  { label: "Mid Cap",      sub: "High growth, next 150 cos",     color: "#00b386", funds: 38,  returns: "~22%/yr" },
  { label: "Small Cap",    sub: "Max growth, smaller companies", color: "#e84040", funds: 32,  returns: "~28%/yr" },
  { label: "ELSS",         sub: "Save tax under 80C",            color: "#f59e0b", funds: 40,  returns: "~18%/yr" },
  { label: "Index Funds",  sub: "Low cost, market returns",      color: "#3b82f6", funds: 62,  returns: "~12%/yr" },
  { label: "Liquid",       sub: "Park surplus money",            color: "#0ea5e9", funds: 28,  returns: "~7%/yr"  },
  { label: "Hybrid",       sub: "Balanced equity + debt",        color: "#8b5cf6", funds: 34,  returns: "~15%/yr" },
  { label: "International",sub: "Global diversification",        color: "#ec4899", funds: 18,  returns: "~16%/yr" },
];

const MY_INVESTMENTS = [
  { name: "Axis Bluechip Fund", amc: "Axis MF", amcColor: "#6c0a8e", invested: 25000, current: 29840, units: 567.23, nav: 52.34, sipAmt: 5000, sipDate: 5 },
  { name: "HDFC Mid-Cap Opportunities", amc: "HDFC MF", amcColor: "#e4002b", invested: 18000, current: 22410, units: 119.47, nav: 187.45, sipAmt: 3000, sipDate: 10 },
  { name: "Parag Parikh Flexi Cap", amc: "PPFAS MF", amcColor: "#1a4480", invested: 12000, current: 14650, units: 187.54, nav: 78.12, sipAmt: 2000, sipDate: 15 },
];

/* ─── Helpers ─── */
function riskColor(r: Risk) {
  if (r === "Very High")       return { bg: "#fef2f2", text: "#e84040" };
  if (r === "High")            return { bg: "#fff7ed", text: "#ea580c" };
  if (r === "Moderate")        return { bg: "#fffbeb", text: "#d97706" };
  if (r === "Low to Moderate") return { bg: "#f0fdf4", text: "#16a34a" };
  return                              { bg: "#f0fdf4", text: "#00b386" };
}

function StarRating({ n }: { n: number }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <svg key={i} width="10" height="10" viewBox="0 0 24 24"
          fill={i <= n ? "#f59e0b" : "none"} stroke={i <= n ? "#f59e0b" : "#d0d0d0"} strokeWidth="2">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      ))}
    </div>
  );
}

/* ─── Page ─── */
export default function MutualFundsPage() {
  const [subTab, setSubTab] = useState<"Explore" | "My Investments" | "SIPs" | "Orders">("Explore");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"1Y" | "3Y" | "5Y">("3Y");
  const [search, setSearch] = useState("");
  const [investModal, setInvestModal] = useState<Fund | null>(null);
  const [investType, setInvestType] = useState<"SIP" | "Lumpsum">("SIP");
  const [amount, setAmount] = useState("");
  const [ordered, setOrdered] = useState(false);

  const filtered = FUNDS.filter(f => {
    const matchCat = categoryFilter === "all" || f.type === categoryFilter || f.category === categoryFilter ||
      (categoryFilter === "ELSS" && f.category === "ELSS") ||
      (categoryFilter === "Index Fund" && f.category === "Index Fund");
    const matchSearch = !search || f.name.toLowerCase().includes(search.toLowerCase()) || f.amc.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  }).sort((a, b) => {
    if (sortBy === "1Y") return b.returns1Y - a.returns1Y;
    if (sortBy === "3Y") return b.returns3Y - a.returns3Y;
    return b.returns5Y - a.returns5Y;
  });

  function handleInvest() {
    setOrdered(true);
    setTimeout(() => { setOrdered(false); setInvestModal(null); setAmount(""); }, 2500);
  }

  const totalInvested = MY_INVESTMENTS.reduce((s, m) => s + m.invested, 0);
  const totalCurrent  = MY_INVESTMENTS.reduce((s, m) => s + m.current,  0);
  const totalPnL      = totalCurrent - totalInvested;
  const totalPct      = (totalPnL / totalInvested) * 100;

  return (
    <div className="max-w-[1440px] space-y-0">

      {/* ── MF Sub-nav ── */}
      <div className="flex items-center gap-1 border-b border-[#f0f0f0] -mx-8 sm:-mx-12 px-8 sm:px-12 mb-6 bg-white">
        {(["Explore", "My Investments", "SIPs", "Orders"] as const).map(t => (
          <button key={t} onClick={() => setSubTab(t)}
            className={`py-3 px-1 mr-5 text-sm font-medium border-b-2 transition-colors shrink-0 ${
              subTab === t ? "text-[#00b386] border-[#00b386]" : "text-[#6b7280] border-transparent hover:text-[#1a1a1a]"
            }`}>
            {t}
          </button>
        ))}
      </div>

      {/* ════════ EXPLORE TAB ════════ */}
      {subTab === "Explore" && (
        <div className="flex gap-6 items-start">

          {/* Left main */}
          <div className="flex-1 min-w-0 space-y-6">

            {/* Search */}
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9ca3af]">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </div>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search for mutual funds, AMCs..."
                className="w-full pl-11 pr-4 py-3 bg-white border border-[#e8e8e8] rounded-xl text-[#1a1a1a] text-sm placeholder-[#9ca3af] focus:border-[#00b386] focus:outline-none focus:ring-2 focus:ring-[#00b386]/10 shadow-[0_1px_4px_rgba(0,0,0,0.04)] transition-colors"
              />
            </div>

            {/* Category cards */}
            {!search && (
              <div>
                <h2 className="text-[#1a1a1a] font-semibold text-base mb-3">Explore by category</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {EXPLORE_CARDS.map(c => (
                    <button key={c.label}
                      onClick={() => setCategoryFilter(
                        c.label === "Large Cap" || c.label === "Mid Cap" || c.label === "Small Cap" || c.label === "Hybrid" || c.label === "Liquid" || c.label === "International"
                          ? "Equity" : c.label === "ELSS" ? "ELSS" : c.label === "Index Funds" ? "Index Fund" : "all"
                      )}
                      className="bg-white border border-[#e8e8e8] rounded-xl p-4 text-left hover:border-[#d0d0d0] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-all group">
                      <div className="w-9 h-9 rounded-xl mb-3 flex items-center justify-center text-white text-xs font-bold"
                        style={{ background: c.color + "18", color: c.color }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>
                        </svg>
                      </div>
                      <div className="text-[#1a1a1a] font-semibold text-sm group-hover:text-[#00b386] transition-colors">{c.label}</div>
                      <div className="text-[#9ca3af] text-xs mt-0.5">{c.sub}</div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-[#6b7280] text-xs">{c.funds} funds</span>
                        <span className="text-[#00b386] text-xs font-semibold">{c.returns}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Filter pills + sort */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                {CATEGORIES.map(c => (
                  <button key={c.label}
                    onClick={() => setCategoryFilter(c.filter)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      categoryFilter === c.filter
                        ? "bg-[#00b386] text-white border-[#00b386]"
                        : "bg-white text-[#6b7280] border-[#e8e8e8] hover:border-[#c8c8c8] hover:text-[#1a1a1a]"
                    }`}>
                    {c.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-[#9ca3af] text-xs mr-1">Sort by returns:</span>
                {(["1Y","3Y","5Y"] as const).map(s => (
                  <button key={s} onClick={() => setSortBy(s)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${sortBy === s ? "bg-[#e8f9f4] text-[#00b386]" : "text-[#6b7280] hover:bg-[#f8f9fa]"}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Fund list */}
            <div className="bg-white border border-[#e8e8e8] rounded-xl overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
              {/* Table header */}
              <div className="grid grid-cols-[2.5fr_80px_80px_80px_100px_80px] items-center px-5 py-3 bg-[#fafafa] border-b border-[#f0f0f0] text-xs text-[#9ca3af] font-medium">
                <span>Fund</span>
                <span className="text-right">1Y</span>
                <span className="text-right">3Y</span>
                <span className="text-right">5Y</span>
                <span className="text-right">Min SIP</span>
                <span />
              </div>

              {filtered.length === 0 ? (
                <div className="py-16 text-center text-[#9ca3af] text-sm">No funds found</div>
              ) : filtered.map((f, i) => {
                const rc = riskColor(f.risk);
                const sortedReturn = sortBy === "1Y" ? f.returns1Y : sortBy === "3Y" ? f.returns3Y : f.returns5Y;
                return (
                  <div key={f.id}
                    className={`grid grid-cols-[2.5fr_80px_80px_80px_100px_80px] items-center px-5 py-4 hover:bg-[#f8f9fa] transition-colors ${i < filtered.length - 1 ? "border-b border-[#f5f5f5]" : ""}`}>

                    {/* Fund info */}
                    <div className="flex items-center gap-3 min-w-0 pr-4">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-xs shrink-0"
                        style={{ background: f.amcColor }}>
                        {f.amc.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-[#1a1a1a] font-semibold text-sm leading-tight truncate">{f.name}</div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-[#9ca3af] text-xs">{f.amc}</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ background: rc.bg, color: rc.text }}>{f.risk}</span>
                          <StarRating n={f.rating} />
                        </div>
                        <div className="text-[#9ca3af] text-xs mt-0.5">NAV ₹{f.nav.toLocaleString("en-IN")} · AUM {f.aum}</div>
                      </div>
                    </div>

                    {/* Returns */}
                    <div className={`text-right text-sm font-semibold ${f.returns1Y >= 0 ? "text-[#00b386]" : "text-[#e84040]"}`}>
                      {f.returns1Y >= 0 ? "+" : ""}{f.returns1Y.toFixed(1)}%
                    </div>
                    <div className={`text-right text-sm font-semibold ${f.returns3Y >= 0 ? "text-[#00b386]" : "text-[#e84040]"}`}>
                      {f.returns3Y >= 0 ? "+" : ""}{f.returns3Y.toFixed(1)}%
                    </div>
                    <div className={`text-right text-sm font-semibold ${f.returns5Y >= 0 ? "text-[#00b386]" : "text-[#e84040]"}`}>
                      {f.returns5Y >= 0 ? "+" : ""}{f.returns5Y.toFixed(1)}%
                    </div>

                    {/* Min SIP */}
                    <div className="text-right">
                      <div className="text-[#1a1a1a] text-sm font-medium">₹{f.minSip.toLocaleString("en-IN")}/mo</div>
                      <div className="text-[#9ca3af] text-xs">SIP</div>
                    </div>

                    {/* Invest button */}
                    <div className="flex justify-end">
                      <button
                        onClick={() => { setInvestModal(f); setAmount(String(f.minSip)); }}
                        className="px-4 py-1.5 rounded-lg border border-[#00b386] text-[#00b386] text-xs font-semibold hover:bg-[#00b386] hover:text-white transition-all">
                        Invest
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right sidebar */}
          <div className="hidden xl:flex flex-col gap-4 w-[280px] shrink-0">

            {/* My investments summary */}
            <div className="bg-white border border-[#e8e8e8] rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.04)] p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[#1a1a1a] font-semibold text-sm">Your MF Investments</h3>
                <button onClick={() => setSubTab("My Investments")} className="text-[#00b386] text-xs hover:underline">View all</button>
              </div>
              <div className="text-[#9ca3af] text-xs mb-0.5">Current value</div>
              <div className="text-2xl font-bold text-[#1a1a1a] tracking-tight mb-3">
                ₹{totalCurrent.toLocaleString("en-IN")}
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-[#6b7280]">Invested</span><span className="font-medium text-[#1a1a1a]">₹{totalInvested.toLocaleString("en-IN")}</span></div>
                <div className="flex justify-between"><span className="text-[#6b7280]">Total returns</span><span className={`font-semibold ${totalPnL >= 0 ? "text-[#00b386]" : "text-[#e84040]"}`}>+₹{totalPnL.toLocaleString("en-IN")} ({totalPct.toFixed(1)}%)</span></div>
              </div>
              <div className="mt-3 h-1.5 bg-[#f0f0f0] rounded-full overflow-hidden">
                <div className="h-full bg-[#00b386] rounded-full" style={{ width: `${Math.min((totalCurrent/totalInvested)*50, 100)}%` }} />
              </div>
            </div>

            {/* Top picks */}
            <div className="bg-white border border-[#e8e8e8] rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.04)] p-5">
              <h3 className="text-[#1a1a1a] font-semibold text-sm mb-3">Top Picks for You</h3>
              <div className="space-y-3">
                {FUNDS.slice(0, 3).map(f => (
                  <div key={f.id} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg text-white text-xs font-bold flex items-center justify-center shrink-0" style={{ background: f.amcColor }}>
                      {f.amc.slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[#1a1a1a] text-xs font-semibold truncate">{f.name.split(" ").slice(0, 3).join(" ")}</div>
                      <div className="text-[#9ca3af] text-[10px]">{f.category}</div>
                    </div>
                    <div className="text-[#00b386] text-xs font-bold shrink-0">+{f.returns3Y}%</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Why invest */}
            <div className="bg-gradient-to-br from-[#e8f9f4] to-[#f0fdf8] border border-[#00b386]/20 rounded-xl p-5">
              <h3 className="text-[#1a1a1a] font-semibold text-sm mb-3">Why Mutual Funds?</h3>
              <div className="space-y-2.5">
                {[
                  "Start with as low as ₹100/month",
                  "Professionally managed portfolios",
                  "Diversified risk across stocks",
                  "Tax-efficient with ELSS (80C)",
                  "Transparent NAV updated daily",
                ].map(p => (
                  <div key={p} className="flex items-start gap-2">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#00b386" strokeWidth="2.5" strokeLinecap="round" className="mt-0.5 shrink-0"><polyline points="20 6 9 17 4 12"/></svg>
                    <span className="text-[#6b7280] text-xs">{p}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════ MY INVESTMENTS TAB ════════ */}
      {subTab === "My Investments" && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { l: "Current Value",  v: `₹${totalCurrent.toLocaleString("en-IN")}`,  c: "#1a1a1a" },
              { l: "Invested",       v: `₹${totalInvested.toLocaleString("en-IN")}`, c: "#1a1a1a" },
              { l: "Total Returns",  v: `+₹${totalPnL.toLocaleString("en-IN")}`,      c: "#00b386" },
              { l: "XIRR",          v: "+14.8%",                                      c: "#00b386" },
            ].map(s => (
              <div key={s.l} className="bg-white border border-[#e8e8e8] rounded-xl p-5 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
                <div className="text-[#9ca3af] text-xs mb-1">{s.l}</div>
                <div className="text-xl font-bold tracking-tight" style={{ color: s.c }}>{s.v}</div>
              </div>
            ))}
          </div>

          {/* Holdings */}
          <div className="bg-white border border-[#e8e8e8] rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.04)] overflow-hidden">
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] px-5 py-3 bg-[#fafafa] border-b border-[#f0f0f0] text-xs text-[#9ca3af] font-medium">
              <span>Fund</span><span className="text-right">Invested</span><span className="text-right">Current</span><span className="text-right">Returns</span><span className="text-right">Units</span>
            </div>
            {MY_INVESTMENTS.map((m, i) => {
              const pnl = m.current - m.invested;
              const pct = (pnl / m.invested) * 100;
              return (
                <div key={m.name} className={`grid grid-cols-[2fr_1fr_1fr_1fr_1fr] items-center px-5 py-4 hover:bg-[#f8f9fa] transition-colors ${i < MY_INVESTMENTS.length - 1 ? "border-b border-[#f5f5f5]" : ""}`}>
                  <div className="flex items-center gap-3 min-w-0 pr-4">
                    <div className="w-9 h-9 rounded-xl text-white text-xs font-bold flex items-center justify-center shrink-0" style={{ background: m.amcColor }}>
                      {m.amc.slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[#1a1a1a] font-semibold text-sm truncate">{m.name}</div>
                      <div className="text-[#9ca3af] text-xs">{m.amc} · NAV ₹{m.nav}</div>
                    </div>
                  </div>
                  <div className="text-right text-[#1a1a1a] text-sm font-medium">₹{m.invested.toLocaleString("en-IN")}</div>
                  <div className="text-right text-[#1a1a1a] text-sm font-medium">₹{m.current.toLocaleString("en-IN")}</div>
                  <div className="text-right">
                    <div className="text-[#00b386] text-sm font-bold">+₹{pnl.toLocaleString("en-IN")}</div>
                    <div className="text-[#00b386] text-xs">+{pct.toFixed(1)}%</div>
                  </div>
                  <div className="text-right text-[#6b7280] text-sm">{m.units.toFixed(3)}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ════════ SIPs TAB ════════ */}
      {subTab === "SIPs" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[#1a1a1a] font-semibold text-base">Active SIPs</h2>
              <p className="text-[#9ca3af] text-sm mt-0.5">Total monthly investment: ₹{MY_INVESTMENTS.reduce((s, m) => s + m.sipAmt, 0).toLocaleString("en-IN")}</p>
            </div>
            <button className="px-4 py-2 rounded-lg bg-[#00b386] text-white text-sm font-semibold hover:bg-[#009e78] transition-colors">+ New SIP</button>
          </div>

          <div className="bg-white border border-[#e8e8e8] rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.04)] overflow-hidden">
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_100px] px-5 py-3 bg-[#fafafa] border-b border-[#f0f0f0] text-xs text-[#9ca3af] font-medium">
              <span>Fund</span><span className="text-right">SIP Amount</span><span className="text-right">Date</span><span className="text-right">Next Date</span><span />
            </div>
            {MY_INVESTMENTS.map((m, i) => (
              <div key={m.name} className={`grid grid-cols-[2fr_1fr_1fr_1fr_100px] items-center px-5 py-4 hover:bg-[#f8f9fa] transition-colors ${i < MY_INVESTMENTS.length - 1 ? "border-b border-[#f5f5f5]" : ""}`}>
                <div className="flex items-center gap-3 min-w-0 pr-4">
                  <div className="w-9 h-9 rounded-xl text-white text-xs font-bold flex items-center justify-center shrink-0" style={{ background: m.amcColor }}>
                    {m.amc.slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[#1a1a1a] font-semibold text-sm truncate">{m.name}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#00b386]" />
                      <span className="text-[#00b386] text-xs font-medium">Active</span>
                    </div>
                  </div>
                </div>
                <div className="text-right text-[#1a1a1a] text-sm font-semibold">₹{m.sipAmt.toLocaleString("en-IN")}</div>
                <div className="text-right text-[#6b7280] text-sm">{m.sipDate}th</div>
                <div className="text-right text-[#1a1a1a] text-sm">Jul {m.sipDate}, 2026</div>
                <div className="flex justify-end gap-2">
                  <button className="px-2.5 py-1 rounded text-xs text-[#6b7280] border border-[#e8e8e8] hover:border-[#c8c8c8] transition-colors">Pause</button>
                  <button className="px-2.5 py-1 rounded text-xs text-[#e84040] border border-[#e8e8e8] hover:border-[#e84040] transition-colors">Stop</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ════════ ORDERS TAB ════════ */}
      {subTab === "Orders" && (
        <div className="bg-white border border-[#e8e8e8] rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] px-5 py-3 bg-[#fafafa] border-b border-[#f0f0f0] text-xs text-[#9ca3af] font-medium">
            <span>Fund</span><span className="text-right">Type</span><span className="text-right">Amount</span><span className="text-right">Status</span><span className="text-right">Date</span>
          </div>
          {[
            { fund: "Axis Bluechip Fund",        amc: "Axis MF",    amcColor: "#6c0a8e", type: "SIP",     amount: 5000, status: "PROCESSED", date: "Jun 5, 2026"  },
            { fund: "HDFC Mid-Cap Opportunities", amc: "HDFC MF",    amcColor: "#e4002b", type: "SIP",     amount: 3000, status: "PROCESSED", date: "Jun 10, 2026" },
            { fund: "Parag Parikh Flexi Cap",     amc: "PPFAS MF",   amcColor: "#1a4480", type: "Lumpsum", amount: 10000,status: "PROCESSED", date: "May 20, 2026" },
            { fund: "Axis Bluechip Fund",          amc: "Axis MF",   amcColor: "#6c0a8e", type: "SIP",     amount: 5000, status: "PENDING",   date: "Jul 5, 2026"  },
          ].map((o, i) => (
            <div key={i} className={`grid grid-cols-[2fr_1fr_1fr_1fr_1fr] items-center px-5 py-4 hover:bg-[#f8f9fa] transition-colors ${i < 3 ? "border-b border-[#f5f5f5]" : ""}`}>
              <div className="flex items-center gap-3 min-w-0 pr-4">
                <div className="w-8 h-8 rounded-lg text-white text-xs font-bold flex items-center justify-center shrink-0" style={{ background: o.amcColor }}>
                  {o.amc.slice(0, 2)}
                </div>
                <div className="text-[#1a1a1a] text-sm font-semibold truncate">{o.fund}</div>
              </div>
              <div className="text-right">
                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${o.type === "SIP" ? "bg-[#eff6ff] text-[#3b82f6]" : "bg-[#f0fdf4] text-[#16a34a]"}`}>{o.type}</span>
              </div>
              <div className="text-right text-[#1a1a1a] text-sm font-medium">₹{o.amount.toLocaleString("en-IN")}</div>
              <div className="text-right">
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${o.status === "PROCESSED" ? "bg-[#e8f9f4] text-[#00b386]" : "bg-[#fffbeb] text-[#d97706]"}`}>{o.status}</span>
              </div>
              <div className="text-right text-[#9ca3af] text-sm">{o.date}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Invest Modal ── */}
      {investModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white border border-[#e8e8e8] rounded-2xl w-full max-w-sm shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
            {/* Header */}
            <div className="flex items-center gap-3 p-5 border-b border-[#f0f0f0]">
              <div className="w-10 h-10 rounded-xl text-white text-xs font-bold flex items-center justify-center shrink-0" style={{ background: investModal.amcColor }}>
                {investModal.amc.slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[#1a1a1a] font-semibold text-sm leading-tight">{investModal.name}</div>
                <div className="text-[#9ca3af] text-xs">{investModal.amc} · NAV ₹{investModal.nav}</div>
              </div>
              <button onClick={() => setInvestModal(null)} className="text-[#9ca3af] hover:text-[#1a1a1a] p-1">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* SIP / Lumpsum */}
              <div className="flex rounded-xl overflow-hidden border border-[#e8e8e8]">
                {(["SIP", "Lumpsum"] as const).map(t => (
                  <button key={t} onClick={() => { setInvestType(t); setAmount(String(t === "SIP" ? investModal.minSip : investModal.minLumpsum)); }}
                    className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${investType === t ? "bg-[#00b386] text-white" : "text-[#6b7280] hover:bg-[#f8f9fa]"}`}>
                    {t}
                  </button>
                ))}
              </div>

              {/* Quick amounts */}
              <div className="flex gap-2">
                {(investType === "SIP" ? [500, 1000, 5000] : [5000, 10000, 25000]).map(a => (
                  <button key={a} onClick={() => setAmount(String(a))}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${amount === String(a) ? "border-[#00b386] text-[#00b386] bg-[#e8f9f4]" : "border-[#e8e8e8] text-[#6b7280] hover:border-[#c8c8c8]"}`}>
                    ₹{a.toLocaleString("en-IN")}
                  </button>
                ))}
              </div>

              {/* Amount input */}
              <div>
                <label className="text-[#6b7280] text-xs font-medium block mb-1.5">
                  {investType === "SIP" ? "Monthly SIP Amount" : "Investment Amount"}
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6b7280] text-sm font-medium">₹</span>
                  <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                    className="w-full pl-8 pr-4 py-2.5 border border-[#e8e8e8] rounded-xl text-[#1a1a1a] font-semibold text-sm focus:border-[#00b386] focus:outline-none focus:ring-2 focus:ring-[#00b386]/10 transition-colors" />
                </div>
                <div className="text-[#9ca3af] text-xs mt-1">Min: ₹{(investType === "SIP" ? investModal.minSip : investModal.minLumpsum).toLocaleString("en-IN")}</div>
              </div>

              {investType === "SIP" && (
                <div className="flex items-center justify-between py-2 border-t border-[#f0f0f0]">
                  <span className="text-[#6b7280] text-sm">Monthly SIP date</span>
                  <span className="text-[#1a1a1a] text-sm font-semibold">5th of every month</span>
                </div>
              )}

              {/* Returns preview */}
              {amount && Number(amount) > 0 && (
                <div className="bg-[#f8fffe] border border-[#00b386]/20 rounded-xl p-3">
                  <div className="text-[#6b7280] text-xs mb-2">Estimated returns (at {investModal.returns3Y}% p.a.)</div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {[1,3,5].map(yr => {
                      const invested = investType === "SIP" ? Number(amount) * 12 * yr : Number(amount);
                      const val = investType === "SIP"
                        ? Number(amount) * ((Math.pow(1 + investModal.returns3Y/1200, 12*yr) - 1) / (investModal.returns3Y/1200)) * (1 + investModal.returns3Y/1200)
                        : Number(amount) * Math.pow(1 + investModal.returns3Y/100, yr);
                      return (
                        <div key={yr}>
                          <div className="text-[#9ca3af] text-[10px]">{yr}Y</div>
                          <div className="text-[#00b386] text-xs font-bold">₹{Math.round(val).toLocaleString("en-IN")}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <button onClick={handleInvest} disabled={!amount || Number(amount) < (investType === "SIP" ? investModal.minSip : investModal.minLumpsum)}
                className="w-full py-3 rounded-xl bg-[#00b386] text-white font-semibold text-sm hover:bg-[#009e78] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                {investType === "SIP" ? "Start SIP" : "Invest Now"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Success toast ── */}
      {ordered && (
        <div className="fixed bottom-6 right-6 z-50 bg-white border border-[#00b386]/40 rounded-2xl p-4 shadow-[0_4px_16px_rgba(0,0,0,0.1)] flex items-center gap-3 min-w-72 slide-in">
          <div className="w-10 h-10 rounded-full bg-[#e8f9f4] flex items-center justify-center shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00b386" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div>
            <div className="text-[#1a1a1a] font-bold text-sm">{investType === "SIP" ? "SIP Started!" : "Investment Placed!"}</div>
            <div className="text-[#6b7280] text-xs mt-0.5">₹{Number(amount).toLocaleString("en-IN")} · {investModal?.name}</div>
            <button onClick={() => setSubTab("My Investments")} className="text-[#00b386] text-xs hover:underline">View in My Investments →</button>
          </div>
        </div>
      )}

    </div>
  );
}
