import { colors } from "@/lib/theme";

interface SparklineProps {
  data: number[];
  up: boolean;
  w?: number;
  h?: number;
  /** Unique id suffix to avoid SVG gradient ID collisions */
  id: string;
}

export function Sparkline({ data, up, w = 80, h = 32, id }: SparklineProps) {
  if (data.length < 2) return null;

  const min = Math.min(...data), max = Math.max(...data), range = max - min || 1;
  const pad = 2;

  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    const y = (h - pad) - ((v - min) / range) * (h - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const line = `M ${pts.join(" L ")}`;
  const [fx] = pts[0].split(",");
  const [lx] = pts[pts.length - 1].split(",");
  const area = `${line} L ${lx},${h} L ${fx},${h} Z`;
  const c = up ? colors.primary : colors.danger;
  const gradId = `spark-${id}`;

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={c} stopOpacity="0.18" />
          <stop offset="100%" stopColor={c} stopOpacity="0"    />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} />
      <path d={line} fill="none" stroke={c} strokeWidth="1.5"
            strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
