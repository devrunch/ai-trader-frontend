import { colors } from "@/lib/theme";

interface PriceChangeProps {
  change: string | number;
  pct?: string | number;
  up: boolean;
  size?: "xs" | "sm";
}

export function PriceChange({ change, pct, up, size = "xs" }: PriceChangeProps) {
  const color = up ? colors.primary : colors.danger;
  const cls   = size === "sm" ? "text-sm" : "text-xs";
  return (
    <span className={`${cls} font-semibold`} style={{ color }}>
      {up && typeof change === "string" && !change.startsWith("+") ? "+" : ""}
      {change}
      {pct !== undefined && ` (${pct})`}
    </span>
  );
}
