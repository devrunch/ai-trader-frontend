/* ─── Design tokens ─── */

export const colors = {
  primary:      "#00b386",
  primaryLight: "#e8f9f4",
  danger:       "#e84040",
  dangerLight:  "#fef2f2",
  warning:      "#f59e0b",
  warningLight: "#fffbeb",
  info:         "#3b82f6",
  infoLight:    "#eff6ff",
  purple:       "#6366f1",
  purpleLight:  "#f5f3ff",
  border:       "#e8e8e8",
  divider:      "#f0f0f0",
  surface:      "#f8f9fa",
  card:         "#ffffff",
  text:         "#1a1a1a",
  textSub:      "#6b7280",
  textMuted:    "#9ca3af",
} as const;

export const cn = {
  card:      "bg-white border border-[#e8e8e8] rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.04)]",
  cardHover: "bg-white border border-[#e8e8e8] rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.04)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:border-[#d0d0d0] transition-all",
  tableRow:  "hover:bg-[#f8f9fa] transition-colors",
  section:   "space-y-3",
} as const;
