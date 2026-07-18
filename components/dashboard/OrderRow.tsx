import { Badge } from "@/components/ui";
import { colors } from "@/lib/theme";

type OrderStatus = "COMPLETE" | "OPEN" | "PENDING" | "REJECTED";

export interface Order {
  id: string;
  symbol: string;
  side: "BUY" | "SELL";
  qty: number;
  price: string;
  status: OrderStatus;
  time: string;
}

const STATUS_VARIANT: Record<OrderStatus, "complete" | "open" | "pending" | "rejected"> = {
  COMPLETE: "complete",
  OPEN:     "open",
  PENDING:  "pending",
  REJECTED: "rejected",
};

export function OrderRow({ order: o, compact = false }: { order: Order; compact?: boolean }) {
  if (compact) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 hover:bg-[#f8f9fa] transition-colors">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0`}
          style={{ background: o.side === "BUY" ? colors.primaryLight : colors.dangerLight,
                   color:      o.side === "BUY" ? colors.primary      : colors.danger }}>
          {o.side === "BUY" ? "B" : "S"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[#1a1a1a] text-sm font-semibold">{o.symbol}</span>
            <span className="text-[#9ca3af] text-xs">· {o.qty} qty</span>
          </div>
          <div className="text-[#9ca3af] text-xs">₹{o.price} · {o.time}</div>
        </div>
        <Badge variant={STATUS_VARIANT[o.status]} pill>{o.status}</Badge>
      </div>
    );
  }

  return (
    <tr className="hover:bg-[#f8f9fa] transition-colors border-b border-[#f0f0f0] last:border-0">
      <td className="px-4 py-3 text-[#9ca3af] font-mono text-xs">{o.id}</td>
      <td className="px-4 py-3 text-[#1a1a1a] font-semibold text-xs">{o.symbol}</td>
      <td className="px-4 py-3"><Badge variant={o.side === "BUY" ? "buy" : "sell"}>{o.side}</Badge></td>
      <td className="px-4 py-3 text-[#1a1a1a] text-xs">{o.qty}</td>
      <td className="px-4 py-3 text-[#1a1a1a] font-mono text-xs">₹{o.price}</td>
      <td className="px-4 py-3"><Badge variant={STATUS_VARIANT[o.status]} pill>{o.status}</Badge></td>
      <td className="px-4 py-3 text-[#9ca3af] text-xs">{o.time}</td>
    </tr>
  );
}
