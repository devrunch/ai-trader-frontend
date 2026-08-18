"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { MarketStatusProvider, useMarketStatus, nextOpenLabel } from "@/lib/market-status";
import { useCurrentUser } from "@/lib/use-current-user";
import { API_BASE_URL } from "@/lib/api/client";

const TABS = [
  { href: "/dashboard/brief",     label: "Brief"     },
  { href: "/dashboard/terminal",  label: "Terminal"  },
  // The track record was reachable only from an empty state and one Brief link.
  // A product whose credibility rests on publishing its numbers should not hide them.
  { href: "/dashboard/signals",   label: "Signals"   },
  // Backtests used to exist only inside the chat message that produced them —
  // scroll past it and the run was gone.
  { href: "/dashboard/strategies", label: "Strategies" },
  { href: "/dashboard/portfolio", label: "Portfolio" },
];

function fmt(n: number | null | undefined) {
  if (n == null) return "—";
  return n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

const PHASE_LABEL = {
  OPEN:       { text: "OPEN",       colour: "var(--buy)" },
  SQUARE_OFF: { text: "SQUARE-OFF", colour: "#e0ab4a" },
  HOLIDAY:    { text: "HOLIDAY",    colour: "var(--muted-foreground)" },
  CLOSED:     { text: "CLOSED",     colour: "var(--muted-foreground)" },
} as const;

/**
 * Session state and the two index quotes.
 *
 * Deliberately not inside `hidden md:flex` any more: the OPEN/CLOSED chip was
 * the only session indicator in the product and it vanished below 768px.
 */
function MarketPulse() {
  const { status, phase, failed } = useMarketStatus();
  const nifty  = status?.nifty50;
  const sensex = status?.sensex;
  const reopens = nextOpenLabel(status);

  return (
    <div className="flex items-center gap-3 sm:gap-4 font-mono text-xs min-w-0">
      <div className="hidden md:flex items-center gap-4">
        {[
          { name: "NIFTY", ltp: nifty?.ltp, pct: nifty?.change_percent },
          { name: "SENSEX", ltp: sensex?.ltp, pct: sensex?.change_percent },
        ].map(idx => {
          const up = (idx.pct ?? 0) >= 0;
          return (
            <div key={idx.name} className="flex items-center gap-1.5">
              <span className="text-muted-foreground">{idx.name}</span>
              <span className="text-foreground">{idx.ltp != null ? fmt(idx.ltp) : "—"}</span>
              {idx.pct != null && (
                <span style={{ color: up ? "var(--buy)" : "var(--sell)" }}>
                  {up ? "+" : "−"}{Math.abs(idx.pct).toFixed(2)}%
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Persistent session indicator — shown at every width. */}
      {failed ? (
        <span className="flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-semibold"
          style={{ background: "color-mix(in oklch, var(--sell) 12%, transparent)", color: "var(--sell)" }}
          title="Couldn't reach the market status service">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--sell)" }} />
          STATUS UNAVAILABLE
        </span>
      ) : phase ? (
        <span className="flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-semibold shrink-0"
          style={{
            background: phase === "OPEN" ? "color-mix(in oklch, var(--buy) 15%, transparent)" : "var(--secondary)",
            color: PHASE_LABEL[phase].colour,
          }}
          title={phase !== "OPEN" && reopens ? `Reopens ${reopens}` : undefined}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: PHASE_LABEL[phase].colour }} />
          {PHASE_LABEL[phase].text}
          {phase !== "OPEN" && reopens && (
            <span className="hidden lg:inline text-muted-foreground font-normal">· reopens {reopens}</span>
          )}
        </span>
      ) : null}
    </div>
  );
}

/** The signals service told us a data source failed. Say so rather than
 *  presenting the last good value as current. */
function DegradedBanner() {
  const { status } = useMarketStatus();
  if (!status?.degraded) return null;
  return (
    <div role="status" className="px-4 sm:px-8 py-1.5 text-[11px] border-b border-border shrink-0"
      style={{ background: "color-mix(in oklch, #e0ab4a 10%, transparent)", color: "#e0ab4a" }}>
      Some market data didn&apos;t arrive. Prices and index levels shown may be out of date.
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <MarketStatusProvider>
      <DashboardChrome>{children}</DashboardChrome>
    </MarketStatusProvider>
  );
}

function DashboardChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { user } = useCurrentUser();
  // Client-side only for whether to SHOW the link — RolesGuard on the API is
  // what actually protects the page a click away.
  const tabs = user?.role === "admin"
    ? [...TABS, { href: "/dashboard/admin", label: "Admin" }]
    : TABS;

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  async function logout() {
    try {
      await fetch(`${API_BASE_URL}/api/auth/logout`, { method: "POST", credentials: "include" });
    } catch { /* ignore */ }
    window.location.href = "/login";
  }

  return (
    <div className="h-screen bg-background text-foreground flex flex-col overflow-hidden">

      {/* ── Header ── */}
      <header className="bg-background border-b border-border h-14 flex items-center px-4 sm:px-8 gap-5 shrink-0 z-30">
        <Link href="/dashboard/terminal" className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 bg-primary flex items-center justify-center text-primary-foreground font-bold text-xs">AI</div>
          <span className="font-semibold text-base tracking-tight hidden sm:block">AI<span className="text-link">Trader</span></span>
          <span
            title="Paper trading only, no real money — this is an MVP for testing."
            className="ml-1 px-1.5 py-0.5 text-[9px] font-bold bg-primary/15 text-link hidden sm:block"
          >
            PAPER · MVP
          </span>
        </Link>

        {/* Nav tabs */}
        <nav className="flex items-center gap-1 ml-2">
          {tabs.map(({ href, label }) => {
            const active = pathname.startsWith(href);
            return (
              <Link key={href} href={href}
                // Remember an explicit choice so the time-aware landing at
                // /dashboard doesn't override where the user wanted to be.
                onClick={() => sessionStorage.setItem("lastDashboardTab", href)}
                className={`px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  active ? "text-foreground bg-secondary" : "text-muted-foreground hover:text-foreground"
                }`}>
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="flex-1" />

        <MarketPulse />

        {/* Avatar menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="w-8 h-8 bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm hover:ring-2 hover:ring-primary/40 hover:ring-offset-1 hover:ring-offset-background transition-all"
          >
            A
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 w-44 bg-card border border-border shadow-lg z-40">
              <Link href="/dashboard/profile" onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                Profile
              </Link>
              <Link href="/dashboard/profile" onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                Settings
              </Link>
              <div className="border-t border-border" />
              <button onClick={logout}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors text-left">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                Log out
              </button>
            </div>
          )}
        </div>
      </header>

      <DegradedBanner />

      {/* ── Content ── */}
      <main className="flex-1 min-h-0 overflow-hidden">
        <div className="h-full max-w-400 mx-auto px-4 sm:px-8 w-full overflow-hidden">
          {children}
        </div>
      </main>
    </div>
  );
}
