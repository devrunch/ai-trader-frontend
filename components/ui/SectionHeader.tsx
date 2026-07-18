import Link from "next/link";
import { colors } from "@/lib/theme";

interface SectionHeaderProps {
  title: string;
  badge?: string;
  href?: string;
  linkText?: string;
}

export function SectionHeader({ title, badge, href, linkText = "View all" }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <h2 className="text-[#1a1a1a] font-semibold text-sm">{title}</h2>
        {badge && (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
            style={{ background: colors.primaryLight, color: colors.primary }}>
            {badge}
          </span>
        )}
      </div>
      {href && (
        <Link href={href} className="text-xs font-medium hover:underline"
          style={{ color: colors.primary }}>
          {linkText}
        </Link>
      )}
    </div>
  );
}
