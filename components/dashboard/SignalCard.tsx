import Link from "next/link";
import { Card, Badge, ConfidenceMeter } from "@/components/ui";
import { colors } from "@/lib/theme";

export interface Signal {
  symbol: string;
  ticker: string;
  exchange: string;
  action: "BUY" | "SELL";
  confidence: number;
  entry: string;
  target: string;
  sl: string;
  rr: string;
  type: string;
  time: string;
  reasoning: string;
}

export function SignalCard({ signal }: { signal: Signal }) {
  const isBuy   = signal.action === "BUY";
  const borderColor = isBuy ? colors.primary : colors.danger;

  return (
    <Link href={`/dashboard/charts/${signal.ticker}`}
      className={`block bg-white border border-[#e8e8e8] rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-4
        hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:border-[#d0d0d0] transition-all cursor-pointer
        border-l-[3px]`}
      style={{ borderLeftColor: borderColor }}>

      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-[#1a1a1a] font-semibold text-sm">{signal.symbol}</span>
          <span className="text-[#9ca3af] text-xs">{signal.exchange}</span>
          <Badge variant={isBuy ? "buy" : "sell"}>{signal.action}</Badge>
        </div>
        <span className="text-[#9ca3af] text-xs">{signal.time}</span>
      </div>

      <ConfidenceMeter value={signal.confidence} />

      {/* Price levels */}
      <div className="mt-2.5 grid grid-cols-4 gap-2 text-xs">
        <div>
          <div className="text-[#9ca3af] mb-0.5">Entry</div>
          <div className="text-[#1a1a1a] font-mono font-semibold">₹{signal.entry}</div>
        </div>
        <div>
          <div className="text-[#9ca3af] mb-0.5">Target</div>
          <div className="font-mono font-semibold" style={{ color: colors.primary }}>₹{signal.target}</div>
        </div>
        <div>
          <div className="text-[#9ca3af] mb-0.5">Stop Loss</div>
          <div className="font-mono font-semibold" style={{ color: colors.danger }}>₹{signal.sl}</div>
        </div>
        <div>
          <div className="text-[#9ca3af] mb-0.5">R:R</div>
          <div className="font-semibold" style={{ color: colors.warning }}>{signal.rr}</div>
        </div>
      </div>

      <p className="mt-2 text-xs text-[#6b7280] line-clamp-1">{signal.reasoning}</p>
    </Link>
  );
}
