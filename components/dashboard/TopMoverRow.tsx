import Link from "next/link";
import { Sparkline, PriceChange } from "@/components/ui";

export interface TopMover {
  symbol: string;
  ticker: string;
  price: string;
  change: string;
  pct: string;
  vol: string;
  up: boolean;
  spark: number[];
}

export function TopMoverRow({ stock: s, isLast }: { stock: TopMover; isLast: boolean }) {
  return (
    <Link href={`/dashboard/charts/${s.ticker}`}
      className={`grid grid-cols-[2fr_1fr_110px_1fr] items-center px-4 py-3 hover:bg-[#f8f9fa] transition-colors cursor-pointer ${!isLast ? "border-b border-[#f0f0f0]" : ""}`}>
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#f0f0f0] flex items-center justify-center text-[#6b7280] font-bold text-xs shrink-0">
          {s.ticker.slice(0, 2)}
        </div>
        <span className="text-[#1a1a1a] text-sm font-medium">{s.symbol}</span>
      </div>
      <div className="flex justify-center">
        <Sparkline data={s.spark} up={s.up} w={80} h={32} id={s.ticker} />
      </div>
      <div className="text-right">
        <div className="text-[#1a1a1a] text-sm font-semibold font-mono">{s.price}</div>
        <PriceChange change={s.change} pct={s.pct} up={s.up} />
      </div>
      <div className="text-right text-[#6b7280] text-xs font-mono pr-2">{s.vol}</div>
    </Link>
  );
}
