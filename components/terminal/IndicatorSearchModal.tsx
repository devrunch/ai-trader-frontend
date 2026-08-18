"use client";

import { useEffect, useRef, useState } from "react";
import { INDICATOR_CATALOG } from "./IndicatorMenu";
import type { IndicatorCategory } from "@/lib/diascript-indicators";

const CATEGORIES: (IndicatorCategory | "All")[] = ["All", "Overlays", "Trend", "Momentum", "Volatility", "Volume"];

/** Pure filter logic, exported for its own unit tests — substring match on
 * label (case-insensitive) narrowed by category, matching the original
 * dropdown's semantics exactly (just at a scale a dropdown can't browse). */
export function filterCatalog(
  catalog: typeof INDICATOR_CATALOG,
  search: string,
  category: IndicatorCategory | "All",
) {
  const q = search.trim().toLowerCase();
  return catalog.filter(
    (i) => (category === "All" || i.category === category) && (q === "" || i.label.toLowerCase().includes(q)),
  );
}

export interface IndicatorSearchModalProps {
  /** Indicator names currently shown. */
  active: string[];
  onToggle: (name: string) => void;
}

/** Which indicators are drawn on the chart — a searchable modal instead of a
 * small dropdown, since the catalog now has 45+ entries. Same trigger
 * button/badge and the same active/onToggle contract as the dropdown this
 * replaces, so the call site needed no changes beyond the component name. */
export function IndicatorSearchModal({ active, onToggle }: IndicatorSearchModalProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<IndicatorCategory | "All">("All");
  const wrapRef = useRef<HTMLDivElement>(null);

  /* Closing always resets search/category too, so the modal never reopens
     mid-search from last time — done at each close site directly (not via
     an effect watching `open`, which would call setState synchronously
     inside an effect body). */
  function close() {
    setOpen(false);
    setSearch("");
    setCategory("All");
  }

  /* Click-outside and Escape. A modal that only closes by clicking its own
     button traps a user who has moved on. */
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const results = filterCatalog(INDICATOR_CATALOG, search, category);

  return (
    <div className="relative" ref={wrapRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        className="flex items-center gap-1.5 px-2.5 py-1.5 border border-border text-muted-foreground text-xs font-semibold hover:text-foreground hover:border-primary/50 transition-colors"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 3v18h18"/><path d="M18.7 8l-5.1 5.2-3.6-3.6L4 15.6"/>
        </svg>
        <span className="hidden sm:inline">Indicators</span>
        {active.length > 0 && (
          <span className="px-1 bg-primary/15 text-link text-[9px] font-mono">{active.length}</span>
        )}
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1.5 w-80 max-h-112 flex flex-col bg-card border border-border shadow-lg z-30">
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search indicators..."
            className="w-full px-3 py-2 border-b border-border text-sm bg-transparent outline-none placeholder:text-muted-foreground"
          />
          <div className="flex flex-1 min-h-0">
            <div className="w-24 shrink-0 border-r border-border overflow-y-auto py-1">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`w-full text-left px-2.5 py-1.5 text-[11px] transition-colors ${
                    category === c ? "bg-secondary text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto py-1">
              {results.map((ind) => {
                const on = active.includes(ind.name);
                return (
                  <button
                    key={ind.name}
                    onClick={() => onToggle(ind.name)}
                    role="menuitemcheckbox"
                    aria-checked={on}
                    className="w-full flex items-center justify-between px-3 py-1.5 text-sm hover:bg-secondary transition-colors"
                  >
                    <span className={on ? "text-foreground" : "text-muted-foreground"}>
                      {ind.label}
                    </span>
                    <span className={`w-4 h-4 shrink-0 border flex items-center justify-center ${
                      on ? "bg-primary border-primary" : "border-border"
                    }`}>
                      {on && (
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                             stroke="var(--primary-foreground)" strokeWidth="3"
                             strokeLinecap="round" aria-hidden="true">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      )}
                    </span>
                  </button>
                );
              })}
              {results.length === 0 && (
                <div className="px-3 py-4 text-sm text-muted-foreground text-center">No indicators match.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
