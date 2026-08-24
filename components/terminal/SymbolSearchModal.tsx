"use client";

import type { Dispatch, KeyboardEvent, SetStateAction } from "react";
import type { ApiWatchlistItem, SymbolMatch, Quote } from "@/lib/api";
import { SEARCH_EXCHANGES, MAX_WATCHLIST_SIZE, CURRENCY } from "@/lib/terminal-constants";
import { ExchangeBadge } from "@/components/ExchangeBadge";
import { ResponsiveModal } from "@/components/ResponsiveModal";

/** The symbol-search modal, shared verbatim by DesktopTerminalLayout and
 *  MobileTerminalLayout -- a modal doesn't arrange itself differently per
 *  layout the way the chart/tab content does, so this is extraction over
 *  duplication, unlike those. Only the trigger that opens it (a toolbar
 *  button on desktop, tapping the symbol/price on mobile) differs, and
 *  stays with each layout. */
export function SymbolSearchModal({
  searchOpen, setSearchOpen, searchQuery, setSearchQuery, handleSearchKeyDown,
  q, resultFilter, setResultFilter, searchingSymbols, symbolMatches, filteredMatches,
  selectSymbol, highlightedIndex, setHighlightedIndex, searchExchange, setSearchExchange,
  watchlist, watchlistLoading, suggestQuotes, handleRemoveFromWatchlist,
}: {
  searchOpen: boolean;
  setSearchOpen: Dispatch<SetStateAction<boolean>>;
  searchQuery: string;
  setSearchQuery: Dispatch<SetStateAction<string>>;
  handleSearchKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  q: string;
  resultFilter: string;
  setResultFilter: Dispatch<SetStateAction<string>>;
  searchingSymbols: boolean;
  symbolMatches: SymbolMatch[];
  filteredMatches: SymbolMatch[];
  selectSymbol: (sym: string, exchange?: string) => void;
  highlightedIndex: number;
  setHighlightedIndex: Dispatch<SetStateAction<number>>;
  searchExchange: string;
  setSearchExchange: Dispatch<SetStateAction<string>>;
  watchlist: ApiWatchlistItem[];
  watchlistLoading: boolean;
  suggestQuotes: Record<string, Quote>;
  handleRemoveFromWatchlist: (symbol: string, exchange: string) => Promise<void>;
}) {
  return (
    <ResponsiveModal open={searchOpen} onClose={() => setSearchOpen(false)} ariaLabel="Search symbols" maxWidthClass="max-w-xl" maxHeightClass="max-h-[75vh]">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted-foreground)" strokeWidth="2" className="shrink-0"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input
          autoFocus
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          placeholder="Search symbol…"
          aria-label="Search symbol"
          className="flex-1 min-w-0 text-sm text-foreground placeholder-muted-foreground focus:outline-none bg-transparent"
        />
        <button onClick={() => setSearchOpen(false)} aria-label="Close" className="text-muted-foreground hover:text-foreground shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>
      </div>
      {/* Filter chips -- filters the live results actually shown below,
          distinct from the exchange picker further down (that one only
          steers what "Load anyway" resolves an unmatched symbol on). */}
      {q && (
        <div className="flex gap-1 px-3 py-2 border-b border-border">
          {["ALL", ...SEARCH_EXCHANGES].map((ex) => (
            <button
              key={ex}
              onClick={() => setResultFilter(ex)}
              className={`px-2 py-0.5 text-[10px] font-mono font-semibold border transition-colors ${
                resultFilter === ex
                  ? "border-primary text-link bg-primary/10"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {ex}
            </button>
          ))}
        </div>
      )}
      <div className="overflow-y-auto">
      {q ? (
        <>
          {/* Real results — company name attached, exchange already
              correct, nothing to guess. This is what used to be
              "watchlist only, plus a tiny buried link" and read as
              search being broken. */}
          {searchingSymbols && symbolMatches.length === 0 && (
            <div className="px-3 py-3 text-xs text-muted-foreground text-center">Searching…</div>
          )}
          {filteredMatches.map((m, i) => (
            <button
              key={`${m.symbol}-${m.exchange}`}
              onClick={() => selectSymbol(m.symbol, m.exchange)}
              onMouseEnter={() => setHighlightedIndex(i)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${
                i === highlightedIndex ? "bg-secondary" : "hover:bg-secondary"
              }`}
            >
              <ExchangeBadge exchange={m.exchange} />
              <span className="text-sm font-bold shrink-0">{m.symbol}</span>
              <span className="text-xs text-muted-foreground truncate min-w-0">{m.name}</span>
              {m.exchange === "MCX" && (
                <span className="ml-auto text-[9px] text-muted-foreground font-mono border border-border px-1 shrink-0">FUT</span>
              )}
              <span className={`text-[10px] text-muted-foreground font-mono shrink-0 ${m.exchange === "MCX" ? "" : "ml-auto"}`}>{m.exchange}</span>
            </button>
          ))}

          {/* Fallback, always available: the live search is a scraped
              vendor endpoint and will occasionally miss something real
              — never block the user behind it finding a match. */}
          <div className={filteredMatches.length > 0 || searchingSymbols ? "border-t border-border" : ""}>
            <button onClick={() => selectSymbol(q, searchExchange)}
              onMouseEnter={() => setHighlightedIndex(filteredMatches.length)}
              className={`w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors ${
                highlightedIndex === filteredMatches.length ? "bg-primary/10" : "hover:bg-primary/10"
              }`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              <span className="text-sm font-bold">{q}</span>
              <span className="text-[10px] text-muted-foreground font-mono">
                {filteredMatches.length > 0 ? "— not listed above? try" : "on"} {searchExchange}
              </span>
            </button>
            <div className="flex gap-1 px-3 pb-2.5">
              {SEARCH_EXCHANGES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => setSearchExchange(ex)}
                  className={`px-2 py-0.5 text-[10px] font-mono font-semibold border transition-colors ${
                    searchExchange === ex
                      ? "border-primary text-link bg-primary/10"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="px-3 pt-2.5 pb-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest font-mono">
            Watchlist · {watchlist.length}/{MAX_WATCHLIST_SIZE}
          </div>
          {watchlistLoading ? (
            <div className="px-3 py-3 text-xs text-muted-foreground text-center">Loading…</div>
          ) : watchlist.length === 0 ? (
            <div className="px-3 py-3 text-xs text-muted-foreground text-center">
              Empty — type a company name or ticker above.
            </div>
          ) : watchlist.map((w, i) => {
            const sq = suggestQuotes[w.symbol];
            return (
              <div
                key={`${w.symbol}-${w.exchange}`}
                onMouseEnter={() => setHighlightedIndex(i)}
                className={`w-full flex items-center justify-between px-3 py-2 transition-colors group ${
                  i === highlightedIndex ? "bg-secondary" : "hover:bg-secondary"
                }`}
              >
                <button onClick={() => selectSymbol(w.symbol, w.exchange)} className="flex-1 flex items-center gap-2 text-left">
                  <ExchangeBadge exchange={w.exchange} />
                  <span className="text-sm font-bold">{w.symbol}</span>
                  <span className="text-[10px] text-muted-foreground ml-1.5 font-mono">{w.exchange}</span>
                </button>
                {sq && (
                  <span className="text-right mr-2 font-mono">
                    <span className="block text-xs font-semibold">{CURRENCY[w.exchange] ?? "₹"}{sq.ltp.toFixed(2)}</span>
                    <span className="block text-[10px] font-semibold" style={{ color: sq.change_percent >= 0 ? "var(--buy)" : "var(--sell)" }}>
                      {sq.change_percent >= 0 ? "+" : ""}{sq.change_percent.toFixed(2)}%
                    </span>
                  </span>
                )}
                <button onClick={() => handleRemoveFromWatchlist(w.symbol, w.exchange)}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-sell transition-opacity shrink-0 px-1" title="Remove">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            );
          })}
        </>
      )}
      </div>
    </ResponsiveModal>
  );
}
