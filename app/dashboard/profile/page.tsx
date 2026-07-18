"use client";

import { useState } from "react";
import Link from "next/link";

/* ─── SVG Icons ─── */
const IC = {
  user:     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  mail:     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  phone:    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.16 6.16l1.02-.87a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
  shield:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  check:    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  chevron:  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>,
  bank:     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 2 7 22 7"/></svg>,
  lock:     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  bell:     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  help:     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  logout:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  edit:     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  settings: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  portfolio:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>,
  card:     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
};

/* ─── Row component ─── */
function Row({ icon, label, value, onClick, badge }: {
  icon: React.ReactNode; label: string; value?: string;
  onClick?: () => void; badge?: React.ReactNode;
}) {
  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-[#f8f9fa] transition-colors text-left group">
      <div className="text-[#9ca3af] shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-[#6b7280] text-xs">{label}</div>
        {value && <div className="text-[#1a1a1a] text-sm font-medium mt-0.5">{value}</div>}
      </div>
      {badge}
      <div className="text-[#d0d0d0] group-hover:text-[#9ca3af] transition-colors shrink-0">{IC.chevron}</div>
    </button>
  );
}

/* ─── Section component ─── */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-[#e8e8e8] rounded-xl overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
      {title && (
        <div className="px-5 py-3 border-b border-[#f0f0f0] bg-[#fafafa]">
          <span className="text-[#9ca3af] text-xs font-semibold uppercase tracking-wider">{title}</span>
        </div>
      )}
      <div className="divide-y divide-[#f5f5f5]">{children}</div>
    </div>
  );
}

export default function ProfilePage() {
  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState("Aditya Agarwal");
  const [notifications, setNotifications] = useState(true);
  const [twoFA, setTwoFA] = useState(false);

  return (
    <div className="h-full overflow-y-auto no-scrollbar">
    <div className="max-w-[1400px] flex gap-6 items-start py-6">

      {/* ── Left column ── */}
      <div className="flex-1 min-w-0 space-y-4">

        {/* Profile header card */}
        <div className="bg-white border border-[#e8e8e8] rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.04)] p-6">
          <div className="flex items-start gap-5">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="w-20 h-20 rounded-full bg-[#00b386] flex items-center justify-center text-white text-2xl font-bold">
                AA
              </div>
              <button className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white border border-[#e8e8e8] shadow flex items-center justify-center text-[#6b7280] hover:text-[#00b386] transition-colors">
                {IC.edit}
              </button>
            </div>

            {/* Name + info */}
            <div className="flex-1 min-w-0">
              {editMode ? (
                <div className="flex items-center gap-2 mb-1">
                  <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="text-xl font-bold text-[#1a1a1a] border-b border-[#00b386] outline-none bg-transparent w-48"
                    autoFocus
                  />
                  <button onClick={() => setEditMode(false)}
                    className="text-[#00b386] text-xs font-semibold hover:underline">Save</button>
                </div>
              ) : (
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-xl font-bold text-[#1a1a1a]">{name}</h1>
                  <button onClick={() => setEditMode(true)} className="text-[#9ca3af] hover:text-[#00b386] transition-colors">{IC.edit}</button>
                </div>
              )}
              <div className="text-[#6b7280] text-sm">aditya.agarwal@example.com</div>
              <div className="text-[#6b7280] text-sm">+91 98765 43210</div>

              {/* Verification badges */}
              <div className="flex flex-wrap gap-2 mt-3">
                {[
                  { label: "KYC Verified",   color: "#00b386" },
                  { label: "PAN Linked",      color: "#00b386" },
                  { label: "Bank Linked",     color: "#00b386" },
                  { label: "Aadhaar Linked",  color: "#00b386" },
                ].map(b => (
                  <div key={b.label}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
                    style={{ background: b.color + "15", color: b.color }}>
                    <span className="text-[#00b386]">{IC.check}</span>
                    {b.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Plan badge */}
            <div className="shrink-0 text-right">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#6366f1]/10 border border-[#6366f1]/20">
                <div className="w-1.5 h-1.5 rounded-full bg-[#6366f1]" />
                <span className="text-[#6366f1] text-xs font-semibold">Pro Plan</span>
              </div>
              <div className="text-[#9ca3af] text-xs mt-1.5">Renews Jul 3, 2026</div>
            </div>
          </div>
        </div>

        {/* Personal Info */}
        <Section title="Personal Information">
          <Row icon={IC.user}  label="Full Name"     value={name} />
          <Row icon={IC.mail}  label="Email Address" value="aditya.agarwal@example.com"
            badge={<span className="text-xs text-[#00b386] bg-[#e8f9f4] px-2 py-0.5 rounded-full font-medium">Verified</span>} />
          <Row icon={IC.phone} label="Phone Number"  value="+91 98765 43210"
            badge={<span className="text-xs text-[#00b386] bg-[#e8f9f4] px-2 py-0.5 rounded-full font-medium">Verified</span>} />
        </Section>

        {/* Linked Accounts */}
        <Section title="Linked Accounts">
          <Row icon={IC.bank} label="Broker Account" value="Dhan · XXXX4521"
            badge={<span className="text-xs text-[#00b386] bg-[#e8f9f4] px-2 py-0.5 rounded-full font-medium">Connected</span>} />
          <Row icon={IC.card} label="Bank Account"   value="HDFC Bank · XXXX8834"
            badge={<span className="text-xs text-[#00b386] bg-[#e8f9f4] px-2 py-0.5 rounded-full font-medium">Primary</span>} />
          <Row icon={IC.bank} label="Demat Account"  value="CDSL · IN30XXX123456"
            badge={<span className="text-xs text-[#00b386] bg-[#e8f9f4] px-2 py-0.5 rounded-full font-medium">Active</span>} />
        </Section>

        {/* Security */}
        <Section title="Security">
          <Row icon={IC.lock} label="Change Password" value="Last changed 30 days ago" />
          <div className="flex items-center gap-3 px-5 py-3.5">
            <div className="text-[#9ca3af] shrink-0">{IC.shield}</div>
            <div className="flex-1">
              <div className="text-[#6b7280] text-xs">Two-Factor Authentication</div>
              <div className="text-[#1a1a1a] text-sm font-medium mt-0.5">{twoFA ? "Enabled" : "Disabled"}</div>
            </div>
            <button
              onClick={() => setTwoFA(!twoFA)}
              className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${twoFA ? "bg-[#00b386]" : "bg-[#e8e8e8]"}`}>
              <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${twoFA ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>
        </Section>

        {/* Preferences */}
        <Section title="Preferences">
          <div className="flex items-center gap-3 px-5 py-3.5">
            <div className="text-[#9ca3af] shrink-0">{IC.bell}</div>
            <div className="flex-1">
              <div className="text-[#6b7280] text-xs">Signal Notifications</div>
              <div className="text-[#1a1a1a] text-sm font-medium mt-0.5">Push & Email alerts for new signals</div>
            </div>
            <button
              onClick={() => setNotifications(!notifications)}
              className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${notifications ? "bg-[#00b386]" : "bg-[#e8e8e8]"}`}>
              <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${notifications ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>
          <Row icon={IC.settings} label="App Preferences" value="Theme, language, timezone" />
        </Section>

        {/* Help & Logout */}
        <Section title="More">
          <Row icon={IC.help} label="Help & Support"  value="FAQs, contact support" />
          <button className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-[#fef2f2] transition-colors text-left">
            <div className="text-[#e84040] shrink-0">{IC.logout}</div>
            <div className="text-[#e84040] text-sm font-semibold">Log Out</div>
          </button>
        </Section>

      </div>

      {/* ── Right sidebar ── */}
      <div className="hidden xl:flex flex-col gap-4 w-[280px] shrink-0 sticky top-[138px]">

        {/* Plan card */}
        <div className="bg-white border border-[#e8e8e8] rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.04)] p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[#1a1a1a] font-semibold text-sm">Your Plan</h3>
            <span className="text-xs font-semibold text-[#6366f1] bg-[#6366f1]/10 px-2 py-0.5 rounded-full">Pro</span>
          </div>
          <div className="space-y-2.5">
            {[
              "Unlimited signals",
              "Full AI reasoning",
              "WebSocket live push",
              "One-click order placement",
              "Risk Guard enabled",
            ].map(f => (
              <div key={f} className="flex items-center gap-2 text-sm text-[#6b7280]">
                <span className="text-[#00b386] shrink-0">{IC.check}</span>
                {f}
              </div>
            ))}
          </div>
          <button className="mt-4 w-full py-2 rounded-lg border border-[#e8e8e8] text-[#6366f1] text-sm font-semibold hover:bg-[#f5f3ff] transition-colors">
            Upgrade to Enterprise
          </button>
        </div>

        {/* Portfolio summary */}
        <div className="bg-white border border-[#e8e8e8] rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.04)] p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[#1a1a1a] font-semibold text-sm">Portfolio</h3>
            <Link href="/dashboard/portfolio" className="text-[#00b386] text-xs hover:underline">View</Link>
          </div>
          <div className="space-y-2.5">
            {[
              { l: "Current Value",  v: "₹2,06,415", c: "#1a1a1a" },
              { l: "Total Returns",  v: "+₹12,240",  c: "#00b386" },
              { l: "Win Rate (30d)", v: "73%",        c: "#00b386" },
            ].map(s => (
              <div key={s.l} className="flex justify-between items-center">
                <span className="text-[#6b7280] text-xs">{s.l}</span>
                <span className="text-sm font-semibold" style={{ color: s.c }}>{s.v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick links */}
        <div className="bg-white border border-[#e8e8e8] rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.04)] p-2">
          {[
            { icon: IC.portfolio, label: "My Portfolio",   href: "/dashboard/portfolio" },
            { icon: IC.settings,  label: "Settings",       href: "/dashboard/settings"  },
            { icon: IC.help,      label: "Help & Support", href: "#"                    },
          ].map(l => (
            <Link key={l.label} href={l.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#f8f9fa] transition-colors">
              <span className="text-[#9ca3af]">{l.icon}</span>
              <span className="text-[#1a1a1a] text-sm">{l.label}</span>
            </Link>
          ))}
        </div>

      </div>
    </div>
    </div>
  );
}
