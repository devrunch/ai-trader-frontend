"use client";

import { useState, useEffect } from "react";

/* ─── Types ─── */
interface NewsItem {
  id: string;
  headline: string;
  source: string;
  publishedAt: string;
  url: string;
  symbols: string[];
  sentiment: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
  sentimentScore: number; // -1 to 1
  summary: string;
}

interface SentimentBar {
  label: string;
  bull: number;
  bear: number;
  neutral: number;
}

/* ─── Sentiment badge ─── */
function SentimentBadge({ s }: { s: "POSITIVE" | "NEGATIVE" | "NEUTRAL" }) {
  const map = {
    POSITIVE: "bg-[#e8f9f4] text-[#00b386]",
    NEGATIVE: "bg-[#fef2f2] text-[#e84040]",
    NEUTRAL:  "bg-[#f5f5f5] text-[#6b7280]",
  };
  return (
    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${map[s]}`}>{s}</span>
  );
}

/* ─── Placeholder data (NewsAPI not wired yet) ─── */
const PLACEHOLDER: NewsItem[] = [
  { id:"1", headline:"RBI holds repo rate at 6.5% for sixth consecutive meeting", source:"Mint", publishedAt:"2 hrs ago", url:"#", symbols:["HDFCBANK","ICICIBANK","SBIN"], sentiment:"POSITIVE", sentimentScore:0.62, summary:"RBI's status quo boosts banking sector sentiment as rate stability supports NIM expansion for lenders." },
  { id:"2", headline:"Reliance Industries Q4 net profit rises 8% YoY to ₹21,423 Cr", source:"ET Markets", publishedAt:"4 hrs ago", url:"#", symbols:["RELIANCE"], sentiment:"POSITIVE", sentimentScore:0.78, summary:"Jio subscriber growth and retail EBITDA expansion drove strong quarterly performance. Refining margins remained stable." },
  { id:"3", headline:"India VIX surges 12% amid global risk-off; FIIs sell ₹3,200 Cr", source:"NSE", publishedAt:"5 hrs ago", url:"#", symbols:["NIFTY","BANKNIFTY"], sentiment:"NEGATIVE", sentimentScore:-0.55, summary:"Rising geopolitical tensions and US Fed hawkish tone triggered broad-based selling in mid- and small-cap indices." },
  { id:"4", headline:"Infosys cuts FY25 revenue guidance to 1–3% citing weak macro", source:"Reuters", publishedAt:"6 hrs ago", url:"#", symbols:["INFY","TCS","WIPRO"], sentiment:"NEGATIVE", sentimentScore:-0.71, summary:"IT sector headwinds persist as BFSI and telecom verticals delay discretionary spends. Management cautious on deal ramp-ups." },
  { id:"5", headline:"Tata Motors EV sales hit record 10,000 units in June", source:"Business Standard", publishedAt:"7 hrs ago", url:"#", symbols:["TATAMOTORS"], sentiment:"POSITIVE", sentimentScore:0.84, summary:"Strong domestic EV demand driven by Nexon and Punch models. Export pipeline for Jaguar Land Rover improving QoQ." },
  { id:"6", headline:"SEBI proposes tighter F&O margin rules for retail traders", source:"SEBI", publishedAt:"1 day ago", url:"#", symbols:["NIFTY"], sentiment:"NEUTRAL", sentimentScore:0.05, summary:"New framework aims to curb retail speculation in options. Institutional volumes expected to be unaffected." },
];

const SENTIMENT_BARS: SentimentBar[] = [
  { label: "Nifty 50",   bull: 62, bear: 24, neutral: 14 },
  { label: "Bank Nifty", bull: 70, bear: 18, neutral: 12 },
  { label: "IT Sector",  bull: 28, bear: 58, neutral: 14 },
  { label: "Auto",       bull: 74, bear: 12, neutral: 14 },
  { label: "FMCG",       bull: 50, bear: 28, neutral: 22 },
];

type Filter = "All" | "POSITIVE" | "NEGATIVE" | "NEUTRAL";

export default function NewsPage() {
  const [filter, setFilter] = useState<Filter>("All");
  const [news] = useState<NewsItem[]>(PLACEHOLDER);
  const [apiNote] = useState("Live news feed coming soon — connect NewsAPI key to activate.");

  const filtered = filter === "All" ? news : news.filter(n => n.sentiment === filter);

  /* Overall market sentiment */
  const pos = news.filter(n => n.sentiment === "POSITIVE").length;
  const neg = news.filter(n => n.sentiment === "NEGATIVE").length;
  const neu = news.filter(n => n.sentiment === "NEUTRAL").length;
  const total = news.length;

  return (
    <div className="h-full overflow-y-auto no-scrollbar">
      <div className="max-w-5xl py-6 space-y-5">

        <h1 className="text-lg font-semibold text-[#1a1a1a]">News & Sentiment</h1>

        {apiNote && (
          <div className="px-4 py-2.5 rounded-xl bg-[#fffbeb] border border-[#fde68a] text-[#92400e] text-xs">
            {apiNote}
          </div>
        )}

        <div className="grid lg:grid-cols-[1fr_300px] gap-5 items-start">

          {/* ── News feed ── */}
          <div className="space-y-3">
            {/* Filter pills */}
            <div className="flex gap-2">
              {(["All","POSITIVE","NEGATIVE","NEUTRAL"] as Filter[]).map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    filter === f
                      ? f === "POSITIVE" ? "bg-[#00b386] text-white"
                        : f === "NEGATIVE" ? "bg-[#e84040] text-white"
                        : f === "NEUTRAL"  ? "bg-[#6b7280] text-white"
                        : "bg-[#1a1a1a] text-white"
                      : "bg-white border border-[#e8e8e8] text-[#6b7280] hover:border-[#c8c8c8]"
                  }`}>
                  {f === "All" ? `All (${total})` : f === "POSITIVE" ? `Bullish (${pos})` : f === "NEGATIVE" ? `Bearish (${neg})` : `Neutral (${neu})`}
                </button>
              ))}
            </div>

            {filtered.map(item => (
              <a key={item.id} href={item.url} target="_blank" rel="noreferrer"
                className="block bg-white border border-[#e8e8e8] rounded-xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.04)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:border-[#d0d0d0] transition-all">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="text-sm font-semibold text-[#1a1a1a] leading-snug">{item.headline}</h3>
                  <SentimentBadge s={item.sentiment} />
                </div>
                <p className="text-xs text-[#6b7280] leading-relaxed mb-3">{item.summary}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[#9ca3af]">{item.source}</span>
                    <span className="text-[#e0e0e0]">·</span>
                    <span className="text-[10px] text-[#9ca3af]">{item.publishedAt}</span>
                  </div>
                  <div className="flex gap-1">
                    {item.symbols.map(sym => (
                      <span key={sym} className="px-1.5 py-0.5 rounded bg-[#f5f5f5] text-[#6b7280] text-[9px] font-medium">{sym}</span>
                    ))}
                  </div>
                </div>
              </a>
            ))}
          </div>

          {/* ── Sentiment sidebar ── */}
          <div className="space-y-4">

            {/* Market-wide sentiment gauge */}
            <div className="bg-white border border-[#e8e8e8] rounded-xl p-5 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
              <h3 className="text-sm font-semibold text-[#1a1a1a] mb-4">Today&apos;s Sentiment</h3>
              <div className="flex h-3 rounded-full overflow-hidden mb-3">
                <div className="bg-[#00b386] transition-all" style={{ width: `${(pos/total)*100}%` }} />
                <div className="bg-[#e84040] transition-all" style={{ width: `${(neg/total)*100}%` }} />
                <div className="bg-[#e8e8e8] transition-all" style={{ width: `${(neu/total)*100}%` }} />
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-[#00b386] font-semibold">{Math.round((pos/total)*100)}% Bullish</span>
                <span className="text-[#9ca3af]">{Math.round((neu/total)*100)}% Neutral</span>
                <span className="text-[#e84040] font-semibold">{Math.round((neg/total)*100)}% Bearish</span>
              </div>
            </div>

            {/* Sector sentiment */}
            <div className="bg-white border border-[#e8e8e8] rounded-xl p-5 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
              <h3 className="text-sm font-semibold text-[#1a1a1a] mb-4">Sector Sentiment</h3>
              <div className="space-y-3">
                {SENTIMENT_BARS.map(b => (
                  <div key={b.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-[#6b7280]">{b.label}</span>
                      <span className={`text-xs font-semibold ${b.bull > b.bear ? "text-[#00b386]" : "text-[#e84040]"}`}>
                        {b.bull > b.bear ? "Bullish" : "Bearish"}
                      </span>
                    </div>
                    <div className="flex h-2 rounded-full overflow-hidden gap-px">
                      <div className="bg-[#00b386] rounded-l-full" style={{ width: `${b.bull}%` }} />
                      <div className="bg-[#e8e8e8]" style={{ width: `${b.neutral}%` }} />
                      <div className="bg-[#e84040] rounded-r-full" style={{ width: `${b.bear}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* FII/DII flows */}
            <div className="bg-white border border-[#e8e8e8] rounded-xl p-5 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
              <h3 className="text-sm font-semibold text-[#1a1a1a] mb-3">FII / DII Flows</h3>
              <div className="space-y-2">
                {[
                  { l: "FII", buy: "₹8,432 Cr", sell: "₹11,632 Cr", net: "-₹3,200 Cr", up: false },
                  { l: "DII", buy: "₹9,840 Cr", sell: "₹6,210 Cr",  net: "+₹3,630 Cr", up: true  },
                ].map(f => (
                  <div key={f.l} className="flex items-center justify-between py-2 border-b border-[#f5f5f5] last:border-0">
                    <div>
                      <div className="text-xs font-semibold text-[#1a1a1a]">{f.l}</div>
                      <div className="text-[10px] text-[#9ca3af]">B: {f.buy} · S: {f.sell}</div>
                    </div>
                    <div className={`text-sm font-bold ${f.up ? "text-[#00b386]" : "text-[#e84040]"}`}>{f.net}</div>
                  </div>
                ))}
              </div>
              <p className="text-[9px] text-[#9ca3af] mt-2">Live FII/DII data via NSE API coming soon</p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
