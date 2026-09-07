"use client";

type Tab = "chart" | "signal" | "trade" | "positions" | "chat";

// Signal tab hidden -- generation was producing unreliable directions and
// isn't wanted right now. `signal` stays in the Tab union (page.tsx state
// machinery still uses it) so this is a one-line revert.
const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: "chart", label: "Chart", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg> },
  { key: "trade", label: "Trade", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18" /><path d="M18 9l-5 5-4-4-4 4" /></svg> },
  { key: "positions", label: "Positions", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg> },
  { key: "chat", label: "Chat", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg> },
];

export function MobileBottomTabBar({ active, onChange }: { active: Tab; onChange: (tab: Tab) => void }) {
  return (
    <div className="flex border-t border-border shrink-0 bg-card">
      {TABS.map((tab) => {
        const isActive = active === tab.key;
        return (
          <button
            key={tab.key}
            aria-label={tab.label}
            aria-current={isActive ? "page" : undefined}
            onClick={() => onChange(tab.key)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2 transition-colors ${isActive ? "text-link" : "text-muted-foreground"}`}
          >
            {tab.icon}
            {isActive ? (
              <span className="text-[10px] font-semibold">{tab.label}</span>
            ) : (
              <span className="sr-only">{tab.label}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
