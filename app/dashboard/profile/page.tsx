"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { API_BASE_URL } from "@/lib/api/client";

interface Me { id: string; email: string; plan: string; role: string }

const IC = {
  user:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  mail:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  shield: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  lock:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  bell:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  help:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  logout: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-border bg-card overflow-hidden">
      <div className="px-5 py-2.5 border-b border-border bg-secondary/40">
        <span className="text-muted-foreground text-[10px] font-semibold uppercase tracking-widest font-mono">{title}</span>
      </div>
      <div className="divide-y divide-border">{children}</div>
    </div>
  );
}

function Row({ icon, label, value, badge }: { icon: React.ReactNode; label: string; value?: string; badge?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-5 py-3.5">
      <div className="text-muted-foreground shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-muted-foreground text-xs">{label}</div>
        {value && <div className="text-sm font-medium mt-0.5 truncate">{value}</div>}
      </div>
      {badge}
    </div>
  );
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} className="relative w-11 h-6 transition-colors shrink-0" style={{ background: on ? "var(--primary)" : "var(--secondary)" }}>
      <span className="absolute top-1 w-4 h-4 bg-white transition-transform" style={{ transform: on ? "translateX(24px)" : "translateX(4px)" }} />
    </button>
  );
}

export default function ProfilePage() {
  const [me, setMe] = useState<Me | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/auth/me`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setMe(data); })
      .catch(() => {});
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch(`${API_BASE_URL}/api/auth/logout`, { method: "POST", credentials: "include" }).catch(() => {});
    window.location.href = "/login";
  }

  const initials = me?.email ? me.email[0].toUpperCase() : "?";
  const planLabel = me?.plan ? (me.plan.charAt(0).toUpperCase() + me.plan.slice(1)) : "Free";

  return (
    <div className="h-full overflow-y-auto no-scrollbar py-5">
      <div className="max-w-2xl space-y-4">

        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Your account, security, and preferences.</p>
        </div>

        {/* Profile header */}
        <div className="border border-border bg-card p-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-primary flex items-center justify-center text-primary-foreground text-2xl font-bold shrink-0">{initials}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-semibold truncate">{me?.email ?? "Loading…"}</h2>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-primary/15 text-link">{planLabel}</span>
                {me?.role === "admin" && <span className="px-2 py-0.5 text-[10px] font-bold" style={{ background: "color-mix(in oklch, #e0ab4a 18%, transparent)", color: "#e0ab4a" }}>Admin</span>}
              </div>
              <div className="text-muted-foreground text-xs mt-1 font-mono">ID: {me?.id ?? "—"}</div>
            </div>
          </div>
        </div>

        <Section title="Account">
          {/* No "Verified" badge. There is no email verification anywhere in the
              backend, so the badge asserted a security property that does not
              exist — on the page users open specifically to check their
              security. Restore it when verification ships, not before. */}
          <Row icon={IC.mail} label="Email address" value={me?.email ?? "—"} />
          <Row icon={IC.user} label="Plan" value={planLabel} />
        </Section>

        <Section title="Security">
          <Row icon={IC.lock} label="Password" value="Change your password" />
          {/* The 2FA toggle was local state with no backend behind it: it read
              "Enabled" and forgot on refresh. A control that lies about being on
              is worse than no control, so it states the truth instead. */}
          <div className="flex items-center gap-3 px-5 py-3.5">
            <div className="text-muted-foreground shrink-0">{IC.shield}</div>
            <div className="flex-1">
              <div className="text-muted-foreground text-xs">Two-factor authentication</div>
              <div className="text-sm font-medium mt-0.5">Not available yet</div>
            </div>
          </div>
        </Section>

        <Section title="Preferences">
          {/* Same class of problem as the 2FA toggle: nothing delivers
              notifications (NotificationsModule is an empty placeholder), so a
              switch reading "on" promised alerts that would never arrive. */}
          <div className="flex items-center gap-3 px-5 py-3.5">
            <div className="text-muted-foreground shrink-0">{IC.bell}</div>
            <div className="flex-1">
              <div className="text-muted-foreground text-xs">Signal notifications</div>
              <div className="text-sm font-medium mt-0.5">Not available yet</div>
            </div>
          </div>
        </Section>

        <Section title="More">
          <Row icon={IC.help} label="Help & support" value="FAQs, contact support" />
          <Link href="/dashboard/portfolio" className="flex items-center gap-3 px-5 py-3.5 hover:bg-secondary/40 transition-colors">
            <div className="text-muted-foreground shrink-0">{IC.user}</div>
            <div className="flex-1 text-sm font-medium">View portfolio</div>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--muted-foreground)" strokeWidth="1.8" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
          </Link>
          <button onClick={handleLogout} disabled={loggingOut}
            className="w-full flex items-center gap-3 px-5 py-3.5 transition-colors text-left disabled:opacity-60 hover:bg-[color-mix(in_oklch,var(--sell)_10%,transparent)]">
            <div className="shrink-0" style={{ color: "var(--sell)" }}>{IC.logout}</div>
            <div className="text-sm font-semibold" style={{ color: "var(--sell)" }}>{loggingOut ? "Logging out…" : "Log out"}</div>
          </button>
        </Section>

      </div>
    </div>
  );
}
