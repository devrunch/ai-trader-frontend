import { colors } from "@/lib/theme";

interface ConfidenceMeterProps {
  value: number;
}

function confidenceColor(v: number) {
  if (v >= 75) return colors.primary;
  if (v >= 65) return colors.warning;
  return colors.textMuted;
}

export function ConfidenceMeter({ value }: ConfidenceMeterProps) {
  const color = confidenceColor(value);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 bg-[#f0f0f0] rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="text-[10px] font-semibold" style={{ color }}>{value}%</span>
    </div>
  );
}
