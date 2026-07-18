import { colors } from "@/lib/theme";

type Variant = "buy" | "sell" | "complete" | "open" | "pending" | "rejected" | "neutral";

const VARIANTS: Record<Variant, { bg: string; text: string }> = {
  buy:      { bg: colors.primaryLight, text: colors.primary  },
  sell:     { bg: colors.dangerLight,  text: colors.danger   },
  complete: { bg: colors.primaryLight, text: colors.primary  },
  open:     { bg: colors.infoLight,    text: colors.info     },
  pending:  { bg: colors.warningLight, text: colors.warning  },
  rejected: { bg: colors.dangerLight,  text: colors.danger   },
  neutral:  { bg: "#f3f4f6",           text: colors.textSub  },
};

interface BadgeProps {
  variant: Variant;
  children: React.ReactNode;
  pill?: boolean;
  className?: string;
}

export function Badge({ variant, children, pill = false, className = "" }: BadgeProps) {
  const { bg, text } = VARIANTS[variant];
  return (
    <span
      className={`px-2 py-0.5 text-[10px] font-bold ${pill ? "rounded-full" : "rounded"} ${className}`}
      style={{ background: bg, color: text }}
    >
      {children}
    </span>
  );
}
