import Link from "next/link";
import { StockLogo, PriceChange } from "@/components/ui";
import { cn } from "@/lib/theme";

export interface StockCardData {
  ticker: string;
  name: string;
  price: string;
  change: string;
  pct: string;
  up: boolean;
  color: string;
}

export function StockCard({ stock }: { stock: StockCardData }) {
  return (
    <Link href={`/dashboard/charts/${stock.ticker}`}
      className={`${cn.cardHover} p-4 block`}>
      <StockLogo ticker={stock.ticker} color={stock.color} size="md" />
      <div className="text-[#1a1a1a] text-sm font-medium mt-3 mb-3 leading-tight">{stock.name}</div>
      <div className="text-[#1a1a1a] text-sm font-bold">{stock.price}</div>
      <PriceChange change={stock.change} pct={stock.pct} up={stock.up} />
    </Link>
  );
}
