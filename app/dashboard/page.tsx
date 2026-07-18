"use client";

import Link from "next/link";
import { Card, SectionHeader, Sparkline, PriceChange, StockLogo } from "@/components/ui";
import {
  SignalCard, StockCard, PositionRow, StatCard, TopMoverRow, OrderRow,
  type Signal, type StockCardData, type Position, type TopMover, type Order,
} from "@/components/dashboard";
import { colors, cn } from "@/lib/theme";
import AiTrendingStocks from "./AiTrendingStocks";

/* ─── Data ─── */
const STATS = [
  { label: "Today's P&L",     value: "+₹4,832",   sub: "+2.34% today",          color: colors.primary,  border: colors.primary  },
  { label: "Portfolio Value", value: "₹2,06,415", sub: "↑ ₹12,240 this month",  color: colors.text,     border: colors.purple   },
  { label: "Active Signals",  value: "7",          sub: "3 BUY · 4 SELL",        color: colors.text,     border: colors.warning  },
  { label: "Win Rate (30d)",  value: "73%",        sub: "↑ 4% vs last month",    color: colors.primary,  border: colors.primary  },
];

const SIGNALS: Signal[] = [
  { symbol: "RELIANCE",  ticker: "RELIANCE",  exchange: "NSE", action: "BUY",  confidence: 78, entry: "2,847.50", target: "2,890.00", sl: "2,825.00", rr: "2.1×", type: "Technical Confluence", time: "09:47 AM", reasoning: "EMA golden cross on 15m, RSI at 62, VWAP above. Jio adds 4.2M subscribers."   },
  { symbol: "HDFC BANK", ticker: "HDFCBANK",  exchange: "NSE", action: "BUY",  confidence: 71, entry: "1,734.20", target: "1,768.00", sl: "1,712.00", rr: "1.8×", type: "Breakout",             time: "10:12 AM", reasoning: "Breaking above ₹1,730 resistance. Volume spike 1.9×. MACD bullish crossover." },
  { symbol: "INFY",      ticker: "INFY",      exchange: "NSE", action: "SELL", confidence: 67, entry: "1,892.00", target: "1,850.00", sl: "1,920.00", rr: "1.5×", type: "Reversal",             time: "10:35 AM", reasoning: "Shooting star at resistance, RSI overbought at 74. Negative Q3 guidance."     },
  { symbol: "TATAMOTORS",ticker: "TATAMOTORS",exchange: "NSE", action: "BUY",  confidence: 82, entry: "398.20",   target: "412.00",   sl: "390.00",   rr: "2.4×", type: "Momentum",             time: "11:02 AM", reasoning: "Strong momentum after consolidation. RSI at 58. VWAP aligned. EV tailwinds."  },
];

const POSITIONS: Position[] = [
  { symbol: "TCS",      name: "Tata Consultancy",   qty: 10, avgPrice: "3,890",  cmp: "3,944.50", pnl: "+₹545", pct: "+1.40%", up: true,  spark: [38.2,38.5,38.1,38.7,39.0,38.9,39.2,39.4,39.1,39.4] },
  { symbol: "WIPRO",    name: "Wipro Ltd",           qty: 25, avgPrice: "480.20", cmp: "472.80",   pnl: "-₹185", pct: "-1.54%", up: false, spark: [48.2,47.9,48.1,47.5,47.2,47.6,47.3,47.0,47.4,47.3] },
  { symbol: "RELIANCE", name: "Reliance Industries", qty:  5, avgPrice: "2,830",  cmp: "2,847.50", pnl: "+₹87",  pct: "+0.62%", up: true,  spark: [28.1,28.3,28.0,28.4,28.5,28.3,28.6,28.4,28.7,28.5] },
  { symbol: "HDFCBANK", name: "HDFC Bank",           qty:  3, avgPrice: "1,695",  cmp: "1,734.20", pnl: "+₹117", pct: "+2.32%", up: true,  spark: [16.8,17.0,16.9,17.1,17.2,17.1,17.3,17.2,17.4,17.3] },
];

const TOP_MOVERS: TopMover[] = [
  { symbol: "Tata Capital",        ticker: "TATACAP",    price: "₹309.00",   change: "+8.25",   pct: "2.74%", vol: "24,44,123", up: true, spark: [29,29.5,29.2,29.8,30.1,30.0,30.3,30.5,30.4,30.9] },
  { symbol: "Avenue Supermarts",   ticker: "AVNSM",      price: "₹4,168.00", change: "+111.00", pct: "2.74%", vol: "7,91,334",  up: true, spark: [40,40.5,40.2,41.0,41.3,41.1,41.5,41.4,41.6,41.7] },
  { symbol: "Apollo Hospitals",    ticker: "APOLLOHOSP", price: "₹8,292.00", change: "+202.50", pct: "2.50%", vol: "6,93,221",  up: true, spark: [80,80.8,80.4,81.2,81.8,81.6,82.0,82.3,82.1,82.9] },
  { symbol: "Union Bank of India", ticker: "UNIONBANK",  price: "₹166.89",   change: "+4.21",   pct: "2.59%", vol: "89,92,349", up: true, spark: [16.1,16.3,16.2,16.4,16.5,16.4,16.6,16.5,16.7,16.7] },
];

const MOST_BOUGHT: StockCardData[] = [
  { ticker: "RELIANCE", name: "Reliance Industries", price: "₹2,847.50", change: "+17.50", pct: "0.62%", up: true,  color: "#0070ba" },
  { ticker: "TCS",      name: "Tata Consultancy",    price: "₹3,944.50", change: "+54.50", pct: "1.40%", up: true,  color: "#0052cc" },
  { ticker: "HDFCBANK", name: "HDFC Bank",           price: "₹1,734.20", change: "+33.80", pct: "1.99%", up: true,  color: "#e4002b" },
  { ticker: "INFY",     name: "Infosys",             price: "₹1,892.00", change: "-28.50", pct: "1.48%", up: false, color: "#007cc3" },
];

const TOP_INTRADAY: StockCardData[] = [
  { ticker: "TATAMOTORS", name: "Tata Motors",    price: "₹398.20",   change: "+8.00",   pct: "2.05%", up: true,  color: "#00205b" },
  { ticker: "CANARABANK", name: "Canara Bank",    price: "₹131.83",   change: "+2.75",   pct: "2.13%", up: true,  color: "#fdb714" },
  { ticker: "APOLLOHOSP", name: "Apollo Hosp",    price: "₹8,292.00", change: "+202.50", pct: "2.50%", up: true,  color: "#0077c8" },
  { ticker: "AVNSM",      name: "Avenue Supermt", price: "₹4,168.00", change: "-88.00",  pct: "2.07%", up: false, color: "#00529b" },
];

const SECTORS = [
  { name: "Banking",         gainers: 12, losers: 4,  chg: "+1.82%" },
  { name: "IT Services",     gainers: 8,  losers: 6,  chg: "-0.74%" },
  { name: "Healthcare",      gainers: 10, losers: 3,  chg: "+1.50%" },
  { name: "FMCG",            gainers: 6,  losers: 5,  chg: "+0.43%" },
  { name: "Auto",            gainers: 9,  losers: 2,  chg: "+2.05%" },
  { name: "Metals & Mining", gainers: 4,  losers: 11, chg: "-2.54%" },
];

const ETFS = [
  { name: "Nifty 50 ETF",     amc: "HDFC",   nav: "₹186.32", chg: "+0.38%", up: true  },
  { name: "Nifty Bank ETF",   amc: "Kotak",  nav: "₹521.40", chg: "+0.81%", up: true  },
  { name: "Nifty IT ETF",     amc: "Mirae",  nav: "₹48.72",  chg: "-0.46%", up: false },
  { name: "Nifty Midcap 150", amc: "Nippon", nav: "₹24.18",  chg: "+0.67%", up: true  },
];

const ORDERS: Order[] = [
  { id: "ORD-8821", symbol: "TCS",   side: "BUY",  qty: 10, price: "3,890.00", status: "COMPLETE", time: "09:17 AM" },
  { id: "ORD-8820", symbol: "WIPRO", side: "BUY",  qty: 25, price: "480.20",   status: "COMPLETE", time: "09:20 AM" },
  { id: "ORD-8819", symbol: "INFY",  side: "SELL", qty: 15, price: "1,892.00", status: "OPEN",     time: "10:36 AM" },
  { id: "ORD-8818", symbol: "HDFCB", side: "BUY",  qty:  8, price: "1,734.20", status: "PENDING",  time: "10:42 AM" },
];

const TRADING_SCREENS = [
  { tag: "Bullish", label: "Resistance breakouts",  up: true,  bars: [0.3,0.5,0.4,0.7,0.6,0.9,0.8,1.0] },
  { tag: "Bullish", label: "MACD above signal line", up: true,  bars: [0.4,0.6,0.5,0.8,0.7,0.9,1.0,0.95] },
  { tag: "Bearish", label: "RSI overbought",         up: false, bars: [1.0,0.9,0.8,0.7,0.6,0.5,0.4,0.3] },
  { tag: "Bullish", label: "RSI oversold",           up: true,  bars: [0.3,0.2,0.3,0.4,0.5,0.6,0.7,0.8] },
];

/* ─── Small inline helpers ─── */
function SeeMoreLink({ href, label = "See more" }: { href: string; label?: string }) {
  return (
    <a href={href} className="text-xs font-medium hover:underline flex items-center gap-1" style={{ color: colors.primary }}>
      {label}
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <polyline points="9 18 15 12 9 6"/>
      </svg>
    </a>
  );
}

function StockCardGrid({ stocks, title, href }: { stocks: StockCardData[]; title: string; href: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[#1a1a1a] font-semibold text-base">{title}</h2>
        <SeeMoreLink href={href} />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stocks.map(s => <StockCard key={s.ticker} stock={s} />)}
      </div>
    </div>
  );
}

/* ─── Page ─── */
export default function DashboardPage() {
  return (
    <div className="flex gap-8 h-full">

      {/* ── Left column ── */}
      <div className="flex-1 min-w-0 overflow-y-auto no-scrollbar py-6 space-y-6">

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STATS.map(s => <StatCard key={s.label} {...s} />)}
        </div>

        {/* AI Trending Picks */}
        <AiTrendingStocks />

        {/* Signals + Positions grid */}
        <div className="grid lg:grid-cols-5 gap-5">

          {/* Signals col */}
          <div className="lg:col-span-3 space-y-3">
            <SectionHeader title="Active Signals" badge="7 active" href="/dashboard/signals" />
            {SIGNALS.map(sig => <SignalCard key={sig.symbol} signal={sig} />)}

            {/* Top Gainers Today */}
            <div className="mt-3">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-[#1a1a1a] font-semibold text-sm">Top Gainers Today</h2>
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                    style={{ background: colors.primaryLight, color: colors.primary }}>NSE</span>
                </div>
                <SeeMoreLink href="/dashboard/screener" label="See more" />
              </div>
              <Card>
                <div className="grid grid-cols-[2fr_1fr_110px_1fr] px-4 py-2.5 border-b border-[#f0f0f0] bg-[#fafafa]">
                  {["Company","Chart (1D)","Market Price","Volume"].map((h, i) => (
                    <span key={h} className={`text-[#9ca3af] text-xs font-medium ${i > 0 ? (i === 1 ? "text-center" : "text-right") : ""} ${i === 3 ? "pr-2" : ""}`}>{h}</span>
                  ))}
                </div>
                {TOP_MOVERS.map((s, i) => <TopMoverRow key={s.ticker} stock={s} isLast={i === TOP_MOVERS.length - 1} />)}
              </Card>
            </div>
          </div>

          {/* Positions col */}
          <div className="lg:col-span-2 space-y-4">
            <SectionHeader title="Open Positions" href="/dashboard/portfolio" />
            <Card>
              {POSITIONS.map((p, i) => (
                <PositionRow key={p.symbol} position={p} isLast={i === POSITIONS.length - 1} />
              ))}
            </Card>

            {/* Recent Orders */}
            <Card>
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#f0f0f0]">
                <h2 className="text-[#1a1a1a] font-semibold text-sm">Recent Orders</h2>
                <Link href="/dashboard/orders" className="text-xs font-medium hover:underline" style={{ color: colors.primary }}>View all</Link>
              </div>
              <div className="divide-y divide-[#f5f5f5]">
                {ORDERS.map(o => <OrderRow key={o.id} order={o} compact />)}
              </div>
            </Card>

            {/* Trading Screens */}
            <Card>
              <div className="px-4 py-3 border-b border-[#f0f0f0]">
                <h3 className="text-[#1a1a1a] font-semibold text-sm">Trading Screens</h3>
              </div>
              <div className="divide-y divide-[#f5f5f5]">
                {TRADING_SCREENS.map(sc => (
                  <button key={sc.label} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#f8f9fa] transition-colors text-left">
                    <div className="flex-1 min-w-0">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold mb-1"
                        style={{ background: sc.up ? colors.primaryLight : colors.dangerLight,
                                 color:      sc.up ? colors.primary      : colors.danger      }}>
                        {sc.tag}
                      </span>
                      <div className="text-[#1a1a1a] text-sm font-medium">{sc.label}</div>
                    </div>
                    <svg width="52" height="28" viewBox="0 0 52 28" className="shrink-0">
                      {sc.bars.map((h, j) => (
                        <rect key={j} x={j * 6 + 1} y={28 - h * 22} width="4" height={h * 22} rx="1.5"
                          fill={sc.up ? colors.primary : (j >= 4 ? colors.danger : colors.primary)} opacity={0.7 + j * 0.04} />
                      ))}
                    </svg>
                  </button>
                ))}
              </div>
              <div className="px-4 py-3 border-t border-[#f0f0f0]">
                <SeeMoreLink href="/dashboard/signals" label="Intraday screener" />
              </div>
            </Card>
          </div>
        </div>

        {/* Most AI picked stocks */}
        <StockCardGrid stocks={MOST_BOUGHT}  title="Most AI picked stocks" href="/dashboard/signals" />

        {/* Top intraday stocks */}
        <StockCardGrid stocks={TOP_INTRADAY} title="Top intraday stocks"   href="/dashboard/signals" />

        {/* Sectors trending */}
        <div>
          <h2 className="text-[#1a1a1a] font-semibold text-base mb-3">Sectors trending today</h2>
          <Card>
            <div className="grid grid-cols-[2fr_3fr_1fr] px-5 py-2.5 bg-[#fafafa] border-b border-[#f0f0f0] text-xs text-[#9ca3af] font-medium">
              <span>Sector</span><span className="text-center">Gainers / Losers</span><span className="text-right">1D change</span>
            </div>
            {SECTORS.map((sec, i) => {
              const total = sec.gainers + sec.losers;
              const gPct  = (sec.gainers / total) * 100;
              const up    = sec.chg.startsWith("+");
              return (
                <div key={sec.name}
                  className={`grid grid-cols-[2fr_3fr_1fr] items-center px-5 py-3.5 hover:bg-[#f8f9fa] transition-colors ${i < SECTORS.length - 1 ? "border-b border-[#f5f5f5]" : ""}`}>
                  <span className="text-[#1a1a1a] text-sm font-medium">{sec.name}</span>
                  <div className="px-6">
                    <div className="flex items-center gap-2 text-xs text-[#6b7280] mb-1">
                      <span>{sec.gainers}</span>
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden flex">
                        <div className="h-full rounded-l-full" style={{ width: `${gPct}%`, background: colors.primary }} />
                        <div className="h-full rounded-r-full" style={{ width: `${100 - gPct}%`, background: colors.danger }} />
                      </div>
                      <span>{sec.losers}</span>
                    </div>
                  </div>
                  <PriceChange change={sec.chg} up={up} size="sm" />
                </div>
              );
            })}
            <div className="px-5 py-3 border-t border-[#f0f0f0]">
              <SeeMoreLink href="#" label="See all sectors" />
            </div>
          </Card>
        </div>

        {/* ETFs */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[#1a1a1a] font-semibold text-base">ETFs</h2>
            <SeeMoreLink href="#" label="See all ETFs" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {ETFS.map(e => (
              <div key={e.name} className={`${cn.cardHover} p-4 cursor-pointer`}>
                <div className="w-10 h-10 rounded-xl mb-3 flex items-center justify-center text-xs font-bold"
                  style={{ background: colors.primaryLight, color: colors.primary }}>
                  {e.amc.slice(0, 2)}
                </div>
                <div className="text-[#1a1a1a] text-sm font-medium mb-3 leading-tight">{e.name}</div>
                <div className="text-[#1a1a1a] text-sm font-bold">{e.nav}</div>
                <PriceChange change={e.chg} up={e.up} />
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ── Right column ── */}
      <div className="hidden xl:flex flex-col gap-4 w-[320px] shrink-0 overflow-y-auto no-scrollbar py-6">

        {/* Your Investments */}
        <Card padding>
          <h2 className="text-[#1a1a1a] font-semibold text-base mb-4">Your investments</h2>
          <div className="text-[#9ca3af] text-xs mb-0.5">Current</div>
          <div className="text-2xl font-bold text-[#1a1a1a] tracking-tight mb-3">₹2,06,415</div>
          <div className="h-px bg-[#f0f0f0] mb-3" />
          {[
            { l: "1D returns",    v: "+₹4,832",   p: "+2.34%",  up: true  },
            { l: "Total returns", v: "+₹12,240",  p: "+6.31%",  up: true  },
            { l: "Invested",      v: "₹1,94,175", p: null,      up: true  },
          ].map(r => (
            <div key={r.l} className="flex justify-between items-center mb-2">
              <span className="text-[#6b7280] text-sm">{r.l}</span>
              {r.p
                ? <PriceChange change={r.v} pct={r.p} up={r.up} size="sm" />
                : <span className="text-[#1a1a1a] text-sm font-semibold">{r.v}</span>
              }
            </div>
          ))}
          <Link href="/dashboard/portfolio"
            className="mt-3 block w-full py-2 rounded-lg border border-[#e8e8e8] text-sm font-medium text-center hover:bg-[#f8f9fa] transition-colors"
            style={{ color: colors.primary }}>
            View Portfolio
          </Link>
        </Card>

        {/* Products & Tools */}
        <Card padding>
          <h2 className="text-[#1a1a1a] font-semibold text-base mb-3">Products &amp; Tools</h2>
          <div className="divide-y divide-[#f0f0f0]">
            {[
              { label: "IPO",   badge: "5 open" },
              { label: "Bonds", badge: "7 open" },
              { label: "ETFs",  badge: null     },
            ].map(p => (
              <button key={p.label} className="w-full flex items-center justify-between py-2.5 hover:bg-[#f8f9fa] -mx-1 px-1 rounded transition-colors">
                <span className="text-[#1a1a1a] text-sm">{p.label}</span>
                {p.badge && <span className="text-xs font-semibold" style={{ color: colors.primary }}>{p.badge}</span>}
              </button>
            ))}
          </div>
        </Card>

      </div>
    </div>
  );
}
