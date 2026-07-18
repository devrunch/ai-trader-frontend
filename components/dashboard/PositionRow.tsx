import Link from "next/link";
import { Sparkline, PriceChange } from "@/components/ui";

export interface Position {
  symbol: string;
  name: string;
  qty: number;
  avgPrice: string;
  cmp: string;
  pnl: string;
  pct: string;
  up: boolean;
  spark: number[];
}

export function PositionRow({ position: p, isLast }: { position: Position; isLast: boolean }) {
  return (
    <Link href={`/dashboard/charts/${p.symbol}`}
      className={`flex items-center gap-3 px-4 py-3 hover:bg-[#f8f9fa] transition-colors ${!isLast ? "border-b border-[#f0f0f0]" : ""}`}>
      <div className="w-8 h-8 rounded-lg bg-[#f0f0f0] flex items-center justify-center text-[#6b7280] font-bold text-xs shrink-0">
        {p.symbol.slice(0, 2)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[#1a1a1a] font-semibold text-sm">{p.symbol}</div>
        <div className="text-[#9ca3af] text-xs">{p.qty} shares · avg ₹{p.avgPrice}</div>
      </div>
      <div className="shrink-0">
        <Sparkline data={p.spark} up={p.up} w={60} h={26} id={p.symbol} />
      </div>
      <div className="text-right shrink-0">
        <div className="text-[#1a1a1a] text-xs font-mono">₹{p.cmp}</div>
        <PriceChange change={p.pnl} pct={p.pct} up={p.up} />
      </div>
    </Link>
  );
}
