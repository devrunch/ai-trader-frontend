/** No real per-symbol logos available -- a deterministic colored monogram
 *  per exchange is the same fallback TradingView itself uses for a symbol
 *  without a real logo, and it's what actually differentiates rows at a
 *  glance in a mixed-exchange result list. */
const EXCHANGE_COLORS: Record<string, string> = {
  NSE: "#3b82f6", BSE: "#8b5cf6", NASDAQ: "#f59e0b", NYSE: "#10b981", MCX: "#eab308",
};

export function ExchangeBadge({ exchange }: { exchange: string }) {
  return (
    <span
      className="w-6 h-6 shrink-0 flex items-center justify-center text-[10px] font-bold text-white rounded-sm"
      style={{ backgroundColor: EXCHANGE_COLORS[exchange] ?? "#6b7280" }}
    >
      {exchange[0]}
    </span>
  );
}
