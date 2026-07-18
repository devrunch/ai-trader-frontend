"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";

/* ─── Data ─── */
const TICKER_DATA = [
  { name: "NIFTY 50",     value: "24,683.40", change: "+110.25 (+0.45%)", up: true  },
  { name: "SENSEX",       value: "81,234.55", change: "+306.80 (+0.38%)", up: true  },
  { name: "BANKNIFTY",    value: "52,345.10", change: "-63.20 (-0.12%)",  up: false },
  { name: "NIFTY IT",     value: "38,920.25", change: "+472.40 (+1.23%)", up: true  },
  { name: "NIFTY MIDCAP", value: "52,234.80", change: "+347.60 (+0.67%)", up: true  },
  { name: "INDIA VIX",    value: "12.45",     change: "-0.30 (-2.34%)",   up: false },
  { name: "NIFTY FMCG",   value: "56,124.30", change: "+88.90 (+0.16%)",  up: true  },
  { name: "NIFTY PHARMA", value: "19,830.10", change: "-145.70 (-0.73%)", up: false },
];

const SIGNALS = [
  { symbol: "RELIANCE", exchange: "NSE", action: "BUY",  confidence: 78, entry: "2,847.50", target: "2,890.00", sl: "2,825.00", rr: "2.1×", type: "Technical Confluence", timeframe: "Intraday (15m)", reasoning: "EMA golden cross on 15m with RSI at 62. VWAP above confirms institutional buying. Positive news: Jio adds 4.2M subscribers.", targetPct: "+1.49%", slPct: "-0.79%" },
  { symbol: "HDFC BANK", exchange: "NSE", action: "BUY",  confidence: 71, entry: "1,734.20", target: "1,768.00", sl: "1,712.00", rr: "1.8×", type: "Breakout",             timeframe: "Intraday (5m)",  reasoning: "Breaking above ₹1,730 resistance with 1.9× volume spike. MACD bullish crossover. Banking sector outperforming.", targetPct: "+1.95%", slPct: "-1.28%" },
  { symbol: "INFY",      exchange: "NSE", action: "SELL", confidence: 67, entry: "1,892.00", target: "1,850.00", sl: "1,920.00", rr: "1.5×", type: "Reversal",             timeframe: "Intraday (15m)", reasoning: "Shooting star at resistance, RSI overbought at 74. Negative Q3 guidance sentiment detected.", targetPct: "-2.22%", slPct: "+1.48%" },
];

const FEATURE_ICONS: Record<string, ReactNode> = {
  ai:      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/></svg>,
  news:    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8M15 18h-5M10 6h8v4h-8z"/></svg>,
  chart:   <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6"  y1="20" x2="6"  y2="14"/><line x1="2"  y1="20" x2="22" y2="20"/></svg>,
  zap:     <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  broker:  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 2 7 22 7"/></svg>,
  shield:  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
};

const FEATURES = [
  { iconKey: "ai",     title: "Claude AI Reasoning",      desc: "Claude Sonnet analyses all market data and writes plain-English reasoning for every signal — you always know exactly why." },
  { iconKey: "news",   title: "FinBERT News Sentiment",   desc: "Finance-trained BERT model scores every news headline in real time, adding sentiment to every signal." },
  { iconKey: "chart",  title: "8+ Technical Indicators",  desc: "RSI, MACD, EMA cross, Bollinger Bands, VWAP, SuperTrend, ADX, Volume Spike — all computed and fed into the AI." },
  { iconKey: "zap",    title: "Real-time WebSocket Push", desc: "Signals arrive in your browser within 200 ms of generation. No polling, no refreshing — always live." },
  { iconKey: "broker", title: "Multi-Broker Support",     desc: "Connect Dhan, Zerodha Kite Connect, or Angel One SmartAPI. Place orders directly from signal cards." },
  { iconKey: "shield", title: "Built-in Risk Guard",      desc: "Pre-order checks for position sizing, daily loss limits, and duplicate orders. Never over-expose your portfolio." },
];

const STEPS = [
  { n: "01", title: "Connect Your Broker",  desc: "Link Dhan, Zerodha, or Angel One via secure OAuth. Credentials stored in AWS Secrets Manager." },
  { n: "02", title: "Build Your Watchlist", desc: "Add NSE/BSE stocks. Our screener runs every 15 minutes against the full NSE 500 universe." },
  { n: "03", title: "AI Analyses Markets",  desc: "Claude AI processes price data, 8 indicators, and live news sentiment to generate a structured signal." },
  { n: "04", title: "Trade with Precision", desc: "Receive the signal in real time — entry, target, stop-loss, R:R, and AI reasoning. Place order in one click." },
];

const PLANS = [
  { name: "Free",       price: "₹0",     period: "/month", highlight: false, features: ["3 signals per day", "NSE equity only", "Basic signal cards", "No AI reasoning", "No order placement", "Email support"],                                                                       cta: "Get Started Free", href: "/login" },
  { name: "Pro",        price: "₹999",   period: "/month", highlight: true,  features: ["Unlimited signals", "NSE + BSE equity", "Full AI reasoning", "WebSocket live push", "One-click order placement", "Risk Guard enabled", "Portfolio tracking", "Priority support"],         cta: "Start Pro Trial",  href: "/login" },
  { name: "Enterprise", price: "₹4,999", period: "/month", highlight: false, features: ["Everything in Pro", "Signal API access", "Bulk signal export", "Custom screener filters", "Dedicated account manager", "SLA uptime guarantee"],                                            cta: "Contact Sales",    href: "/login" },
];

/* ─── Components ─── */
function ConfidenceMeter({ value }: { value: number }) {
  const c = value >= 75 ? "#00b386" : value >= 65 ? "#f59e0b" : "#9ca3af";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 bg-[#f0f0f0] rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: c }} />
      </div>
      <span className="text-[10px] font-semibold" style={{ color: c }}>{value}%</span>
    </div>
  );
}

function SignalCard({ s }: { s: typeof SIGNALS[0] }) {
  const isBuy = s.action === "BUY";
  return (
    <div className={`bg-white rounded-xl border border-[#e8e8e8] shadow-[0_2px_8px_rgba(0,0,0,0.06)] p-4 border-l-[3px] ${isBuy ? "border-l-[#00b386]" : "border-l-[#e84040]"}`}>
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <span className="text-[#1a1a1a] font-bold text-sm">{s.symbol}</span>
          <span className="text-[#9ca3af] text-xs">{s.exchange}</span>
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${isBuy ? "bg-[#e8f9f4] text-[#00b386]" : "bg-[#fef2f2] text-[#e84040]"}`}>{s.action}</span>
        </div>
        <span className="text-[#9ca3af] text-xs">{s.timeframe}</span>
      </div>
      <ConfidenceMeter value={s.confidence} />
      <div className="mt-2.5 grid grid-cols-3 gap-2 text-xs">
        <div><div className="text-[#9ca3af] mb-0.5">Entry</div><div className="text-[#1a1a1a] font-mono font-semibold">₹{s.entry}</div></div>
        <div><div className="text-[#9ca3af] mb-0.5">Target</div><div className="text-[#00b386] font-mono font-semibold">₹{s.target}<span className="ml-1 text-[10px]">{s.targetPct}</span></div></div>
        <div><div className="text-[#9ca3af] mb-0.5">Stop Loss</div><div className="text-[#e84040] font-mono font-semibold">₹{s.sl}<span className="ml-1 text-[10px]">{s.slPct}</span></div></div>
      </div>
      <div className="mt-2 flex items-center gap-3 text-xs text-[#9ca3af]">
        <span>R:R <span className="text-[#f59e0b] font-semibold">{s.rr}</span></span>
        <span>·</span><span>{s.type}</span>
      </div>
      <p className="mt-2.5 text-xs text-[#6b7280] leading-relaxed line-clamp-2">{s.reasoning}</p>
      <div className="mt-3 flex gap-2">
        <div className={`flex-1 py-1.5 rounded-lg text-xs font-semibold text-center ${isBuy ? "bg-[#00b386] text-white" : "bg-[#e84040] text-white"}`}>Place Order</div>
        <div className="px-3 py-1.5 rounded-lg text-xs text-[#6b7280] border border-[#e8e8e8]">Dismiss</div>
      </div>
    </div>
  );
}

/* ─── Page ─── */
export default function LandingPage() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white text-[#1a1a1a]">

      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 bg-white border-b border-[#e8e8e8]">
        <div className="max-w-[1200px] mx-auto px-6 sm:px-10 h-14 flex items-center justify-between gap-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-[#00b386] flex items-center justify-center text-white font-bold text-sm">AI</div>
            <span className="font-bold text-[#1a1a1a] text-lg tracking-tight">AI<span className="text-[#00b386]">Trader</span></span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-7 text-sm font-medium text-[#6b7280]">
            {[["Features","#features"],["How it works","#how-it-works"],["Signals","#signals"],["Pricing","#pricing"]].map(([l,h])=>(
              <a key={l} href={h} className="hover:text-[#1a1a1a] transition-colors">{l}</a>
            ))}
          </div>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-[#6b7280] hover:text-[#1a1a1a] transition-colors">Sign in</Link>
            <Link href="/login" className="px-4 py-2 rounded-lg bg-[#00b386] text-white text-sm font-semibold hover:bg-[#009e78] transition-colors">Get Started</Link>
          </div>

          {/* Mobile toggle */}
          <button className="md:hidden p-1.5 text-[#6b7280]" onClick={() => setMobileOpen(!mobileOpen)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6"  x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </div>
        {mobileOpen && (
          <div className="md:hidden border-t border-[#e8e8e8] px-6 py-4 space-y-3 text-sm bg-white">
            {["Features","How it works","Pricing"].map(l=><a key={l} href={`#${l.toLowerCase().replace(/\s+/g,"-")}`} className="block text-[#6b7280] hover:text-[#1a1a1a]" onClick={()=>setMobileOpen(false)}>{l}</a>)}
            <Link href="/login" className="block text-[#6b7280] hover:text-[#1a1a1a]">Sign in</Link>
            <Link href="/login" className="block w-full text-center py-2 rounded-lg bg-[#00b386] text-white font-semibold">Get Started</Link>
          </div>
        )}
      </nav>

      {/* ── Ticker bar ── */}
      <div className="bg-[#f8f9fa] border-b border-[#e8e8e8] overflow-hidden">
        <div className="flex ticker-scroll" style={{ width: "max-content" }}>
          {[...TICKER_DATA, ...TICKER_DATA].map((t, i) => (
            <div key={i} className="flex items-center gap-2 px-6 py-1.5 whitespace-nowrap border-r border-[#e8e8e8]">
              <span className="text-[#6b7280] text-xs font-medium">{t.name}</span>
              <span className="text-[#1a1a1a] text-xs font-semibold font-mono">{t.value}</span>
              <span className={`text-xs font-semibold ${t.up ? "text-[#00b386]" : "text-[#e84040]"}`}>{t.up ? "▲" : "▼"} {t.change}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Hero ── */}
      <section className="max-w-[1200px] mx-auto px-6 sm:px-10 py-16 sm:py-24">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#00b386]/30 bg-[#e8f9f4] text-[#00b386] text-xs font-semibold mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00b386] animate-pulse" />
              AI Signal Engine · Live Now
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-[#1a1a1a] leading-tight mb-5 tracking-tight">
              Trade Indian Markets<br />
              <span className="text-[#00b386]">with AI Precision</span>
            </h1>
            <p className="text-[#6b7280] text-lg leading-relaxed mb-8 max-w-lg">
              Real-time buy/sell signals powered by <span className="text-[#1a1a1a] font-medium">Claude AI</span>, <span className="text-[#1a1a1a] font-medium">FinBERT</span> news sentiment, and 8+ technical indicators. Entry, target, and stop-loss in every signal.
            </p>
            <div className="flex flex-wrap gap-3 mb-8">
              <Link href="/login" className="px-6 py-3 rounded-xl bg-[#00b386] text-white font-semibold text-sm hover:bg-[#009e78] transition-colors shadow-[0_2px_8px_rgba(0,179,134,0.3)]">
                Start Free Trial →
              </Link>
              <Link href="/dashboard" className="px-6 py-3 rounded-xl border border-[#e8e8e8] text-[#1a1a1a] font-semibold text-sm hover:bg-[#f8f9fa] transition-colors">
                View Dashboard
              </Link>
            </div>
            <div className="flex flex-wrap gap-5 text-sm text-[#9ca3af]">
              {["No credit card required", "3 free signals daily", "Cancel anytime"].map(t=>(
                <div key={t} className="flex items-center gap-1.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00b386" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                  {t}
                </div>
              ))}
            </div>
          </div>

          {/* Right — signal card preview */}
          <div className="hidden lg:block space-y-3">
            {SIGNALS.slice(0, 2).map((s, i) => (
              <div key={s.symbol} className={`transition-transform ${i === 1 ? "ml-8 opacity-90" : ""}`}>
                <SignalCard s={s} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <div className="border-y border-[#e8e8e8] bg-[#f8f9fa]">
        <div className="max-w-[1200px] mx-auto px-6 sm:px-10 py-8 grid grid-cols-2 sm:grid-cols-4 gap-6">
          {[
            { v: "73%",   l: "Win Rate (30d)",   c: "#00b386" },
            { v: "1,240+",l: "Signals Generated", c: "#1a1a1a" },
            { v: "2.1×",  l: "Avg Risk:Reward",   c: "#1a1a1a" },
            { v: "< 8s",  l: "Signal Latency",    c: "#1a1a1a" },
          ].map(s=>(
            <div key={s.l} className="text-center">
              <div className="text-2xl font-bold mb-1 tracking-tight" style={{ color: s.c }}>{s.v}</div>
              <div className="text-[#9ca3af] text-sm">{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Features ── */}
      <section id="features" className="max-w-[1200px] mx-auto px-6 sm:px-10 py-20">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#e8e8e8] text-[#6b7280] text-xs font-medium mb-3">Why AITrader</div>
          <h2 className="text-3xl font-bold text-[#1a1a1a] mb-3 tracking-tight">The complete trading intelligence platform</h2>
          <p className="text-[#6b7280] text-base max-w-xl mx-auto">Every component designed to give you an edge — from AI reasoning to one-click order placement.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map(f=>(
            <div key={f.title} className="bg-white border border-[#e8e8e8] rounded-xl p-6 shadow-[0_1px_4px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:border-[#d0d0d0] transition-all group">
              <div className="w-10 h-10 rounded-xl bg-[#e8f9f4] text-[#00b386] flex items-center justify-center mb-4">
                {FEATURE_ICONS[f.iconKey]}
              </div>
              <h3 className="text-[#1a1a1a] font-semibold text-base mb-2 group-hover:text-[#00b386] transition-colors">{f.title}</h3>
              <p className="text-[#6b7280] text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="bg-[#f8f9fa] border-y border-[#e8e8e8]">
        <div className="max-w-[1200px] mx-auto px-6 sm:px-10 py-20">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#e8e8e8] text-[#6b7280] text-xs font-medium mb-3">How It Works</div>
            <h2 className="text-3xl font-bold text-[#1a1a1a] tracking-tight">From market open to trade in 4 steps</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {STEPS.map((s, i) => (
              <div key={s.n} className="bg-white border border-[#e8e8e8] rounded-xl p-6 shadow-[0_1px_4px_rgba(0,0,0,0.04)] relative">
                <div className="text-[#00b386] font-mono text-3xl font-bold mb-3 opacity-30">{s.n}</div>
                <h3 className="text-[#1a1a1a] font-semibold text-base mb-2">{s.title}</h3>
                <p className="text-[#6b7280] text-sm leading-relaxed">{s.desc}</p>
                {i < STEPS.length - 1 && (
                  <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-white border border-[#e8e8e8] shadow-sm flex items-center justify-center">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Live signals preview ── */}
      <section id="signals" className="max-w-[1200px] mx-auto px-6 sm:px-10 py-20">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#e8e8e8] text-[#6b7280] text-xs font-medium mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00b386] animate-pulse" />Live Signals Demo
          </div>
          <h2 className="text-3xl font-bold text-[#1a1a1a] mb-3 tracking-tight">See exactly what traders receive</h2>
          <p className="text-[#6b7280] text-base max-w-xl mx-auto">Every signal includes entry, target, stop-loss, R:R ratio, and full Claude AI reasoning.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
          {SIGNALS.map(s=><SignalCard key={s.symbol} s={s} />)}
        </div>
        <div className="text-center">
          <Link href="/login" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#00b386] text-white font-semibold text-sm hover:bg-[#009e78] transition-colors shadow-[0_2px_8px_rgba(0,179,134,0.3)]">
            Get Real Signals Now →
          </Link>
        </div>
      </section>

      {/* ── AI pipeline ── */}
      <div className="bg-[#f8f9fa] border-y border-[#e8e8e8]">
        <div className="max-w-[1200px] mx-auto px-6 sm:px-10 py-16 text-center">
          <h2 className="text-2xl font-bold text-[#1a1a1a] mb-2 tracking-tight">The AI Pipeline Behind Every Signal</h2>
          <p className="text-[#6b7280] text-sm mb-10">Three models run in parallel — each expert at a different layer of market analysis.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {[
              { name: "pandas-ta / TA-Lib", role: "Technical Indicators", color: "#6366f1" },
              { name: "FinBERT",             role: "News Sentiment",       color: "#8b5cf6" },
              { name: "Claude Sonnet",       role: "Reasoning & Signal",   color: "#00b386" },
            ].map((m, i) => (
              <div key={m.name} className="flex items-center gap-4">
                <div className="bg-white border border-[#e8e8e8] rounded-xl px-6 py-4 text-center shadow-[0_1px_4px_rgba(0,0,0,0.06)] w-44">
                  <div className="font-semibold text-sm mb-0.5" style={{ color: m.color }}>{m.name}</div>
                  <div className="text-[#9ca3af] text-xs">{m.role}</div>
                </div>
                {i < 2 && <div className="hidden sm:block text-[#d0d0d0] text-xl font-light">→</div>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Pricing ── */}
      <section id="pricing" className="max-w-[1200px] mx-auto px-6 sm:px-10 py-20">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#e8e8e8] text-[#6b7280] text-xs font-medium mb-3">Pricing</div>
          <h2 className="text-3xl font-bold text-[#1a1a1a] mb-3 tracking-tight">Simple, transparent pricing</h2>
          <p className="text-[#6b7280] text-base">Start free. Upgrade when you're ready to trade at full capacity.</p>
        </div>
        <div className="grid sm:grid-cols-3 gap-5 max-w-3xl mx-auto">
          {PLANS.map(p=>(
            <div key={p.name} className={`rounded-xl p-6 flex flex-col relative ${p.highlight ? "bg-white border-2 border-[#00b386] shadow-[0_4px_20px_rgba(0,179,134,0.12)]" : "bg-white border border-[#e8e8e8] shadow-[0_1px_4px_rgba(0,0,0,0.04)]"}`}>
              {p.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-[#00b386] text-white text-[10px] font-bold rounded-full tracking-wide">MOST POPULAR</div>
              )}
              <div className="mb-4">
                <div className={`font-bold text-base mb-1 ${p.highlight ? "text-[#00b386]" : "text-[#1a1a1a]"}`}>{p.name}</div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-[#1a1a1a] tracking-tight">{p.price}</span>
                  <span className="text-[#9ca3af] text-sm">{p.period}</span>
                </div>
              </div>
              <ul className="space-y-2 flex-1 mb-5">
                {p.features.map(f=>(
                  <li key={f} className="flex items-start gap-2 text-sm text-[#6b7280]">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={p.highlight ? "#00b386" : "#9ca3af"} strokeWidth="2.5" strokeLinecap="round" className="mt-0.5 shrink-0"><polyline points="20 6 9 17 4 12"/></svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href={p.href} className={`block w-full py-2.5 rounded-xl text-sm font-semibold text-center transition-all ${p.highlight ? "bg-[#00b386] text-white hover:bg-[#009e78]" : "border border-[#e8e8e8] text-[#1a1a1a] hover:bg-[#f8f9fa]"}`}>
                {p.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA banner ── */}
      <div className="bg-[#f8f9fa] border-y border-[#e8e8e8]">
        <div className="max-w-[1200px] mx-auto px-6 sm:px-10 py-16 text-center">
          <h2 className="text-3xl font-bold text-[#1a1a1a] mb-3 tracking-tight">Ready to trade with AI precision?</h2>
          <p className="text-[#6b7280] text-base mb-8 max-w-md mx-auto">Join traders using AI-powered signals on NSE and BSE. Start free — no credit card required.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/login" className="px-7 py-3 rounded-xl bg-[#00b386] text-white font-semibold text-sm hover:bg-[#009e78] transition-colors shadow-[0_2px_8px_rgba(0,179,134,0.3)]">
              Start Trading Free →
            </Link>
            <Link href="/dashboard" className="px-7 py-3 rounded-xl border border-[#e8e8e8] text-[#1a1a1a] font-semibold text-sm hover:bg-white transition-colors">
              See Dashboard Demo
            </Link>
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <footer className="bg-white border-t border-[#e8e8e8]">
        <div className="max-w-[1200px] mx-auto px-6 sm:px-10 py-12">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-[#00b386] flex items-center justify-center text-white font-bold text-xs">AI</div>
                <span className="font-bold text-[#1a1a1a]">AI<span className="text-[#00b386]">Trader</span></span>
              </div>
              <p className="text-[#9ca3af] text-sm leading-relaxed">AI-powered trade signals for Indian equity markets. Powered by Claude, FinBERT, and real-time market data.</p>
            </div>
            {[
              { heading: "Product",            links: [["Features","#features"],["Pricing","#pricing"],["Dashboard","/dashboard"],["Live Signals","#signals"]] },
              { heading: "Brokers",             links: [["Dhan","#"],["Zerodha Kite","#"],["Angel One SmartAPI","#"],["More coming soon","#"]] },
              { heading: "Legal",               links: [["Privacy Policy","#"],["Terms of Service","#"],["Disclaimer","#"],["Contact","#"]] },
            ].map(col=>(
              <div key={col.heading}>
                <div className="text-[#1a1a1a] font-semibold text-sm mb-3">{col.heading}</div>
                <ul className="space-y-2">
                  {col.links.map(([l,h])=>(
                    <li key={l}><a href={h} className="text-[#9ca3af] text-sm hover:text-[#1a1a1a] transition-colors">{l}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-[#e8e8e8] pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-[#9ca3af] text-xs">© 2026 AITrader. All rights reserved. Signals are not financial advice.</p>
            <p className="text-[#9ca3af] text-xs">Built for NSE · BSE · Indian Equity Markets</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
