"use client";

type Pick = {
  ticker: string;
  name: string;
  signal: "BUY" | "SELL" | "WATCH";
  buyZone: string;
  target: string;
  stopLoss: string;
  upside: string;
  risk: "Low" | "Medium" | "High";
  reason: string;
};

const MOCK_PICKS: Pick[] = [
  {
    ticker: "RELIANCE",
    name: "Reliance Industries",
    signal: "BUY",
    buyZone: "₹2,840–2,860",
    target: "₹3,050",
    stopLoss: "₹2,780",
    upside: "+7.4%",
    risk: "Low",
    reason: "Breaking 200-DMA with strong FII inflows. Jio subscriber growth supports revenue.",
  },
  {
    ticker: "HDFCBANK",
    name: "HDFC Bank",
    signal: "BUY",
    buyZone: "₹1,720–1,740",
    target: "₹1,880",
    stopLoss: "₹1,690",
    upside: "+8.0%",
    risk: "Low",
    reason: "Breakout above key resistance with 1.9× volume spike. MACD bullish crossover on daily.",
  },
  {
    ticker: "TATAMOTORS",
    name: "Tata Motors",
    signal: "BUY",
    buyZone: "₹390–400",
    target: "₹445",
    stopLoss: "₹375",
    upside: "+11.3%",
    risk: "Medium",
    reason: "EV segment growth and strong JLR demand. RSI at 58, momentum building post-consolidation.",
  },
  {
    ticker: "INFY",
    name: "Infosys",
    signal: "WATCH",
    buyZone: "₹1,870–1,900",
    target: "₹1,980",
    stopLoss: "₹1,840",
    upside: "+4.2%",
    risk: "Medium",
    reason: "RSI near overbought at 72. Awaiting Q3 guidance clarity before entry. Watch ₹1,900 break.",
  },
  {
    ticker: "APOLLOHOSP",
    name: "Apollo Hospitals",
    signal: "BUY",
    buyZone: "₹8,100–8,200",
    target: "₹8,900",
    stopLoss: "₹7,950",
    upside: "+8.5%",
    risk: "Low",
    reason: "Healthcare sector rotation with strong FII buying. Cup & handle pattern on weekly chart.",
  },
  {
    ticker: "CANARABANK",
    name: "Canara Bank",
    signal: "SELL",
    buyZone: "₹135–138",
    target: "₹118",
    stopLoss: "₹145",
    upside: "-12.6%",
    risk: "High",
    reason: "NPA concerns rising, DII selling at resistance. Bearish engulfing on weekly with high volume.",
  },
];

const SIGNAL_STYLE = {
  BUY:   { bg: "bg-[#e8f9f4]", text: "text-[#00b386]" },
  SELL:  { bg: "bg-[#fde8e8]", text: "text-[#e84040]" },
  WATCH: { bg: "bg-[#fef3e2]", text: "text-[#f59e0b]" },
};

const RISK_COLOR = {
  Low:    "text-[#00b386]",
  Medium: "text-[#f59e0b]",
  High:   "text-[#e84040]",
};

function PickCard({ pick }: { pick: Pick }) {
  const sig = SIGNAL_STYLE[pick.signal];
  const isUp = pick.upside.startsWith("+");

  return (
    <div className="bg-white border border-[#e8e8e8] rounded-xl p-3 hover:border-[#00b386]/40 hover:shadow-sm transition-all cursor-pointer overflow-hidden">
      {/* Signal badge + upside */}
      <div className="flex items-center justify-between mb-1.5 gap-1">
        <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold ${sig.bg} ${sig.text}`}>
          {pick.signal}
        </span>
        <span className={`text-xs font-bold shrink-0 ${isUp ? "text-[#00b386]" : "text-[#e84040]"}`}>
          {pick.upside}
        </span>
      </div>

      {/* Ticker + name */}
      <div className="text-[#1a1a1a] font-bold text-sm truncate">{pick.ticker}</div>
      <div className="text-[#6b7280] text-[11px] truncate mb-2">{pick.name}</div>

      {/* Reason */}
      <p className="text-[#374151] text-[11px] leading-relaxed mb-2.5 line-clamp-2">{pick.reason}</p>

      {/* Price levels */}
      <div className="border-t border-[#f0f0f0] pt-2 grid grid-cols-2 gap-x-2 gap-y-1.5">
        <div className="min-w-0">
          <div className="text-[#9ca3af] text-[9px] uppercase tracking-wide font-medium">Buy Zone</div>
          <div className="text-[#1a1a1a] text-[11px] font-semibold truncate">{pick.buyZone}</div>
        </div>
        <div className="min-w-0">
          <div className="text-[#9ca3af] text-[9px] uppercase tracking-wide font-medium">Target</div>
          <div className="text-[#00b386] text-[11px] font-semibold truncate">{pick.target}</div>
        </div>
        <div className="min-w-0">
          <div className="text-[#9ca3af] text-[9px] uppercase tracking-wide font-medium">Stop Loss</div>
          <div className="text-[#e84040] text-[11px] font-semibold truncate">{pick.stopLoss}</div>
        </div>
        <div className="min-w-0">
          <div className="text-[#9ca3af] text-[9px] uppercase tracking-wide font-medium">Risk</div>
          <div className={`text-[11px] font-semibold ${RISK_COLOR[pick.risk]}`}>{pick.risk}</div>
        </div>
      </div>
    </div>
  );
}

export default function AiTrendingStocks() {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[#1a1a1a] font-semibold text-base">AI Trending Picks</h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {MOCK_PICKS.map((p) => <PickCard key={p.ticker} pick={p} />)}
      </div>

      <p className="text-[#b0b0b0] text-[10px] mt-2">
        ⚠️ AI analysis only — not SEBI-registered advice. Verify before trading.
      </p>
    </div>
  );
}
