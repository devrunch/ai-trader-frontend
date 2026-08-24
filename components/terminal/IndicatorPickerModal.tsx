"use client";

import { useState } from "react";
import type { ApiIndicator } from "@/lib/api/indicators";
import { INDICATOR_CATEGORIES, type SpecialIndicatorEntry } from "@/lib/indicators/catalog";
import { ResponsiveModal } from "@/components/ResponsiveModal";

/** One row in the picker: either a real DB-backed Pine indicator (a default,
 *  ownerId: null, or the current user's own custom one) or one of the small
 *  fixed set of non-Pine primitives (Volume Profile, VSA). `ownerId` on a
 *  pine entry is never anyone else's -- the API only ever returns defaults
 *  plus the requesting user's own customs -- so `ownerId !== null` alone is
 *  enough to know this row is editable. */
export type PickerEntry = (ApiIndicator & { kind: "pine" }) | SpecialIndicatorEntry;

/** Searchable, categorized picker over every available indicator -- the 49
 *  built-ins, the user's own customs, and Volume Profile/VSA. Purely a list
 *  + toggle UI otherwise; the caller's `onToggle` decides what
 *  attaching/detaching a given row actually means. */
export function IndicatorPickerModal({ open, onClose, entries, attachedIds, onToggle, onCreateNew, onEdit, onDelete }: {
  open: boolean;
  onClose: () => void;
  entries: PickerEntry[];
  attachedIds: Set<string>;
  onToggle: (entry: PickerEntry) => void;
  onCreateNew: () => void;
  onEdit: (entry: ApiIndicator) => void;
  onDelete: (id: string) => void;
}) {
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const filtered = q
    ? entries.filter((e) => e.name.toLowerCase().includes(q) || e.category.toLowerCase().includes(q))
    : entries;

  return (
    <ResponsiveModal open={open} onClose={onClose} ariaLabel="Indicators" maxWidthClass="max-w-lg" maxHeightClass="max-h-[76vh]">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-heading font-semibold text-base">Indicators</h2>
            <button onClick={onClose} aria-label="Close" className="text-muted-foreground hover:text-foreground">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search indicators…"
              aria-label="Search indicators"
              className="flex-1 bg-secondary/40 border border-border px-3 py-2 text-sm placeholder-muted-foreground focus:outline-none focus:border-primary"
            />
            <button
              onClick={onCreateNew}
              className="shrink-0 px-3 py-2 text-xs font-semibold border border-border hover:border-primary hover:text-primary text-muted-foreground transition-colors"
            >
              + New
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1">
          {q ? (
            <IndicatorGroup entries={filtered} attachedIds={attachedIds} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} />
          ) : (
            INDICATOR_CATEGORIES.map((cat) => {
              const catEntries = entries.filter((e) => e.category === cat);
              if (catEntries.length === 0) return null;
              return (
                <div key={cat}>
                  <div className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{cat}</div>
                  <IndicatorGroup entries={catEntries} attachedIds={attachedIds} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} />
                </div>
              );
            })
          )}
          {q && filtered.length === 0 && (
            <p className="px-4 py-6 text-sm text-muted-foreground text-center">No indicators match &ldquo;{query}&rdquo;.</p>
          )}
        </div>
    </ResponsiveModal>
  );
}

function IndicatorGroup({ entries, attachedIds, onToggle, onEdit, onDelete }: {
  entries: PickerEntry[];
  attachedIds: Set<string>;
  onToggle: (entry: PickerEntry) => void;
  onEdit: (entry: ApiIndicator) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="px-2 pb-2">
      {entries.map((e) => {
        const isOn = attachedIds.has(e.id);
        const isOwned = e.kind === "pine" && e.ownerId !== null;
        return (
          <div key={e.id} className="w-full flex items-center gap-1 group">
            <button
              onClick={() => onToggle(e)}
              className="flex-1 flex items-center gap-3 px-2.5 py-2 text-left hover:bg-secondary/50 transition-colors"
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
            {isOwned && (
              <span className="hidden group-hover:flex items-center gap-1 pr-2">
                <button
                  onClick={() => onEdit(e as ApiIndicator)}
                  aria-label={`Edit ${e.name}`}
                  className="p-1 text-muted-foreground hover:text-foreground"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
                </button>
                <button
                  onClick={() => onDelete(e.id)}
                  aria-label={`Delete ${e.name}`}
                  className="p-1 text-muted-foreground hover:text-sell"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" /></svg>
                </button>
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
