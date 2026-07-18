"use client";

import { useState, useEffect } from "react";
import { getMarketNews, type ApiNewsItem } from "@/lib/api";

type NewsItem = ApiNewsItem;

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


const SENTIMENT_BARS: SentimentBar[] = [
  { label: "Nifty 50",   bull: 62, bear: 24, neutral: 14 },
  { label: "Bank Nifty", bull: 70, bear: 18, neutral: 12 },
  { label: "IT Sector",  bull: 28, bear: 58, neutral: 14 },
  { label: "Auto",       bull: 74, bear: 12, neutral: 14 },
  { label: "FMCG",       bull: 50, bear: 28, neutral: 22 },
];

type Filter = "All" | "POSITIVE" | "NEGATIVE" | "NEUTRAL";

function timeAgo(iso: string) {
  try {
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 3600)  return `${Math.round(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.round(diff / 3600)} hrs ago`;
    return `${Math.round(diff / 86400)} days ago`;
  } catch { return iso; }
}

export default function NewsPage() {
  const [filter, setFilter]   = useState<Filter>("All");
  const [news, setNews]       = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [noKey, setNoKey]     = useState(false);

  useEffect(() => {
    setLoading(true);
    getMarketNews(undefined, 20)
      .then(({ articles }) => {
        setNews(articles);
        setNoKey(articles.length === 0);
      })
      .catch(() => setNoKey(true))
      .finally(() => setLoading(false));
  }, []);

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

        {noKey && (
          <div className="px-4 py-2.5 rounded-xl bg-[#fffbeb] border border-[#fde68a] text-[#92400e] text-xs">
            Add <code className="font-mono">NEWS_API_KEY</code> to <code className="font-mono">ai-trader-signals/.env</code> to enable live news.
            Get a free key at <span className="font-semibold">newsapi.org</span>.
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

            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="bg-white border border-[#e8e8e8] rounded-xl p-4 animate-pulse h-24" />
              ))
            ) : filtered.length === 0 ? (
              <div className="bg-white border border-[#e8e8e8] rounded-xl p-8 text-center text-[#9ca3af] text-sm">
                No articles found. Add NEWS_API_KEY to see live news.
              </div>
            ) : filtered.map(item => (
              <a key={item.id} href={item.url} target="_blank" rel="noreferrer"
                className="block bg-white border border-[#e8e8e8] rounded-xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.04)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:border-[#d0d0d0] transition-all">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="text-sm font-semibold text-[#1a1a1a] leading-snug">{item.headline}</h3>
                  <SentimentBadge s={item.sentiment} />
                </div>
                {item.description && (
                  <p className="text-xs text-[#6b7280] leading-relaxed mb-3 line-clamp-2">{item.description}</p>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[#9ca3af]">{item.source}</span>
                    <span className="text-[#e0e0e0]">·</span>
                    <span className="text-[10px] text-[#9ca3af]">{timeAgo(item.publishedAt)}</span>
                  </div>
                  <div className="flex gap-1 flex-wrap justify-end">
                    {item.symbols.slice(0, 4).map(sym => (
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
