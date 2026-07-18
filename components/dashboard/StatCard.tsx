interface StatCardProps {
  label: string;
  value: string;
  sub: string;
  color: string;
  border: string;
}

export function StatCard({ label, value, sub, color, border }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-[#e8e8e8] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="text-[#6b7280] text-xs mb-2">{label}</div>
      <div className="text-2xl font-bold mb-1 tracking-tight" style={{ color }}>{value}</div>
      <div className="text-xs text-[#9ca3af]">{sub}</div>
      <div className="mt-3 h-0.5 rounded-full opacity-25" style={{ background: border }} />
    </div>
  );
}
