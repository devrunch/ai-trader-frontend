"use client";

import { useState } from "react";
import { INDICATOR_CATALOG, INDICATOR_CATEGORIES, type IndicatorCatalogEntry } from "@/lib/indicators/catalog";

/** Searchable, categorized picker over the built-in indicator library.
 *  Purely a list + toggle UI -- it doesn't know or care whether a row is a
 *  Pine script or the Volume Profile primitive; the caller's `onToggle`
 *  decides what attaching/detaching that entry actually means. */
export function IndicatorPickerModal({ open, onClose, attachedIds, onToggle }: {
  open: boolean;
  onClose: () => void;
  attachedIds: Set<string>;
  onToggle: (entry: IndicatorCatalogEntry) => void;
}) {
  const [query, setQuery] = useState("");

  if (!open) return null;

  const q = query.trim().toLowerCase();
  const filtered = q
    ? INDICATOR_CATALOG.filter((e) => e.name.toLowerCase().includes(q) || e.category.toLowerCase().includes(q))
    : INDICATOR_CATALOG;

  return (
    <div
      role="dialog" aria-modal="true" aria-labelledby="indicator-picker-title"
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm p-4 pt-[8vh]"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border w-full max-w-lg max-h-[76vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <h2 id="indicator-picker-title" className="font-heading font-semibold text-base">Indicators</h2>
            <button onClick={onClose} aria-label="Close" className="text-muted-foreground hover:text-foreground">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          </div>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search indicators…"
            aria-label="Search indicators"
            className="w-full bg-secondary/40 border border-border px-3 py-2 text-sm placeholder-muted-foreground focus:outline-none focus:border-primary"
          />
        </div>

        <div className="overflow-y-auto flex-1">
          {q ? (
            <IndicatorGroup entries={filtered} attachedIds={attachedIds} onToggle={onToggle} />
          ) : (
            INDICATOR_CATEGORIES.map((cat) => {
              const entries = INDICATOR_CATALOG.filter((e) => e.category === cat);
              return (
                <div key={cat}>
                  <div className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{cat}</div>
                  <IndicatorGroup entries={entries} attachedIds={attachedIds} onToggle={onToggle} />
                </div>
              );
            })
          )}
          {q && filtered.length === 0 && (
            <p className="px-4 py-6 text-sm text-muted-foreground text-center">No indicators match &ldquo;{query}&rdquo;.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function IndicatorGroup({ entries, attachedIds, onToggle }: {
  entries: IndicatorCatalogEntry[];
  attachedIds: Set<string>;
  onToggle: (entry: IndicatorCatalogEntry) => void;
}) {
  return (
    <div className="px-2 pb-2">
      {entries.map((e) => {
        const isOn = attachedIds.has(e.id);
        return (
          <button
            key={e.id}
            onClick={() => onToggle(e)}
            className="w-full flex items-center gap-3 px-2.5 py-2 text-left hover:bg-secondary/50 transition-colors"
          >
            <span
              className="w-4 h-4 shrink-0 border flex items-center justify-center"
              style={{ borderColor: isOn ? "var(--primary)" : "var(--border)", background: isOn ? "var(--primary)" : "transparent" }}
            >
              {isOn && (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#0b0e14" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              )}
            </span>
            <span className="text-sm">{e.name}</span>
            <span className="ml-auto text-[10px] text-muted-foreground font-mono">
              {e.pane === "main" ? "overlay" : e.pane === "volume" ? "on volume" : "sub-pane"}
            </span>
          </button>
        );
      })}
    </div>
  );
}
