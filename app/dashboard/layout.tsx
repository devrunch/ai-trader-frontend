"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { useCurrentUser } from "@/lib/use-current-user";
import { API_BASE_URL } from "@/lib/api/client";
import { AlertsBell } from "@/components/AlertsBell";

const TABS = [
  { href: "/dashboard/brief",     label: "Home"      },
  { href: "/dashboard/terminal",  label: "Terminal"  },
  // Signals tab hidden while signal generation is unreliable; the route
  // still exists (app/dashboard/signals/page.tsx).
  { href: "/dashboard/strategies", label: "Strategies" },
  { href: "/dashboard/portfolio", label: "Portfolio" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  // Separate from the avatar menu above -- the nav tabs collapse into this
  // below lg (1024px, the same cutoff the terminal's own mobile layout
  // uses), so a phone-width header shows logo + hamburger + avatar instead
  // of six nav labels squeezed into one row.
  const [navMenuOpen, setNavMenuOpen] = useState(false);
  const navMenuRef = useRef<HTMLDivElement>(null);
  const { user } = useCurrentUser();
  // Client-side only for whether to SHOW the link — RolesGuard on the API is
  // what actually protects the page a click away.
  const tabs = user?.role === "admin"
    ? [...TABS, { href: "/dashboard/admin", label: "Admin" }]
    : TABS;

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
      if (navMenuRef.current && !navMenuRef.current.contains(e.target as Node)) setNavMenuOpen(false);
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
    <div className="h-dvh bg-background text-foreground flex flex-col overflow-hidden">

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

        {/* Nav tabs -- inline at desktop width, collapsed into the
            hamburger below lg (same cutoff the terminal's own mobile
            layout uses) so a narrow header doesn't cram six labels in. */}
        <nav className="hidden lg:flex items-center gap-1 ml-2">
          {tabs.map(({ href, label }) => {
            const active = pathname.startsWith(href);
            return (
              <Link key={href} href={href}
                // /dashboard reopens the last tab the user picked.
                onClick={() => sessionStorage.setItem("lastDashboardTab", href)}
                className={`px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  active ? "text-foreground bg-secondary" : "text-muted-foreground hover:text-foreground"
                }`}>
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="relative lg:hidden" ref={navMenuRef}>
          <button
            onClick={() => setNavMenuOpen(v => !v)}
            aria-label="Open navigation menu"
            aria-expanded={navMenuOpen}
            className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="4" y1="7" x2="20" y2="7" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="17" x2="20" y2="17" /></svg>
          </button>
          {navMenuOpen && (
            <div className="absolute left-0 top-full mt-2 w-48 bg-card border border-border shadow-lg z-40">
              {tabs.map(({ href, label }) => {
                const active = pathname.startsWith(href);
                return (
                  <Link key={href} href={href}
                    onClick={() => { sessionStorage.setItem("lastDashboardTab", href); setNavMenuOpen(false); }}
                    className={`block px-4 py-2.5 text-sm font-medium transition-colors ${
                      active ? "text-foreground bg-secondary" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                    }`}>
                    {label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex-1" />

        <AlertsBell />

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

      {/* ── Content ── */}
      <main className="flex-1 min-h-0 overflow-hidden">
        <div className="h-full max-w-400 mx-auto px-4 sm:px-8 w-full overflow-hidden">
          {children}
        </div>
      </main>
    </div>
  );
}
