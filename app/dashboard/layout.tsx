"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { getMarketStatus, type ApiMarketStatus } from "@/lib/api";

const IC = {
  bell:     <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  settings: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
};

const TABS = [
  { href: "/dashboard",               label: "Overview"    },
  { href: "/dashboard/signals",       label: "AI Signals"  },
  { href: "/dashboard/paper-trade",   label: "Paper Trade" },
  { href: "/dashboard/news",          label: "News"        },
  { href: "/dashboard/charts",        label: "Charts"      },
];


function fmt(n: number | null | undefined) {
  if (n == null) return "—";
  return n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mkt, setMkt] = useState<ApiMarketStatus | null>(null);

  useEffect(() => {
    getMarketStatus().then(setMkt).catch(() => {});
    const id = setInterval(() => getMarketStatus().then(setMkt).catch(() => {}), 60_000);
    return () => clearInterval(id);
  }, []);

  function isActive(href: string, label: string) {
    if (label === "Overview") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  return (
    <div className="h-screen bg-[#f8f9fa] flex flex-col overflow-hidden">

      {/* ── Header ── */}
      <header className="bg-white border-b border-[#e8e8e8] h-14 flex items-center px-6 sm:px-10 gap-5 shrink-0 z-30 sticky top-0">
        <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-[#00b386] flex items-center justify-center text-white font-bold text-xs">
            AI
          </div>
          <span className="font-bold text-[#1a1a1a] text-base tracking-tight hidden sm:block">
            AI<span className="text-[#00b386]">Trader</span>
          </span>
          <span className="ml-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#eff6ff] text-[#3b82f6] hidden sm:block">
            PAPER
          </span>
        </Link>

        <div className="flex-1" />

        <div className="flex items-center gap-2 shrink-0">
          <button className="relative p-2 text-[#6b7280] hover:text-[#1a1a1a] transition-colors">
            {IC.bell}
          </button>

          <Link href="/dashboard/profile" className="p-2 text-[#6b7280] hover:text-[#1a1a1a] transition-colors">
            {IC.settings}
          </Link>

          <Link href="/dashboard/profile"
            className="w-8 h-8 rounded-full bg-[#00b386] flex items-center justify-center text-white font-bold text-sm hover:ring-2 hover:ring-[#00b386]/40 hover:ring-offset-1 transition-all">
            A
          </Link>
        </div>
      </header>

      {/* ── Nav tabs ── */}
      <div className="bg-white border-b border-[#e8e8e8] shrink-0 sticky top-14 z-20">
        <div className="flex items-center px-6 sm:px-10 overflow-x-auto no-scrollbar">
          {TABS.map(({ href, label }) => {
            const active = isActive(href, label);
            return (
              <Link key={href} href={href}
                className={`shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-all ${
                  active ? "text-[#00b386] border-[#00b386]" : "text-[#6b7280] border-transparent hover:text-[#1a1a1a] hover:border-[#d0d0d0]"
                }`}>
                {label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── Indices bar ── */}
      <div className="bg-white border-b border-[#e8e8e8] shrink-0">
        <div className="flex items-stretch min-w-max h-9">
          {[
            { name: "NIFTY 50", ltp: mkt?.nifty50?.ltp, pct: mkt?.nifty50?.change_percent },
            { name: "SENSEX",   ltp: mkt?.sensex?.ltp,  pct: mkt?.sensex?.change_percent  },
          ].map((idx, i) => {
            const up = (idx.pct ?? 0) >= 0;
            return (
              <div key={idx.name}
                className={`flex items-center gap-2 px-5 ${i > 0 ? "border-l border-[#f0f0f0]" : "pl-6 sm:pl-10"}`}>
                <span className="text-[#6b7280] text-xs font-medium">{idx.name}</span>
                <span className="text-[#1a1a1a] text-xs font-semibold font-mono">
                  {idx.ltp != null ? `₹${fmt(idx.ltp)}` : "—"}
                </span>
                {idx.pct != null && (
                  <span className={`text-xs font-semibold ${up ? "text-[#00b386]" : "text-[#e84040]"}`}>
                    {up ? "+" : ""}{idx.pct.toFixed(2)}%
                  </span>
                )}
              </div>
            );
          })}
          {/* Market status pill */}
          {mkt && (
            <div className="flex items-center px-4 border-l border-[#f0f0f0]">
              <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                mkt.nse_open ? "bg-[#e8f9f4] text-[#00b386]" : "bg-[#f5f5f5] text-[#9ca3af]"
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${mkt.nse_open ? "bg-[#00b386] animate-pulse" : "bg-[#9ca3af]"}`} />
                {mkt.nse_open ? "Market Open" : "Market Closed"}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Content ── */}
      <main className="flex-1 min-h-0 overflow-hidden">
        <div className="h-full max-w-360 mx-auto px-6 sm:px-10 w-full overflow-hidden">
          {children}
        </div>
      </main>

    </div>
  );
}
