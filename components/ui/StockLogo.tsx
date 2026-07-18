interface StockLogoProps {
  ticker: string;
  color?: string;
  size?: "sm" | "md" | "lg";
}

const SIZE = {
  sm: "w-7 h-7 text-[10px]",
  md: "w-9 h-9 text-xs",
  lg: "w-10 h-10 text-sm",
};

export function StockLogo({ ticker, color = "#6b7280", size = "md" }: StockLogoProps) {
  return (
    <div
      className={`${SIZE[size]} rounded-xl flex items-center justify-center text-white font-bold shrink-0`}
      style={{ background: color }}
    >
      {ticker.slice(0, 2).toUpperCase()}
    </div>
  );
}
