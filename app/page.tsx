"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CandlestickChart, type ChartSignal } from "@/components/CandlestickChart";
import type { ApiOhlcBar } from "@/lib/api";

/* ─── Scroll-reveal wrapper — every section fades/rises in once, on view ─── */
function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setInView(true); obs.disconnect(); }
    }, { threshold: 0.15 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={`${inView ? "opacity-0 fade-in-up" : "opacity-0"} ${className}`}
      style={inView ? { animationDelay: `${delay}ms`, animationFillMode: "forwards" } : undefined}
    >
      {children}
    </div>
  );
}

/* ─── Ambient ticker strip — decorative motion, not a data claim ─── */
const TICKER = [
  "NIFTY 50", "SENSEX", "BANKNIFTY", "NIFTY IT", "RELIANCE", "TCS", "INFY", "HDFCBANK", "SBIN", "ITC",
];
function TickerStrip() {
  return (
    <div className="border-b border-border bg-card overflow-hidden">
      <div className="flex ticker-scroll whitespace-nowrap py-2" style={{ width: "max-content" }}>
        {[...TICKER, ...TICKER, ...TICKER].map((t, i) => (
          <span key={i} className="font-mono text-[11px] text-muted-foreground px-5 border-r border-border">{t}</span>
        ))}
      </div>
    </div>
  );
}

/* ─── Demo data — four real-feeling but clearly illustrative examples ─── */
interface DemoStock {
  symbol: string;
  exchange: string;
  checks: { label: string; value: string }[];
  direction: "BUY" | "SELL";
  confidence: number;
  entry: string;
  target: string;
  stop: string;
  reasoning: string;
}

const DEMO_STOCKS: DemoStock[] = [
  {
    symbol: "RELIANCE", exchange: "NSE",
    checks: [
      { label: "RSI (14)", value: "34.2 · oversold" },
      { label: "MACD", value: "bullish crossover" },
      { label: "SuperTrend", value: "flipped bullish" },
      { label: "VWAP", value: "price reclaimed" },
      { label: "News sentiment", value: "positive · 12 headlines" },
    ],
    direction: "BUY", confidence: 78, entry: "₹2,847", target: "₹2,910", stop: "₹2,800",
    reasoning: "RSI reclaimed from oversold as EMA20 was reclaimed and SuperTrend flipped bullish — momentum favors continuation toward target.",
  },
  {
    symbol: "TCS", exchange: "NSE",
    checks: [
      { label: "RSI (14)", value: "54.0 · neutral" },
      { label: "MACD", value: "positive, widening" },
      { label: "SuperTrend", value: "bullish" },
      { label: "VWAP", value: "trading above" },
      { label: "News sentiment", value: "neutral · 8 headlines" },
    ],
    direction: "BUY", confidence: 71, entry: "₹4,222", target: "₹4,255", stop: "₹4,205",
    reasoning: "Price is above all key EMAs and VWAP with a bullish SuperTrend — consolidation near highs suggests a breakout toward the target zone.",
  },
  {
    symbol: "INFY", exchange: "NSE",
    checks: [
      { label: "RSI (14)", value: "71.4 · overbought" },
      { label: "MACD", value: "bearish divergence" },
      { label: "SuperTrend", value: "flipped bearish" },
      { label: "VWAP", value: "price rejected" },
      { label: "News sentiment", value: "negative · 5 headlines" },
    ],
    direction: "SELL", confidence: 68, entry: "₹1,892", target: "₹1,850", stop: "₹1,920",
    reasoning: "Shooting star at resistance with RSI overbought at 71 — SuperTrend flip and negative sentiment support a reversal toward the target.",
  },
  {
    // Was AAPL/NASDAQ, which advertised a market the product cannot select.
    symbol: "HDFCBANK", exchange: "NSE",
    checks: [
      { label: "RSI (14)", value: "41.8 · neutral" },
      { label: "MACD", value: "bullish crossover" },
      { label: "SuperTrend", value: "bullish" },
      { label: "VWAP", value: "price reclaimed" },
      { label: "News sentiment", value: "positive · 14 headlines" },
    ],
    direction: "BUY", confidence: 74, entry: "₹1,642", target: "₹1,678", stop: "₹1,624",
    reasoning: "Price reclaimed VWAP with a fresh MACD crossover and bullish SuperTrend — momentum and sentiment both support continuation.",
  },
];

function SignalComposer({ stock }: { stock: DemoStock }) {
  const buy = stock.direction === "BUY";
  return (
    <div className="border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
        </span>
        <span className="font-mono text-xs text-muted-foreground">EXAMPLE · {stock.symbol}</span>
        {/* Labelled as an example, not presented as a live analysis. The
            levels below are illustrative and were not computed just now;
            claiming otherwise on a product whose pitch is "shows its work"
            is the one thing it cannot afford. */}
        <span className="font-mono text-[10px] px-1.5 py-0.5 border border-border text-muted-foreground">illustration</span>
      </div>

      <div className="space-y-2 mb-4">
        {stock.checks.map((c, i) => (
          <div
            key={c.label}
            className="flex items-center justify-between text-sm opacity-0 fade-in-up"
            style={{ animationDelay: `${300 + i * 220}ms`, animationFillMode: "forwards" }}
          >
            <span className="text-muted-foreground">{c.label}</span>
            <span className="font-mono text-xs text-foreground">{c.value}</span>
          </div>
        ))}
      </div>

      <Separator className="mb-4 opacity-0 fade-in-up" style={{ animationDelay: "1500ms", animationFillMode: "forwards" }} />

      <div className="opacity-0 fade-in-up" style={{ animationDelay: "1700ms", animationFillMode: "forwards" }}>
        <div className="flex items-center gap-2 mb-3">
          <Badge className={`rounded-none border-0 font-bold ${buy ? "bg-[var(--buy)]/15 text-[var(--buy)] hover:bg-[var(--buy)]/15" : "bg-[var(--sell)]/15 text-[var(--sell)] hover:bg-[var(--sell)]/15"}`}>
            {stock.direction}
          </Badge>
          <span className="text-xs font-semibold text-muted-foreground">{stock.confidence}% confidence</span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center mb-3">
          {[
            { l: "Entry",  v: stock.entry,  c: "text-foreground" },
            { l: "Target", v: stock.target, c: "text-[var(--buy)]" },
            { l: "Stop",   v: stock.stop,   c: "text-[var(--sell)]" },
          ].map(x => (
            <div key={x.l} className="border border-border bg-secondary p-2">
              <div className="text-[10px] text-muted-foreground mb-0.5">{x.l}</div>
              <div className={`font-mono font-bold text-sm ${x.c}`}>{x.v}</div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{stock.reasoning}</p>
      </div>
    </div>
  );
}

/* ─── Hero: pick a stock, watch a fresh analysis compose ─── */
function InteractiveHero() {
  const [selected, setSelected] = useState(0);
  return (
    <div className="relative">
      <div className="flex flex-wrap gap-2 mb-3">
        {DEMO_STOCKS.map((s, i) => (
          <button
            key={s.symbol}
            onClick={() => setSelected(i)}
            className={`px-3 py-1.5 text-xs font-mono font-semibold border transition-colors ${
              i === selected ? "border-primary bg-primary/10 text-link" : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
            }`}
          >
            {s.symbol}
          </button>
        ))}
      </div>
      <SignalComposer key={selected} stock={DEMO_STOCKS[selected]} />
    </div>
  );
}

/* ─── Race comparison — feel the speed difference, don't read about it ─── */
const RACE_TASKS = [
  "Check RSI, MACD, EMA, ADX, SuperTrend",
  "Score recent news sentiment",
  "Set entry, target, and stop-loss",
  "Explain the reasoning",
  "Validate before risking capital",
];

function useInView<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setInView(true); obs.disconnect(); }
    }, { threshold: 0.4 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, inView };
}

function RacePanel({ label, sub, total, stepMs, active, highlight }: {
  label: string; sub: string; total: number; stepMs: number; active: boolean; highlight?: boolean;
}) {
  const [done, setDone] = useState(0);
  useEffect(() => {
    if (!active) return;
    // Each timer sets an absolute count rather than incrementing, so the run
    // starts from zero without a synchronous reset — which would cascade a
    // render on every activation.
    const timers = Array.from({ length: total }, (_, i) =>
      setTimeout(() => setDone(i + 1), stepMs * (i + 1))
    );
    return () => {
      timers.forEach(clearTimeout);
      setDone(0);   // cleanup, not render — safe to reset here
    };
  }, [active, total, stepMs]);

  const pct = (done / total) * 100;

  return (
    <div className={`border border-border p-5 ${highlight ? "bg-primary/5" : "bg-card"}`}>
      <div className="flex items-baseline justify-between mb-1">
        <span className="font-semibold text-sm">{label}</span>
        <span className={`font-mono text-xs ${highlight ? "text-link" : "text-muted-foreground"}`}>{sub}</span>
      </div>
      <div className="h-1 bg-border mb-4">
        <div className={`h-full transition-all ease-linear ${highlight ? "bg-primary" : "bg-muted-foreground"}`} style={{ width: `${pct}%`, transitionDuration: `${stepMs}ms` }} />
      </div>
      <div className="space-y-2.5">
        {RACE_TASKS.map((t, i) => (
          <div key={t} className="flex items-center gap-2.5 text-sm">
            <span className={`shrink-0 w-4 h-4 flex items-center justify-center border ${i < done ? (highlight ? "bg-primary border-primary" : "bg-muted-foreground border-muted-foreground") : "border-border"}`}>
              {i < done && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={highlight ? "var(--primary-foreground)" : "var(--background)"} strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>}
            </span>
            <span className={i < done ? "text-foreground" : "text-muted-foreground"}>{t}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RaceComparison() {
  const { ref, inView } = useInView<HTMLDivElement>();
  const [round, setRound] = useState(0);
  return (
    <div ref={ref}>
      <div className="grid sm:grid-cols-2 gap-px bg-border border border-border">
        <RacePanel key={`manual-${round}`} label="Doing it yourself" sub="~15 min" total={5} stepMs={1800} active={inView} />
        <RacePanel key={`ai-${round}`}     label="Ask AITrader"      sub="~2 sec"  total={5} stepMs={180}  active={inView} highlight />
      </div>
      {inView && (
        <div className="text-center mt-6">
          <button onClick={() => setRound(r => r + 1)} className="text-xs font-mono text-muted-foreground hover:text-link transition-colors underline underline-offset-4">
            Run it again
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Live chart demo — the real charting engine from the actual product ─── */
function generateDemoBars(seed: number, count = 70): ApiOhlcBar[] {
  let s = seed;
  const rand = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  let price = 120;
  const bars: ApiOhlcBar[] = [];
  const base = 1735689600;
  for (let i = 0; i < count; i++) {
    const open = price;
    const close = Math.max(20, open + (rand() - 0.47) * 2.6);
    const high = Math.max(open, close) + rand() * 1.4;
    const low = Math.min(open, close) - rand() * 1.4;
    price = close;
    bars.push({ time: base + i * 900, open, high, low, close, volume: Math.round(400 + rand() * 600) });
  }
  return bars;
}

function LiveChartDemo() {
  const bars = useMemo(() => generateDemoBars(1337), []);
  const [asking, setAsking] = useState(false);
  const [signal, setSignal] = useState<ChartSignal | null>(null);

  function askAI() {
    setAsking(true);
    setSignal(null);
    setTimeout(() => {
      setSignal({ direction: "BUY", confidence: 0.76, entryPrice: bars[bars.length - 1].close, targetPrice: bars[bars.length - 1].close * 1.02, stopLoss: bars[bars.length - 1].close * 0.985 });
      setAsking(false);
    }, 1400);
  }

  return (
    <div className="border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="font-mono text-xs text-muted-foreground">DEMO · NSE · 15m</span>
        <button
          onClick={askAI}
          disabled={asking}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-bold disabled:opacity-60"
        >
          {asking ? (
            <><span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Analyzing…</>
          ) : (
            <>Ask AI</>
          )}
        </button>
      </div>
      <CandlestickChart bars={bars} signal={signal} interval="15m" />
      {signal && (
        <p className="text-xs text-muted-foreground leading-relaxed mt-3 pt-3 border-t border-border">
          This is the exact chart engine from the real product — entry, target, and stop-loss drawn live, the same way they appear when you ask about a real stock.
        </p>
      )}
    </div>
  );
}

/* ─── Content ─── */
const FEATURE_ICONS: Record<string, React.ReactNode> = {
  ai:    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/></svg>,
  news:  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8M15 18h-5M10 6h8v4h-8z"/></svg>,
  chart: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>,
  search:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  paper: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>,
  globe: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
};

const FEATURES = [
  { iconKey: "ai",     title: "Reasoning, not just a signal",   desc: "Every BUY/SELL comes with a plain-English explanation of what moved the AI's call — not a black-box score." },
  { iconKey: "news",   title: "News sentiment, scored",         desc: "A finance-tuned model scores recent headlines for every symbol, feeding real sentiment into every read." },
  { iconKey: "chart",  title: "Real technical indicators",      desc: "RSI, MACD, EMA cross, SuperTrend, ADX, VWAP — computed live from actual price history, not estimated." },
  { iconKey: "search", title: "Any symbol, on demand",          desc: "Search any NSE, BSE, or US stock and ask for a live read right now — don't wait for a scheduled scan." },
  { iconKey: "paper",  title: "Paper trade first",              desc: "Every signal can be paper-traded instantly with a real cash balance and P&L — zero capital at risk." },
  { iconKey: "globe",  title: "Built for Indian markets first", desc: "NSE and BSE timing, ₹-denominated positions, and Nifty/Sensex context, with global stocks supported too." },
];

// Only what a user can actually select. There is no UI control anywhere that
// sets a non-NSE/BSE exchange, so advertising US markets was a promise the
// product could not keep the moment someone tried it.
const MARKETS = [
  { label: "NSE", sample: "RELIANCE, TCS, INFY" },
  { label: "BSE", sample: "SENSEX-listed equities" },
  { label: "US & forex", sample: "planned, not live" },
];

const FAQS = [
  { q: "Is this financial advice?", a: "No. Every signal is a research read, not a recommendation — the reasoning is shown so you can judge it yourself, and paper trading exists specifically so you can test an idea before risking anything." },
  { q: "What data actually powers a signal?", a: "Real technical indicators computed from live price history (RSI, MACD, EMA, SuperTrend, ADX, VWAP), a finance-tuned model scoring recent news sentiment, and an LLM that writes the reasoning — no fabricated scores." },
  { q: "Do I need a broker account to start?", a: "No. Paper trading works immediately with no broker connection, no KYC, and no credit card. It's a real cash balance and real P&L tracking, just not real money." },
  { q: "Which markets are supported right now?", a: "NSE and BSE for Indian equities. US markets, forex and crypto are planned but not live yet." },
  { q: "How long does a signal take to generate?", a: "An on-demand read typically takes 5–15 seconds — it's a live analysis, not a cached answer." },
];

/* ─── Page ─── */
export default function LandingPage() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 bg-background/90 backdrop-blur border-b border-border">
        <div className="max-w-300 mx-auto px-6 sm:px-10 h-14 flex items-center justify-between gap-6">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">AI</div>
            <span className="font-semibold text-foreground text-lg tracking-tight">AI<span className="text-link">Trader</span></span>
          </Link>

          <div className="hidden md:flex items-center gap-7 text-sm font-medium text-muted-foreground">
            {[["Try it", "#hero"], ["See the speed", "#compare"], ["Real chart", "#chart"], ["FAQ", "#faq"]].map(([l, h]) => (
              <a key={l} href={h} className="hover:text-foreground transition-colors">{l}</a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Sign in</Link>
            <Button asChild size="sm"><Link href="/register">Get started</Link></Button>
          </div>

          <button className="md:hidden p-1.5 text-muted-foreground" onClick={() => setMobileOpen(!mobileOpen)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </div>
        {mobileOpen && (
          <div className="md:hidden border-t border-border px-6 py-4 space-y-3 text-sm bg-background">
            {["Try it", "See the speed", "Real chart", "FAQ"].map(l => (
              <a key={l} href={`#${l.toLowerCase().replace(/\s+/g, "-")}`} className="block text-muted-foreground hover:text-foreground" onClick={() => setMobileOpen(false)}>{l}</a>
            ))}
            <Link href="/login" className="block text-muted-foreground hover:text-foreground">Sign in</Link>
            <Button asChild className="w-full"><Link href="/register">Get started</Link></Button>
          </div>
        )}
      </nav>

      <TickerStrip />

      {/* ── Hero ── */}
      <section id="hero" className="relative border-b border-border overflow-hidden">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/10 rounded-full blur-3xl float-animation pointer-events-none" />
        <div className="absolute top-40 -right-24 w-80 h-80 bg-[var(--buy)]/10 rounded-full blur-3xl float-animation-delay pointer-events-none" />

        <div className="relative max-w-300 mx-auto px-6 sm:px-10 py-16 sm:py-24">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            <div>
              <Badge variant="outline" className="rounded-none mb-6 border-primary/30 bg-primary/10 text-link gap-2 py-1.5 px-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                Ask on demand — not a scheduled scan
              </Badge>
              <h1 className="font-heading text-4xl sm:text-5xl font-semibold leading-[1.1] mb-5 tracking-tight text-balance">
                Ask before you trade.
                <br />
                <span className="italic text-link">Get a real answer.</span>
              </h1>
              <p className="text-muted-foreground text-lg leading-relaxed mb-8 max-w-lg">
                Pick a stock on the right and watch it happen — real indicators, real reasoning, a real entry, target, and stop-loss. Try all four.
              </p>
              <div className="flex flex-wrap gap-3 mb-8">
                <Button asChild size="lg"><Link href="/register">Start free — paper trade now</Link></Button>
                <Button asChild size="lg" variant="outline"><Link href="/login">Sign in</Link></Button>
              </div>
              <div className="flex flex-wrap gap-5 text-sm text-muted-foreground">
                {["No credit card required", "Paper trading — zero risk", "NSE & BSE equities"].map(t => (
                  <div key={t} className="flex items-center gap-1.5">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--buy)" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                    {t}
                  </div>
                ))}
              </div>
            </div>

            <InteractiveHero />
          </div>
        </div>
      </section>

      {/* ── Race comparison ── */}
      <section id="compare">
        <div className="max-w-300 mx-auto px-6 sm:px-10 py-20">
          <Reveal className="text-center mb-12">
            <p className="font-mono text-xs uppercase tracking-widest text-link mb-3">Manual vs. AITrader</p>
            <h2 className="font-heading text-3xl font-semibold tracking-tight text-balance">Watch the time difference, don&apos;t take our word for it</h2>
          </Reveal>
          <RaceComparison />
        </div>
      </section>

      {/* ── Live chart demo ── */}
      <section id="chart" className="border-t border-border">
        <div className="max-w-300 mx-auto px-6 sm:px-10 py-20">
          <div className="grid lg:grid-cols-[1fr_380px] gap-10 items-start">
            <Reveal>
              <p className="font-mono text-xs uppercase tracking-widest text-link mb-3">The real chart engine</p>
              <h2 className="font-heading text-3xl font-semibold mb-3 tracking-tight text-balance">Not a mockup. This is the actual product.</h2>
              <p className="text-muted-foreground text-base leading-relaxed mb-6 max-w-md">
                Press &ldquo;Ask AI&rdquo; on the chart. It draws entry, target, and stop-loss the same way it does for a real stock in your dashboard — because it&apos;s the same code.
              </p>
            </Reveal>
            <Reveal delay={150}>
              <LiveChartDemo />
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="border-t border-border">
        <div className="max-w-300 mx-auto px-6 sm:px-10 py-20">
          <Reveal className="text-center mb-12">
            <p className="font-mono text-xs uppercase tracking-widest text-link mb-3">Why AITrader</p>
            <h2 className="font-heading text-3xl font-semibold mb-3 tracking-tight text-balance">Built for how traders actually decide</h2>
            <p className="text-muted-foreground text-base max-w-xl mx-auto">Every part exists to answer one question: should I take this trade, and why.</p>
          </Reveal>
          <div className="grid grid-cols-1 sm:grid-cols-3 border border-border">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={i * 90} className={`p-6 bg-card border-border group hover:bg-secondary/40 transition-colors ${i % 3 !== 2 ? "sm:border-r" : ""} ${i < 3 ? "border-b" : ""}`}>
                <div className="w-10 h-10 bg-primary/10 text-link flex items-center justify-center mb-4 transition-transform group-hover:scale-110">
                  {FEATURE_ICONS[f.iconKey]}
                </div>
                <h3 className="font-semibold text-base mb-2">{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Global markets ── */}
      <section className="border-t border-border">
        <div className="max-w-300 mx-auto px-6 sm:px-10 py-20">
          <Reveal className="text-center mb-10">
            <p className="font-mono text-xs uppercase tracking-widest text-link mb-3">Where it works</p>
            <h2 className="font-heading text-3xl font-semibold tracking-tight text-balance">India first. Global stocks too.</h2>
          </Reveal>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border border border-border">
            {MARKETS.map((m, i) => (
              <Reveal key={m.label} delay={i * 100} className="bg-card p-6 text-center hover:bg-secondary/40 transition-colors">
                <div className="font-heading text-2xl font-semibold text-link mb-1">{m.label}</div>
                <div className="font-mono text-xs text-muted-foreground">{m.sample}</div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="border-t border-border">
        <div className="max-w-200 mx-auto px-6 sm:px-10 py-20">
          <Reveal className="text-center mb-12">
            <p className="font-mono text-xs uppercase tracking-widest text-link mb-3">Questions</p>
            <h2 className="font-heading text-3xl font-semibold tracking-tight text-balance">Straight answers, no fine print</h2>
          </Reveal>
          <Reveal delay={100}>
            <Accordion type="single" collapsible className="border border-border">
              {FAQS.map((f, i) => (
                <AccordionItem key={f.q} value={`faq-${i}`} className={i < FAQS.length - 1 ? "border-b border-border" : ""}>
                  <AccordionTrigger className="px-5 py-4 text-sm font-semibold hover:no-underline hover:bg-secondary/40 [&[data-state=open]]:bg-secondary/40">
                    {f.q}
                  </AccordionTrigger>
                  <AccordionContent className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed">
                    {f.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Reveal>
        </div>
      </section>

      {/* ── CTA banner ── */}
      <div className="border-t border-border bg-primary text-primary-foreground">
        <div className="max-w-300 mx-auto px-6 sm:px-10 py-16 text-center">
          <h2 className="font-heading text-3xl font-semibold mb-3 tracking-tight text-balance">Paper trade your first idea today</h2>
          <p className="text-base mb-8 max-w-md mx-auto opacity-85">No credit card, no broker connection required — just a symbol and a question.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" variant="secondary"><Link href="/register">Start free →</Link></Button>
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <footer>
        <div className="max-w-300 mx-auto px-6 sm:px-10 py-12">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 bg-primary flex items-center justify-center text-primary-foreground font-bold text-xs">AI</div>
                <span className="font-semibold">AI<span className="text-link">Trader</span></span>
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">On-demand AI signals and paper trading for Indian and global equities.</p>
            </div>
            {[
              { heading: "Product", links: [["Try it", "#hero"], ["See the speed", "#compare"], ["FAQ", "#faq"], ["Dashboard", "/dashboard"]] },
              { heading: "Legal", links: [["Privacy Policy", "#"], ["Terms of Service", "#"], ["Disclaimer", "#"]] },
            ].map(col => (
              <div key={col.heading}>
                <div className="font-semibold text-sm mb-3">{col.heading}</div>
                <ul className="space-y-2">
                  {col.links.map(([l, h]) => (
                    <li key={l}><a href={h} className="text-muted-foreground text-sm hover:text-foreground transition-colors">{l}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <Separator className="mb-6" />
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-muted-foreground text-xs">© 2026 AITrader. Signals are not financial advice. Paper trading only.</p>
            <p className="text-muted-foreground text-xs">NSE · BSE · US Equities</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
