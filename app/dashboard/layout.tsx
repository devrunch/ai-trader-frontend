"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ChatWidget from "./ChatWidget";

/* ─── Icons ─── */
const IC = {
  search:   <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  bell:     <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  terminal: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>,
  settings: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  globe:    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
};

/* ─── Sub-nav tabs ─── */
const TABS = [
  { href: "/dashboard",            label: "Explore"   },
  { href: "/dashboard/signals",    label: "Signals"   },
  { href: "/dashboard/holdings",   label: "Holdings"  },
  { href: "/dashboard/portfolio",  label: "Portfolio" },
  { href: "/dashboard/orders",     label: "Orders"    },
  { href: "/dashboard/watchlist",  label: "Watchlist" },
];

/* ─── Indices ─── */
const INDICES = [
  { name: "NIFTY",      value: "23,393.25", change: "-90.30",  pct: "0.38%", up: false },
  { name: "SENSEX",     value: "74,294.98", change: "-354.86", pct: "0.48%", up: false },
  { name: "BANKNIFTY",  value: "54,149.20", change: "+434.55", pct: "0.81%", up: true  },
  { name: "MIDCPNIFTY", value: "14,137.55", change: "-102.90", pct: "0.72%", up: false },
  { name: "FINNIFTY",   value: "24,927.10", change: "+124.30", pct: "0.50%", up: true  },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  /* Map sub-tab active state */
  function isActive(tab: { href: string; label: string }) {
    if (tab.label === "Explore")   return pathname === "/dashboard";
    if (tab.label === "Holdings")  return pathname === "/dashboard/holdings";
    if (tab.label === "Portfolio") return pathname === "/dashboard/portfolio";
    return pathname === tab.href;
  }

  return (
    <div className="h-screen bg-[#f8f9fa] flex flex-col overflow-hidden">

      {/* ── Row 1: Main header ── */}
      <header className="bg-white border-b border-[#e8e8e8] h-14 flex items-center px-8 sm:px-12 gap-6 shrink-0 z-30 sticky top-0">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00b386] to-[#00d4a0] flex items-center justify-center text-white font-bold text-xs">
            AI
          </div>
          <span className="font-bold text-[#1a1a1a] text-base tracking-tight hidden sm:block">
            AI<span className="text-[#00b386]">Trader</span>
          </span>
        </Link>

        {/* Main category tabs */}
        <div className="hidden md:flex items-center gap-1">
          {[
            { label: "Stocks",       href: "/dashboard"              },
            { label: "F&O",          href: "/dashboard/fno"          },
            { label: "Mutual Funds", href: "/dashboard/mutual-funds" },
          ].map((t) => {
            const active =
              t.label === "Mutual Funds" ? pathname.startsWith("/dashboard/mutual-funds") :
              t.label === "F&O"          ? pathname.startsWith("/dashboard/fno") :
              !pathname.startsWith("/dashboard/mutual-funds") && !pathname.startsWith("/dashboard/fno");
            return (
              <Link key={t.label} href={t.href}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  active ? "text-[#1a1a1a] font-semibold" : "text-[#6b7280] hover:text-[#1a1a1a]"
                }`}>
                {t.label}
              </Link>
            );
          })}
        </div>

        {/* Search */}
        <div className="flex-1 max-w-sm">
          <div className="flex items-center gap-2 bg-[#f8f9fa] border border-[#e8e8e8] rounded-lg px-3 py-2 hover:border-[#c8c8c8] transition-colors">
            <span className="text-[#9ca3af] shrink-0">{IC.search}</span>
            <input
              placeholder="Search stocks, F&O, mutual funds..."
              className="flex-1 bg-transparent text-sm text-[#1a1a1a] placeholder-[#9ca3af] outline-none min-w-0"
            />
            <kbd className="hidden sm:block text-[#b0b0b0] text-[10px] border border-[#e0e0e0] rounded px-1.5 py-0.5 shrink-0">
              Ctrl+K
            </kbd>
          </div>
        </div>

        <div className="flex-1" />

        {/* Right controls */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Terminal */}
          <button className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#e8e8e8] text-[#6b7280] text-xs font-medium hover:bg-[#f8f9fa] transition-colors">
            {IC.terminal}
            Terminal
          </button>

          {/* Market time */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#e8f9f4] border border-[#00b386]/20">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00b386] animate-pulse" />
            <span className="text-[#00b386] text-xs font-semibold">9:15</span>
          </div>

          {/* Bell */}
          <button className="relative p-2 text-[#6b7280] hover:text-[#1a1a1a] transition-colors">
            {IC.bell}
            <span className="absolute top-1.5 right-1.5 w-[7px] h-[7px] rounded-full bg-[#e84040] border border-white" />
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#e84040] text-white text-[9px] font-bold flex items-center justify-center">4</span>
          </button>

          {/* Settings */}
          <Link href="/dashboard/settings" className="p-2 text-[#6b7280] hover:text-[#1a1a1a] transition-colors">
            {IC.settings}
          </Link>

          {/* Avatar */}
          <Link href="/dashboard/profile"
            className="w-8 h-8 rounded-full bg-[#00b386] flex items-center justify-center text-white font-bold text-sm hover:ring-2 hover:ring-[#00b386]/40 hover:ring-offset-1 transition-all">
            A
          </Link>
        </div>
      </header>

      {/* ── Row 2: Sub-nav tabs ── */}
      <div className="bg-white border-b border-[#e8e8e8] shrink-0 sticky top-14 z-20">
        <div className="flex items-center px-8 sm:px-12 overflow-x-auto no-scrollbar">
          {TABS.map((tab) => {
            const active = isActive(tab);
            return (
              <Link
                key={tab.label}
                href={tab.href}
                className={`shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-all ${
                  active
                    ? "text-[#00b386] border-[#00b386]"
                    : "text-[#6b7280] border-transparent hover:text-[#1a1a1a] hover:border-[#d0d0d0]"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}

          <div className="flex-1" />

          {/* Right: globe icon */}
          <button className="shrink-0 p-2 text-[#9ca3af] hover:text-[#6b7280] transition-colors ml-2">
            {IC.globe}
          </button>
        </div>
      </div>

      {/* ── Row 3: Indices bar ── */}
      <div className="bg-white border-b border-[#e8e8e8] shrink-0 overflow-hidden sticky top-[92px] z-10">
        <div className="flex items-stretch min-w-max h-9">
          {INDICES.map((idx, i) => (
            <div
              key={idx.name}
              className={`flex items-center gap-2 cursor-default hover:bg-[#f8f9fa] transition-colors ${
                i === 0 ? "pl-8 sm:pl-12 pr-5" : i < INDICES.length - 1 ? "px-5 border-l border-[#f0f0f0]" : "px-5 border-l border-[#f0f0f0]"
              }`}
            >
              <span className="text-[#6b7280] text-xs font-medium">{idx.name}</span>
              <span className="text-[#1a1a1a] text-xs font-semibold font-mono">{idx.value}</span>
              <span className={`text-xs font-semibold ${idx.up ? "text-[#00b386]" : "text-[#e84040]"}`}>
                {idx.change} ({idx.pct})
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Page content ── */}
      <main className="flex-1 min-h-0 overflow-hidden">
        <div className="h-full max-w-[1440px] mx-auto px-8 sm:px-12 w-full overflow-hidden">
          {children}
        </div>
      </main>

      <ChatWidget />
    </div>
  );
}
