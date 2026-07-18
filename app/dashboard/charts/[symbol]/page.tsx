"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { placePaperOrder, getSignalsBySymbol, getHistorical, type ApiSignal, type ApiOhlcBar } from "@/lib/api";

/* ─── Stock database ─── */
const STOCKS: Record<string, {
  name: string; exchange: string; price: number; change: number;
  pct: number; up: boolean; bsePrice: number; sector: string;
  marketCap: string; pe: string; pb: string; high52: number; low52: number;
  about: string;
}> = {
  TATACAP:  { name: "Tata Capital",          exchange: "NSE", price: 309.10, change: 8.35,   pct: 2.78, up: true,  bsePrice: 309.15, sector: "Financial Services", marketCap: "₹78,340 Cr", pe: "28.4", pb: "3.2", high52: 342.80, low52: 195.40, about: "Tata Capital is a diversified financial services company and a subsidiary of Tata Sons, offering a wide range of financial products including loans, wealth management and investment advisory." },
  AVNSM:    { name: "Avenue Supermarts",      exchange: "NSE", price: 4168.00, change: 111.00, pct: 2.74, up: true,  bsePrice: 4169.50, sector: "Retail", marketCap: "₹2,71,040 Cr", pe: "102.1", pb: "18.4", high52: 5484.85, low52: 3441.10, about: "Avenue Supermarts Ltd operates DMart, a chain of hypermarkets in India, offering a wide range of daily household and personal products at competitive prices." },
  APOLLOHOSP: { name: "Apollo Hospitals",    exchange: "NSE", price: 8292.00, change: 202.50, pct: 2.50, up: true,  bsePrice: 8295.00, sector: "Healthcare", marketCap: "₹1,18,970 Cr", pe: "85.3", pb: "14.1", high52: 9931.75, low52: 5751.25, about: "Apollo Hospitals Enterprise Ltd is India's largest private hospital chain with over 70 hospitals and a strong presence across specialty healthcare services." },
  UNIONBANK: { name: "Union Bank of India",  exchange: "NSE", price: 166.89, change: 4.21,   pct: 2.59, up: true,  bsePrice: 166.90, sector: "Banking", marketCap: "₹1,13,850 Cr", pe: "6.8",  pb: "0.9", high52: 187.35, low52: 117.05, about: "Union Bank of India is a major public sector bank offering a wide range of banking and financial services across retail, corporate and government segments." },
  CANARABANK: { name: "Canara Bank",         exchange: "NSE", price: 131.83, change: 2.75,   pct: 2.13, up: true,  bsePrice: 131.85, sector: "Banking", marketCap: "₹1,07,450 Cr", pe: "5.9",  pb: "0.8", high52: 148.95, low52: 88.65,  about: "Canara Bank is one of India's oldest and largest nationalised banks providing comprehensive financial services including retail banking, corporate banking and treasury operations." },
  TATAMOTORS: { name: "Tata Motors",         exchange: "NSE", price: 398.20, change: 8.00,   pct: 2.05, up: true,  bsePrice: 398.50, sector: "Automobiles", marketCap: "₹1,50,340 Cr", pe: "7.2",  pb: "2.1", high52: 1179.00, low52: 382.50, about: "Tata Motors is India's largest automobile manufacturer by revenue, making cars, trucks, vans, coaches, buses and defence vehicles." },
  RELIANCE:  { name: "Reliance Industries",  exchange: "NSE", price: 2847.50, change: 17.50, pct: 0.62, up: true,  bsePrice: 2848.00, sector: "Conglomerate", marketCap: "₹19,24,780 Cr", pe: "25.6", pb: "2.8", high52: 3217.90, low52: 2220.30, about: "Reliance Industries Ltd is India's largest private sector corporation spanning energy, petrochemicals, natural gas, retail, telecommunications, mass media and textiles." },
  HDFCBANK:  { name: "HDFC Bank",            exchange: "NSE", price: 1734.20, change: 33.80, pct: 1.99, up: true,  bsePrice: 1734.50, sector: "Banking", marketCap: "₹13,25,670 Cr", pe: "18.4", pb: "2.4", high52: 1880.00, low52: 1363.55, about: "HDFC Bank is India's largest private sector bank offering personal banking, NRI banking, business banking and wholesale banking products and services." },
  INFY:      { name: "Infosys",              exchange: "NSE", price: 1892.00, change: -28.50,  pct: 1.48, up: false, bsePrice: 1891.50, sector: "IT Services",   marketCap: "₹7,86,430 Cr",  pe: "24.1", pb: "7.3", high52: 2006.45, low52: 1358.35, about: "Infosys is a global leader in next-generation digital services and consulting, enabling clients in 56 countries to navigate their digital transformation." },
  TCS:       { name: "Tata Consultancy Services", exchange: "NSE", price: 3944.50, change: 54.50,  pct: 1.40, up: true,  bsePrice: 3945.00, sector: "IT Services",   marketCap: "₹14,27,680 Cr", pe: "29.8", pb: "12.4", high52: 4585.90, low52: 3311.00, about: "Tata Consultancy Services is an Indian multinational IT services and consulting company, one of the largest IT firms in the world by market capitalisation and a subsidiary of Tata Group." },
  WIPRO:     { name: "Wipro Ltd",            exchange: "NSE", price: 472.80,  change: -7.40,   pct: 1.54, up: false, bsePrice: 472.60,  sector: "IT Services",   marketCap: "₹2,47,350 Cr",  pe: "20.3", pb: "3.6", high52: 584.45,  low52: 417.65,  about: "Wipro Limited is a leading global information technology, consulting and business process services company, delivering solutions that meet the changing needs of clients across sectors worldwide." },
  HDFCB:     { name: "HDFC Bank",            exchange: "NSE", price: 1734.20, change: 33.80,   pct: 1.99, up: true,  bsePrice: 1734.50, sector: "Banking",       marketCap: "₹13,25,670 Cr", pe: "18.4", pb: "2.4", high52: 1880.00, low52: 1363.55, about: "HDFC Bank is India's largest private sector bank offering personal banking, NRI banking, business banking and wholesale banking products and services." },
};

const PERIODS: { label: string; interval: string; days: number }[] = [
  { label: "1D",  interval: "5m",  days: 1   },
  { label: "1W",  interval: "15m", days: 7   },
  { label: "1M",  interval: "1h",  days: 30  },
  { label: "3M",  interval: "1d",  days: 90  },
  { label: "6M",  interval: "1d",  days: 180 },
  { label: "1Y",  interval: "1d",  days: 365 },
  { label: "3Y",  interval: "1d",  days: 1095 },
  { label: "5Y",  count: 250, vol: 70,   trend: 3.2   },
  { label: "All", count: 350, vol: 80,   trend: 3.8   },
];

/* ─── SVG Chart ─── */
function LineChart({
  data, color, height = 340,
}: {
  data: number[]; color: string; height?: number;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<{ x: number; y: number; price: number; idx: number } | null>(null);

  const W = 900, H = height;
  const padL = 64, padR = 12, padT = 16, padB = 8;
  const cW = W - padL - padR;
  const cH = H - padT - padB;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const gX = (i: number) => padL + (i / (data.length - 1)) * cW;
  const gY = (v: number) => padT + cH - ((v - min) / range) * cH;

  const pts = data.map((v, i) => [gX(i), gY(v)] as [number, number]);

  // Smooth bezier path
  let linePath = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const cpx = (pts[i - 1][0] + pts[i][0]) / 2;
    linePath += ` C ${cpx.toFixed(1)} ${pts[i - 1][1].toFixed(1)}, ${cpx.toFixed(1)} ${pts[i][1].toFixed(1)}, ${pts[i][0].toFixed(1)} ${pts[i][1].toFixed(1)}`;
  }
  const areaPath = `${linePath} L ${pts[pts.length - 1][0].toFixed(1)} ${padT + cH} L ${padL} ${padT + cH} Z`;

  // Y-axis grid (5 lines)
  const gridLines = Array.from({ length: 5 }, (_, i) => {
    const v = min + (range / 4) * (4 - i);
    return { y: gY(v), label: v.toFixed(2) };
  });

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const mx = ((e.clientX - rect.left) / rect.width) * W;
      const idx = Math.round(((mx - padL) / cW) * (data.length - 1));
      const ci = Math.max(0, Math.min(data.length - 1, idx));
      setHover({ x: pts[ci][0], y: pts[ci][1], price: data[ci], idx: ci });
    },
    [data, pts, cW]
  );

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      style={{ height }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHover(null)}
    >
      <defs>
        <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0"    />
        </linearGradient>
      </defs>

      {/* Grid */}
      {gridLines.map((g, i) => (
        <g key={i}>
          <line x1={padL} y1={g.y} x2={W - padR} y2={g.y}
            stroke="#e8e8e8" strokeWidth="0.5" strokeDasharray="4,4" />
          <text x={padL - 6} y={g.y + 4} textAnchor="end"
            fill="#6b7280" fontSize="11">{g.label}</text>
        </g>
      ))}

      {/* Area + line */}
      <path d={areaPath} fill="url(#cg)" />
      <path d={linePath} fill="none" stroke={color} strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" />

      {/* Hover */}
      {hover && (
        <>
          <line x1={hover.x} y1={padT} x2={hover.x} y2={padT + cH}
            stroke="#6b7280" strokeWidth="1" strokeDasharray="3,3" />
          <circle cx={hover.x} cy={hover.y} r="5"
            fill={color} stroke="#f8f9fa" strokeWidth="2" />
          <rect x={Math.min(hover.x - 38, W - 90)} y={hover.y - 28}
            width="76" height="20" rx="4" fill="#f8f9fa" stroke="#e8e8e8" />
          <text x={Math.min(hover.x - 38, W - 90) + 38} y={hover.y - 13}
            textAnchor="middle" fill="#1a1a1a" fontSize="11" fontWeight="600">
            ₹{hover.price.toFixed(2)}
          </text>
        </>
      )}
    </svg>
  );
}

/* ─── Main Page ─── */
export default function StockPage() {
  const params  = useParams();
  const router  = useRouter();
  const symbol  = (params?.symbol as string ?? "").toUpperCase();
  const stock   = STOCKS[symbol];

  const [period, setPeriod]       = useState("1D");
  const [bars, setBars]           = useState<ApiOhlcBar[]>([]);
  const [barsLoading, setBarsLoading] = useState(true);
  const [tab, setTab]             = useState<"BUY" | "SELL">("BUY");
  const [orderType, setOrderType] = useState<"Delivery" | "Intraday" | "MTF">("Delivery");
  const [qty, setQty]             = useState("");
  const [price, setPrice]         = useState("");
  const [priceMode, setPriceMode] = useState<"Limit" | "Market">("Limit");
  const [step, setStep]           = useState<"form" | "confirm" | "success" | "error">("form");
  const [orderErr, setOrderErr]   = useState("");
  const [infoTab, setInfoTab]     = useState("About");
  const [aiSignal, setAiSignal]   = useState<ApiSignal | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    if (stock) setPrice(stock.price.toFixed(2));
  }, [symbol, stock]);

  useEffect(() => {
    if (!stock) return;
    setBarsLoading(true);
    const pCfg = PERIODS.find(p => p.label === period) ?? PERIODS[0];
    getHistorical(symbol, stock.exchange, pCfg.interval, pCfg.days)
      .then(({ bars: b }) => setBars(b))
      .catch(() => setBars([]))
      .finally(() => setBarsLoading(false));
  }, [symbol, period, stock]);

  useEffect(() => {
    if (infoTab !== "AI Analysis") return;
    setAiLoading(true);
    getSignalsBySymbol(symbol)
      .then(sigs => setAiSignal(sigs[0] ?? null))
      .catch(() => setAiSignal(null))
      .finally(() => setAiLoading(false));
  }, [infoTab, symbol]);

  if (!stock) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-[#6b7280]">
        <p className="text-lg mb-4">Stock not found: {symbol}</p>
        <Link href="/dashboard" className="text-[#00b386] hover:underline">← Back to dashboard</Link>
      </div>
    );
  }

  /* Use real close prices; fall back to flat line while loading */
  const data = bars.length > 0
    ? bars.map(b => b.close)
    : [stock.price];

  const color = stock.up ? "#00b386" : "#e84040";
  const orderTotal = qty && price ? (parseFloat(qty) * parseFloat(price)).toFixed(2) : "0.00";
  const isBuy      = tab === "BUY";

  async function handleConfirm() {
    try {
      await placePaperOrder({
        symbol,
        exchange: stock.exchange,
        side: tab,
        quantity: parseInt(qty),
        limitPrice: priceMode === "Limit" ? parseFloat(price) : undefined,
      });
      setStep("success");
      setTimeout(() => {
        setStep("form");
        setQty("");
        setPrice(stock.price.toFixed(2));
      }, 2800);
    } catch (err) {
      setOrderErr(err instanceof Error ? err.message : "Order failed");
      setStep("error");
      setTimeout(() => { setStep("form"); setOrderErr(""); }, 3000);
    }
  }

  return (
    <div className="max-w-[1400px]">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-[#6b7280] mb-4">
        <Link href="/dashboard" className="hover:text-[#00b386]">Dashboard</Link>
        <span>/</span>
        <Link href="/dashboard/screener" className="hover:text-[#00b386]">Stocks</Link>
        <span>/</span>
        <span className="text-[#1a1a1a]">{stock.name}</span>
      </div>

      <div className="grid lg:grid-cols-[1fr_340px] gap-6">

        {/* ── Left: Chart section ── */}
        <div>
          {/* Stock header */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-10 h-10 rounded-xl bg-[#e8e8e8] flex items-center justify-center text-[#1a1a1a] font-bold text-sm">
                  {symbol.slice(0, 2)}
                </div>
                <div>
                  <div className="text-[#6b7280] text-xs">{symbol} · {stock.exchange} ↕</div>
                  <div className="text-[#1a1a1a] font-bold text-lg leading-tight">{stock.name}</div>
                </div>
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-bold text-[#1a1a1a]">₹{stock.price.toFixed(2)}</span>
                <span className={`text-sm font-semibold ${stock.up ? "text-[#00b386]" : "text-[#e84040]"}`}>
                  {stock.up ? "+" : ""}{stock.change.toFixed(2)} ({stock.pct.toFixed(2)}%)
                </span>
                <span className="text-[#6b7280] text-xs">{period}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="w-9 h-9 rounded-full border border-[#e8e8e8] text-[#6b7280] hover:text-[#1a1a1a] hover:border-[#00b386]/40 flex items-center justify-center transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              </button>
              <button className="w-9 h-9 rounded-full border border-[#e8e8e8] text-[#6b7280] hover:text-[#1a1a1a] hover:border-[#00b386]/40 flex items-center justify-center transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
              </button>
            </div>
          </div>

          {/* Chart */}
          <div className="bg-white border border-[#e8e8e8] rounded-xl p-4 mb-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <LineChart data={data} color={color} height={320} />

            {/* Time selectors */}
            <div className="flex items-center gap-1 mt-3 pt-3 border-t border-[#e8e8e8]">
              {PERIODS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => setPeriod(p.label)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    period === p.label
                      ? "bg-[#00b386]/10 text-[#00b386] border border-[#00b386]/30"
                      : "text-[#6b7280] hover:text-[#1a1a1a] hover:bg-[#e8e8e8]/50"
                  }`}
                >
                  {p.label}
                </button>
              ))}
              <div className="ml-auto flex gap-1">
                <button className="px-3 py-1.5 rounded-lg text-xs text-[#6b7280] border border-[#e8e8e8] hover:border-[#00b386]/40 transition-colors flex items-center gap-1.5">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                  Terminal
                </button>
              </div>
            </div>
          </div>

          {/* Key stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {[
              { l: "52W High", v: `₹${stock.high52.toLocaleString("en-IN")}` },
              { l: "52W Low",  v: `₹${stock.low52.toLocaleString("en-IN")}` },
              { l: "P/E Ratio", v: stock.pe },
              { l: "P/B Ratio", v: stock.pb },
              { l: "Market Cap", v: stock.marketCap },
              { l: "Sector",    v: stock.sector },
              { l: "Exchange",  v: `NSE · BSE` },
              { l: "AI Signal", v: stock.up ? "BUY (78%)" : "SELL (67%)", up: stock.up },
            ].map((s) => (
              <div key={s.l} className="bg-white border border-[#e8e8e8] rounded-xl p-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                <div className="text-[#6b7280] text-xs mb-1">{s.l}</div>
                <div className={`text-sm font-semibold flex items-center gap-1.5 ${"up" in s ? (s.up ? "text-[#00b386]" : "text-[#e84040]") : "text-[#1a1a1a]"}`}>
                  {"up" in s && <span className={`w-2 h-2 rounded-full ${s.up ? "bg-[#00b386]" : "bg-[#e84040]"}`} />}
                  {s.v}
                </div>
              </div>
            ))}
          </div>

          {/* About / Financials tabs */}
          <div className="bg-white border border-[#e8e8e8] rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="flex border-b border-[#e8e8e8]">
              {["About", "AI Analysis", "News"].map((t) => (
                <button
                  key={t}
                  onClick={() => setInfoTab(t)}
                  className={`px-5 py-3 text-sm font-medium transition-colors ${
                    infoTab === t
                      ? "text-[#00b386] border-b-2 border-[#00b386] -mb-px"
                      : "text-[#6b7280] hover:text-[#1a1a1a]"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="p-4">
              {infoTab === "About" && (
                <p className="text-[#6b7280] text-sm leading-relaxed">{stock.about}</p>
              )}
              {infoTab === "AI Analysis" && (
                aiLoading ? (
                  <div className="py-6 text-center text-[#9ca3af] text-sm">Loading AI analysis…</div>
                ) : !aiSignal ? (
                  <div className="py-6 text-center text-[#9ca3af] text-sm">
                    No AI signal generated for {symbol} yet.<br />
                    <span className="text-xs">Screener runs every 15 min during market hours.</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className={`flex items-start gap-3 p-3 rounded-xl border ${aiSignal.direction === "BUY" ? "bg-[#00b386]/5 border-[#00b386]/20" : "bg-[#e84040]/5 border-[#e84040]/20"}`}>
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${aiSignal.direction === "BUY" ? "bg-[#00b386]/10" : "bg-[#e84040]/10"}`}>
                        {aiSignal.direction === "BUY"
                          ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00b386" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
                          : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e84040" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/></svg>
                        }
                      </div>
                      <div>
                        <div className={`font-bold text-sm ${aiSignal.direction === "BUY" ? "text-[#00b386]" : "text-[#e84040]"}`}>
                          {aiSignal.direction} Signal · {Math.round(aiSignal.confidence * 100)}% confidence
                        </div>
                        <div className="text-[#6b7280] text-xs mt-1 leading-relaxed">{aiSignal.reasoning}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      {[
                        { l: "Entry",     v: `₹${aiSignal.entryPrice}`,  c: "text-[#1a1a1a]"  },
                        { l: "Target",    v: `₹${aiSignal.targetPrice}`, c: "text-[#00b386]"  },
                        { l: "Stop Loss", v: `₹${aiSignal.stopLoss}`,    c: "text-[#e84040]"  },
                      ].map(x => (
                        <div key={x.l} className="bg-[#f8f9fa] border border-[#e8e8e8] rounded-lg p-2.5">
                          <div className="text-[#9ca3af] text-[10px] mb-0.5">{x.l}</div>
                          <div className={`font-mono font-bold text-sm ${x.c}`}>{x.v}</div>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => { setTab(aiSignal.direction as "BUY" | "SELL"); setPrice(String(aiSignal.entryPrice)); setQty("1"); }}
                      className={`w-full py-2 rounded-lg text-xs font-semibold text-white transition-colors ${aiSignal.direction === "BUY" ? "bg-[#00b386] hover:bg-[#009e78]" : "bg-[#e84040] hover:bg-[#cc3535]"}`}>
                      Use this signal → Paper {aiSignal.direction}
                    </button>
                  </div>
                )
              )}
              {infoTab === "News" && (
                <div className="space-y-3">
                  {[
                    { headline: `${stock.name} reports strong Q3 results, beats estimates`, time: "2h ago", sentiment: "positive" },
                    { headline: `Analysts upgrade ${stock.name} with revised target price`, time: "4h ago", sentiment: "positive" },
                    { headline: `${stock.sector} sector sees increased FII activity in June`, time: "6h ago", sentiment: "neutral" },
                  ].map((n, i) => (
                    <div key={i} className="flex items-start gap-3 py-2 border-b border-[#e8e8e8] last:border-0">
                      <span className={`mt-0.5 text-xs px-1.5 py-0.5 rounded font-semibold ${
                        n.sentiment === "positive" ? "bg-[#00b386]/20 text-[#00b386]"
                        : n.sentiment === "negative" ? "bg-[#e84040]/20 text-[#e84040]"
                        : "bg-[#6b7280]/20 text-[#6b7280]"
                      }`}>{n.sentiment}</span>
                      <div>
                        <p className="text-[#1a1a1a] text-sm">{n.headline}</p>
                        <p className="text-[#6b7280] text-xs mt-0.5">{n.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Right: Order Panel ── */}
        <div className="lg:sticky lg:top-4 h-fit">
          <div className="bg-white border border-[#e8e8e8] rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            {/* Stock mini header */}
            <div className="px-4 pt-4 pb-3 border-b border-[#e8e8e8]">
              <div className="text-[#1a1a1a] font-bold text-base">{stock.name}</div>
              <div className="text-[#6b7280] text-xs mt-0.5">
                <span className={stock.up ? "text-[#00b386]" : "text-[#e84040]"}>
                  NSE ₹{stock.price.toFixed(2)} ({stock.up ? "+" : ""}{stock.pct.toFixed(2)}%)
                </span>
                {" · "}
                <span className="text-[#6b7280]">BSE ₹{stock.bsePrice.toFixed(2)}</span>
                {" · "}
                <button className="text-[#00b386] hover:underline">Depth</button>
              </div>
            </div>

            {/* BUY / SELL tabs */}
            <div className="flex">
              {(["BUY", "SELL"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 py-3 text-sm font-bold transition-all border-b-2 ${
                    tab === t
                      ? t === "BUY"
                        ? "text-[#00b386] border-[#00b386] bg-[#00b386]/5"
                        : "text-[#e84040] border-[#e84040] bg-[#e84040]/5"
                      : "text-[#6b7280] border-transparent hover:text-[#1a1a1a]"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="p-4 space-y-4">
              {/* Order type selector */}
              <div className="flex items-center gap-1">
                {(["Delivery", "Intraday", "MTF"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setOrderType(t)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      orderType === t
                        ? "bg-[#e8e8e8] text-[#1a1a1a] border border-[#00b386]/30"
                        : "text-[#6b7280] hover:text-[#1a1a1a]"
                    }`}
                  >
                    {t}{t === "MTF" ? " 2.86×" : ""}
                  </button>
                ))}
              </div>

              {/* Quick qty buttons */}
              <div className="flex gap-2">
                {[1, 5, 10].map((q) => (
                  <button
                    key={q}
                    onClick={() => setQty(String(q))}
                    className="flex-1 py-1.5 rounded-lg text-xs font-semibold border border-[#e8e8e8] text-[#6b7280] hover:border-[#00b386]/40 hover:text-[#1a1a1a] transition-all"
                  >
                    {q}
                  </button>
                ))}
              </div>

              {/* Qty input */}
              <div>
                <label className="text-[#6b7280] text-xs mb-1.5 flex items-center gap-1">
                  Qty {stock.exchange} ↕
                </label>
                <input
                  type="number"
                  min="1"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2.5 rounded-xl bg-[#f8f9fa] border border-[#e8e8e8] text-[#1a1a1a] text-right text-sm font-mono focus:border-[#00b386]/50 focus:outline-none focus:ring-1 focus:ring-[#00b386]/30 transition-colors"
                />
              </div>

              {/* Price input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[#6b7280] text-xs flex items-center gap-1">
                    Price
                    <button
                      onClick={() => setPriceMode(priceMode === "Limit" ? "Market" : "Limit")}
                      className="text-[#00b386] hover:underline"
                    >
                      {priceMode} ↕
                    </button>
                  </label>
                </div>
                {priceMode === "Limit" ? (
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#f8f9fa] border border-[#e8e8e8] text-[#1a1a1a] text-right text-sm font-mono focus:border-[#00b386]/50 focus:outline-none focus:ring-1 focus:ring-[#00b386]/30 transition-colors"
                  />
                ) : (
                  <div className="w-full px-3 py-2.5 rounded-xl bg-[#f8f9fa] border border-[#e8e8e8] text-[#6b7280] text-right text-sm">
                    Market Price
                  </div>
                )}
              </div>

              {/* Summary row */}
              <div className="flex justify-between text-xs py-2 border-t border-[#e8e8e8]">
                <span className="text-[#6b7280]">Balance : <span className="text-[#1a1a1a]">₹48,320</span></span>
                <span className="text-[#6b7280]">Approx req : <span className={isBuy ? "text-[#00b386]" : "text-[#e84040]"}>₹{Number(orderTotal).toLocaleString("en-IN")}</span></span>
              </div>

              {/* Action button */}
              <button
                disabled={!qty || parseFloat(qty) <= 0}
                onClick={() => setStep("confirm")}
                className={`w-full py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                  isBuy
                    ? "bg-[#00b386] hover:bg-[#059669] text-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
                    : "bg-[#e84040] hover:bg-[#dc2626] text-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
                }`}
              >
                {tab} {qty && parseFloat(qty) > 0 ? `${qty} shares` : ""}
              </button>
            </div>
          </div>

          {/* Quick links */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Link href="/dashboard/portfolio"
              className="bg-white border border-[#e8e8e8] rounded-xl p-3 text-center hover:border-[#00b386]/30 transition-colors shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <div className="flex justify-center mb-1.5 text-[#6b7280]">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
              </div>
              <div className="text-[#1a1a1a] text-xs font-semibold">My Portfolio</div>
            </Link>
            <Link href="/dashboard/orders"
              className="bg-white border border-[#e8e8e8] rounded-xl p-3 text-center hover:border-[#00b386]/30 transition-colors shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <div className="flex justify-center mb-1.5 text-[#6b7280]">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
              </div>
              <div className="text-[#1a1a1a] text-xs font-semibold">Order Book</div>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Confirm Modal ── */}
      {step === "confirm" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white border border-[#e8e8e8] rounded-2xl p-6 w-full max-w-sm shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            <h3 className="text-[#1a1a1a] font-bold text-lg mb-1">Confirm Order</h3>
            <p className="text-[#6b7280] text-sm mb-5">Please review your order before placing it.</p>

            <div className="space-y-3 mb-5">
              {[
                { l: "Stock",       v: stock.name },
                { l: "Action",      v: tab,           c: isBuy ? "text-[#00b386]" : "text-[#e84040]" },
                { l: "Type",        v: orderType },
                { l: "Quantity",    v: `${qty} shares` },
                { l: "Price",       v: priceMode === "Market" ? "Market Price" : `₹${price}` },
                { l: "Total Value", v: `₹${Number(orderTotal).toLocaleString("en-IN")}`, c: "text-[#1a1a1a] font-bold" },
              ].map((r) => (
                <div key={r.l} className="flex justify-between items-center py-1.5 border-b border-[#e8e8e8]/50 last:border-0">
                  <span className="text-[#6b7280] text-sm">{r.l}</span>
                  <span className={`text-sm font-semibold ${r.c ?? "text-[#1a1a1a]"}`}>{r.v}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep("form")}
                className="flex-1 py-2.5 rounded-xl border border-[#e8e8e8] text-[#6b7280] text-sm font-semibold hover:border-[#00b386]/40 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className={`flex-1 py-2.5 rounded-xl text-white text-sm font-bold transition-all ${
                  isBuy ? "bg-[#00b386] hover:bg-[#059669]" : "bg-[#e84040] hover:bg-[#dc2626]"
                }`}
              >
                Confirm {tab}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Success Toast ── */}
      {step === "success" && (
        <div className="fixed bottom-6 right-6 z-50 bg-white border border-[#00b386]/50 rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)] flex items-center gap-3 min-w-64">
          <div className="w-10 h-10 rounded-full bg-[#00b386]/20 flex items-center justify-center shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00b386" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div>
            <div className="text-[#1a1a1a] font-bold text-sm">Paper Order Placed!</div>
            <div className="text-[#6b7280] text-xs mt-0.5">{tab} {qty} × {symbol} @ ₹{price}</div>
            <Link href="/dashboard/paper-trade" className="text-[#00b386] text-xs hover:underline">
              View in Paper Trade →
            </Link>
          </div>
        </div>
      )}

      {/* ── Error Toast ── */}
      {step === "error" && (
        <div className="fixed bottom-6 right-6 z-50 bg-white border border-[#e84040]/50 rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)] flex items-center gap-3 min-w-64">
          <div className="w-10 h-10 rounded-full bg-[#e84040]/10 flex items-center justify-center shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e84040" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </div>
          <div>
            <div className="text-[#1a1a1a] font-bold text-sm">Order Failed</div>
            <div className="text-[#e84040] text-xs mt-0.5">{orderErr}</div>
          </div>
        </div>
      )}
    </div>
  );
}
