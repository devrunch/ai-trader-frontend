"use client";

import type { Dispatch, KeyboardEvent, RefObject, SetStateAction } from "react";
import {
  PRICE_DELAY_NOTE, deleteIndicator,
  type ApiOhlcBar, type ApiWatchlistItem, type ApiPosition, type ApiIndicator,
  type ChatDrawing, type CustomIndicatorSpec, type IndicatorChanges, type SymbolMatch, type Quote,
} from "@/lib/api";
import { PERIODS } from "@/lib/periods";
import type { PineInputMeta } from "@/lib/api/pine";
import { useChartLayout } from "@/lib/use-chart-layout";
import { useLiveQuote } from "@/lib/use-live-quote";
import { CandlestickChart, type LegendItem } from "@/components/CandlestickChart";
import type { ChartAdapter, ChartTypeId } from "@/lib/chart-adapter/types";
import { OrderTicket, type OrderPrefill } from "@/components/OrderTicket";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { ErrorState } from "@/components/ErrorState";
import { DrawingToolbar, type DrawTool } from "@/components/terminal/DrawingToolbar";
import { SignalPanel, type DisplaySignal } from "@/components/terminal/SignalPanel";
import { PositionsPanel } from "@/components/terminal/PositionsPanel";
import { Disclaimer } from "@/components/Disclaimer";
import { IndicatorPickerModal, type PickerEntry } from "@/components/terminal/IndicatorPickerModal";
import { IndicatorEditorModal } from "@/components/terminal/IndicatorEditorModal";
import { IndicatorSettingsModal, type IndicatorSettingsResult } from "@/components/terminal/IndicatorSettingsModal";
import { toAttachedIndicator } from "@/lib/indicators/catalog";
import type { AttachedIndicator } from "@/lib/api/charts";
import { TRADABLE_EXCHANGES, SIGNAL_EXCHANGES, REALTIME_EXCHANGES, CURRENCY, MAX_WATCHLIST_SIZE } from "@/lib/terminal-constants";
import { SymbolSearchModal } from "@/components/terminal/SymbolSearchModal";
import { IntervalPicker } from "@/components/terminal/IntervalPicker";
import { ChartTypePicker } from "@/components/terminal/ChartTypePicker";

type LiveQuoteState = ReturnType<typeof useLiveQuote>;
type SettingsTarget = { id: string; label: string; plotNames: string[]; inputsMeta: PineInputMeta[] } | null;

export interface DesktopTerminalLayoutProps {
  activeSymbol: string;
  activeExchange: string;
  quote: LiveQuoteState["quote"];
  connected: LiveQuoteState["connected"];
  ltp: number | null;
  change: number | null;
  changePct: number | null;
  isUp: boolean;
  bid: number | null;
  ask: number | null;
  spread: number | null;

  bars: ApiOhlcBar[];
  barsLoading: boolean;
  barsError: string;
  setBarsReload: Dispatch<SetStateAction<number>>;
  handleLoadMore: (oldestLoadedTime: number) => Promise<ApiOhlcBar[]>;
  /** Set only when the active symbol needs it (FOREX/metals) -- see
   *  CandlestickChart's own onPollVolume doc for why presence, not just
   *  behavior, matters here. */
  onPollVolume?: (bucketStartSec: number) => Promise<number | null>;

  chartRef: RefObject<ChartAdapter | null>;
  setChartReady: Dispatch<SetStateAction<number>>;
  activeTool: string;
  pickTool: (t: DrawTool) => void;
  clearMyDrawings: () => void;
  resetChart: () => void;
  layout: ReturnType<typeof useChartLayout>;

  indicators: AttachedIndicator[];
  setIndicators: Dispatch<SetStateAction<AttachedIndicator[]>>;
  indicatorPickerOpen: boolean;
  setIndicatorPickerOpen: Dispatch<SetStateAction<boolean>>;
  pickerEntries: PickerEntry[];
  setApiIndicators: Dispatch<SetStateAction<ApiIndicator[]>>;
  editorOpen: boolean;
  setEditorOpen: Dispatch<SetStateAction<boolean>>;
  editingIndicator: ApiIndicator | null;
  setEditingIndicator: Dispatch<SetStateAction<ApiIndicator | null>>;
  reattachIfLive: (id: string) => void;
  indicatorError: { spec: AttachedIndicator; message: string } | null;
  setIndicatorError: Dispatch<SetStateAction<{ spec: AttachedIndicator; message: string } | null>>;
  attachOne: (chart: ChartAdapter, spec: AttachedIndicator) => void;
  settingsTarget: SettingsTarget;
  setSettingsTarget: Dispatch<SetStateAction<SettingsTarget>>;
  handleSaveIndicatorSettings: (id: string, result: IndicatorSettingsResult) => void;
  legendItems: LegendItem[];
  handleDeleteIndicator: (id: string) => void;
  handleToggleIndicatorVisible: (id: string, visible: boolean) => void;
  volumeProfiles: Set<string>;
  setVolumeProfiles: Dispatch<SetStateAction<Set<string>>>;
  vsaOn: boolean;
  setVsaOn: Dispatch<SetStateAction<boolean>>;

  period: string;
  // A plain callback, not a raw Dispatch -- picking a period also resets
  // candleInterval to that period's baked-in default (see page.tsx's
  // pickPeriod), which a bare setState updater couldn't do.
  setPeriod: (label: string) => void;
  candleInterval: string;
  setCandleInterval: Dispatch<SetStateAction<string>>;
  chartType: ChartTypeId;
  setChartType: Dispatch<SetStateAction<ChartTypeId>>;

  rightTab: "chart" | "signal" | "trade" | "positions" | "chat";
  setRightTab: Dispatch<SetStateAction<"chart" | "signal" | "trade" | "positions" | "chat">>;

  watchlist: ApiWatchlistItem[];
  watchlistLoading: boolean;
  watchlistBusy: boolean;
  watchlistError: string;
  activeInWatchlist: boolean;
  watchlistFull: boolean;
  handleAddToWatchlist: () => Promise<void>;
  handleRemoveFromWatchlist: (symbol: string, exchange: string) => Promise<void>;
  suggestQuotes: Record<string, Quote>;

  asking: boolean;
  handleAskAI: () => Promise<void>;

  searchOpen: boolean;
  setSearchOpen: Dispatch<SetStateAction<boolean>>;
  searchQuery: string;
  setSearchQuery: Dispatch<SetStateAction<string>>;
  searchExchange: string;
  setSearchExchange: Dispatch<SetStateAction<string>>;
  resultFilter: string;
  setResultFilter: Dispatch<SetStateAction<string>>;
  symbolMatches: SymbolMatch[];
  searchingSymbols: boolean;
  filteredMatches: SymbolMatch[];
  q: string;
  highlightedIndex: number;
  setHighlightedIndex: Dispatch<SetStateAction<number>>;
  handleSearchKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  selectSymbol: (sym: string, exchange?: string) => void;

  displaySignal: DisplaySignal | null;
  signalError: string;
  signalLoading: boolean;
  askedEmpty: boolean;
  askError: string;

  prefill: OrderPrefill | null;
  setPrefill: Dispatch<SetStateAction<OrderPrefill | null>>;

  positions: ApiPosition[];
  positionsLoading: boolean;
  positionsError: string;
  setPositionsReload: Dispatch<SetStateAction<number>>;

  applyDrawings: (drawings: ChatDrawing[], turnId?: string) => void;
  removeTurnDrawings: (turnId: string) => void;
  applyIndicatorChanges: (changes: IndicatorChanges) => void;
  applyCustomIndicators: (specs: CustomIndicatorSpec[]) => void;
}

export function DesktopTerminalLayout(props: DesktopTerminalLayoutProps) {
  const {
    activeSymbol, activeExchange, quote, connected, ltp, change, changePct, isUp, bid, ask, spread,
    bars, barsLoading, barsError, setBarsReload, handleLoadMore, onPollVolume,
    chartRef, setChartReady, activeTool, pickTool, clearMyDrawings, resetChart, layout,
    indicators, setIndicators, indicatorPickerOpen, setIndicatorPickerOpen, pickerEntries, setApiIndicators,
    editorOpen, setEditorOpen, editingIndicator, setEditingIndicator, reattachIfLive,
    indicatorError, setIndicatorError, attachOne,
    settingsTarget, setSettingsTarget, handleSaveIndicatorSettings,
    legendItems, handleDeleteIndicator, handleToggleIndicatorVisible,
    volumeProfiles, setVolumeProfiles, vsaOn, setVsaOn,
    period, setPeriod,
    candleInterval, setCandleInterval,
    chartType, setChartType,
    rightTab, setRightTab,
    watchlist, watchlistLoading, watchlistBusy, watchlistError, activeInWatchlist, watchlistFull,
    handleAddToWatchlist, handleRemoveFromWatchlist, suggestQuotes,
    asking, handleAskAI,
    searchOpen, setSearchOpen, searchQuery, setSearchQuery, searchExchange, setSearchExchange,
    resultFilter, setResultFilter, symbolMatches, searchingSymbols, filteredMatches, q,
    highlightedIndex, setHighlightedIndex, handleSearchKeyDown, selectSymbol,
    displaySignal, signalError, signalLoading, askedEmpty, askError,
    prefill, setPrefill,
    positions, positionsLoading, positionsError, setPositionsReload,
    applyDrawings, removeTurnDrawings, applyIndicatorChanges, applyCustomIndicators,
  } = props;

  return (
    <div className="flex h-full flex-col -mx-4 sm:-mx-8">

      {/* ── Top toolbar ── */}
      <div className="flex items-center gap-3 px-3 py-2 border-b border-border shrink-0">
        {/* Search — a compact trigger button opening a modal, not an
            always-expanded input; freed up real toolbar width that the
            price/change/bid-ask group next to it needed. */}
        <button
          onClick={() => setSearchOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 text-xs font-semibold transition-colors shrink-0"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          Search
        </button>
        <SymbolSearchModal
          searchOpen={searchOpen} setSearchOpen={setSearchOpen}
          searchQuery={searchQuery} setSearchQuery={setSearchQuery}
          handleSearchKeyDown={handleSearchKeyDown}
          q={q} resultFilter={resultFilter} setResultFilter={setResultFilter}
          searchingSymbols={searchingSymbols} symbolMatches={symbolMatches} filteredMatches={filteredMatches}
          selectSymbol={selectSymbol} highlightedIndex={highlightedIndex} setHighlightedIndex={setHighlightedIndex}
          searchExchange={searchExchange} setSearchExchange={setSearchExchange}
          watchlist={watchlist} watchlistLoading={watchlistLoading} suggestQuotes={suggestQuotes}
          handleRemoveFromWatchlist={handleRemoveFromWatchlist}
        />

        {/* Symbol + price inline */}
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="font-bold text-sm">{activeSymbol}</span>
          <span className="text-[10px] text-muted-foreground font-mono">{activeExchange}</span>
          <IntervalPicker value={candleInterval} onChange={setCandleInterval} />
          <ChartTypePicker value={chartType} onChange={setChartType} />
          {ltp === null ? (
            <span className="font-mono text-sm text-muted-foreground ml-1" role="status">
              {connected ? "loading…" : "reconnecting…"}
            </span>
          ) : (
            <>
              <span className="font-mono text-lg font-bold ml-1">{CURRENCY[activeExchange] ?? "₹"}{ltp.toFixed(2)}</span>
              {change !== null && changePct !== null && (
                <span className="font-mono text-xs" style={{ color: isUp ? "var(--buy)" : "var(--sell)" }}>
                  {isUp ? "+" : "−"}{Math.abs(change).toFixed(2)} ({Math.abs(changePct).toFixed(2)}%)
                </span>
              )}
              {bid !== null && ask !== null && (
                <span className="font-mono text-[10px] text-muted-foreground" title={spread !== null ? `Spread ${spread.toFixed(2)}` : undefined}>
                  <span style={{ color: "var(--buy)" }}>B {bid.toFixed(2)}</span>
                  {" / "}
                  <span style={{ color: "var(--sell)" }}>A {ask.toFixed(2)}</span>
                </span>
              )}
            </>
          )}
          {!REALTIME_EXCHANGES.has(activeExchange) && (
            <span className="text-[10px] text-muted-foreground font-mono">{PRICE_DELAY_NOTE}</span>
          )}
        </div>

        <div className="flex-1" />

        {/* No icon, no count -- the on-chart legend and pane toolbars already
            show exactly what's attached; duplicating that count here was
            redundant. */}
        <button onClick={() => setIndicatorPickerOpen(true)}
          className="px-2.5 py-1.5 border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 text-xs font-semibold transition-colors">
          Indicators
        </button>

        <IndicatorPickerModal
          open={indicatorPickerOpen}
          onClose={() => setIndicatorPickerOpen(false)}
          entries={pickerEntries}
          attachedIds={new Set([...indicators.map((i) => i.id), ...volumeProfiles, ...(vsaOn ? ["vsa"] : [])])}
          onToggle={(entry) => {
            if (entry.kind === "volume-profile") {
              setVolumeProfiles((prev) => {
                const next = new Set(prev);
                if (next.has(entry.id)) next.delete(entry.id); else next.add(entry.id);
                return next;
              });
              return;
            }
            if (entry.kind === "vsa") {
              setVsaOn((on) => !on);
              return;
            }
            setIndicators((prev) =>
              prev.some((a) => a.id === entry.id)
                ? prev.filter((a) => a.id !== entry.id)
                : [...prev, toAttachedIndicator(entry)],
            );
          }}
          onCreateNew={() => { setEditingIndicator(null); setEditorOpen(true); setIndicatorPickerOpen(false); }}
          onEdit={(entry) => { setEditingIndicator(entry); setEditorOpen(true); setIndicatorPickerOpen(false); }}
          onDelete={(id) => {
            deleteIndicator(id).then(() => {
              setApiIndicators((prev) => prev.filter((i) => i.id !== id));
              setIndicators((prev) => prev.filter((a) => a.id !== id)); // detach if it was attached
            }).catch(() => {});
          }}
        />

        <IndicatorEditorModal
          open={editorOpen}
          onClose={() => setEditorOpen(false)}
          initial={editingIndicator}
          bars={bars}
          symbol={activeSymbol}
          exchange={activeExchange}
          onSaved={(saved) => {
            setApiIndicators((prev) => {
              const exists = prev.some((i) => i.id === saved.id);
              return exists ? prev.map((i) => (i.id === saved.id ? saved : i)) : [...prev, saved];
            });
            reattachIfLive(saved.id);
            // A freshly-created indicator isn't attached anywhere yet -- only
            // an edit to one already on the chart needs its entry refreshed
            // (new label/pane/source) so the diffing effect re-attaches it.
            setIndicators((prev) =>
              prev.some((a) => a.id === saved.id)
                ? prev.map((a) => (a.id === saved.id ? toAttachedIndicator(saved) : a))
                : prev,
            );
          }}
        />

        {settingsTarget && (
          <IndicatorSettingsModal
            open
            onClose={() => setSettingsTarget(null)}
            label={settingsTarget.label}
            inputsMeta={settingsTarget.inputsMeta}
            plotNames={settingsTarget.plotNames}
            initialParams={indicators.find((i) => i.id === settingsTarget.id)?.params ?? {}}
            initialStyle={indicators.find((i) => i.id === settingsTarget.id)?.style ?? {}}
            initialVisibility={indicators.find((i) => i.id === settingsTarget.id)?.visibility ?? {}}
            onSave={(result: IndicatorSettingsResult) => handleSaveIndicatorSettings(settingsTarget.id, result)}
          />
        )}

        <div className="w-px h-5 bg-border mx-1 hidden lg:block" />

        {/* Period selector */}
        <div className="hidden lg:flex items-center gap-0.5">
          {PERIODS.map((p) => (
            <button key={p.label} onClick={() => setPeriod(p.label)}
              className={`px-2 py-1 text-[11px] font-mono font-semibold transition-colors ${
                period === p.label ? "bg-primary/15 text-link" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}>
              {p.label}
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-border mx-1 hidden lg:block" />

        {!watchlistLoading && (
          activeInWatchlist ? (
            <button onClick={() => handleRemoveFromWatchlist(activeSymbol, activeExchange)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 border border-primary/40 bg-primary/10 text-link text-xs font-semibold hover:bg-primary/20 transition-colors">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
              <span className="hidden sm:inline">Watching</span>
            </button>
          ) : (
            <button onClick={handleAddToWatchlist} disabled={watchlistBusy || watchlistFull}
              title={watchlistFull ? `Watchlist limited to ${MAX_WATCHLIST_SIZE}` : undefined}
              className="flex items-center gap-1.5 px-2.5 py-1.5 border border-border text-muted-foreground text-xs font-semibold hover:border-primary/50 hover:text-link transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              <span className="hidden sm:inline">Watchlist</span>
            </button>
          )
        )}

        <button onClick={handleAskAI} disabled={asking || !SIGNAL_EXCHANGES.has(activeExchange)}
          title={SIGNAL_EXCHANGES.has(activeExchange) ? undefined : "On-demand analysis is available for NSE and BSE only right now"}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-primary text-primary-foreground text-sm font-bold hover:brightness-110 transition-all disabled:opacity-60 disabled:cursor-not-allowed">
          {asking ? (
            <><span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Analyzing…</>
          ) : (
            <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/></svg> Ask AI</>
          )}
        </button>
      </div>

      {watchlistError && (
        <div className="px-3 py-1 text-[11px] border-b border-border shrink-0" style={{ color: "var(--sell)" }}>{watchlistError}</div>
      )}

      {/* ── Body: tool rail + chart + right panel ── */}
      <div className="flex-1 flex min-h-0">

        <DrawingToolbar
          activeTool={activeTool}
          onPick={pickTool}
          onClear={clearMyDrawings}
          onReset={resetChart}
          saveConflict={layout.conflict}
        />

        {/* Chart */}
        <div className="flex-1 min-w-0 relative bg-card">
          {barsLoading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-7 h-7 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
            </div>
          ) : barsError ? (
            /* An outage must not render as "no data for this symbol" — that
               tells the user their symbol is wrong when the server is down. */
            <div className="absolute inset-0 flex items-center justify-center p-6">
              <ErrorState message={barsError} onRetry={() => setBarsReload(n => n + 1)} />
            </div>
          ) : bars.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--muted-foreground)" strokeWidth="1.5" className="mb-2 opacity-50"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
              <p className="text-sm text-muted-foreground">No chart data for {activeSymbol}</p>
              <p className="text-xs text-muted-foreground mt-1">Try another symbol, or check the exchange.</p>
            </div>
          ) : (
            <CandlestickChart fill bars={bars} signal={displaySignal} livePrice={quote?.ltp}
              chartType={chartType}
              onReady={(c) => { chartRef.current = c; setChartReady(n => n + 1); }}
              onLoadMore={handleLoadMore}
              onPollVolume={onPollVolume}
              legendItems={legendItems}
              onToggleVisible={handleToggleIndicatorVisible}
              onDelete={handleDeleteIndicator}
              onOpenSettings={(id) => {
                const indicator = indicators.find((i) => i.id === id);
                const chart = chartRef.current;
                if (indicator && chart) {
                  setSettingsTarget({
                    id, label: indicator.label,
                    plotNames: chart.getIndicatorPlotNames(id),
                    inputsMeta: chart.getIndicatorInputsMeta(id) ?? [],
                  });
                }
              }} />
          )}
          {indicatorError && (
            <div className="absolute top-3 right-3 z-20 max-w-xs">
              <ErrorState compact message={indicatorError.message}
                onRetry={() => {
                  const chart = chartRef.current;
                  const spec = indicatorError.spec;
                  setIndicatorError(null);
                  if (chart) attachOne(chart, spec);
                }} />
            </div>
          )}
        </div>

        {/* Right panel — tabbed */}
        <div className="w-85 shrink-0 border-l border-border flex flex-col">
          <div className="flex border-b border-border shrink-0">
            {([["signal", "Signal"], ["trade", "Trade"], ["positions", "Positions"], ["chat", "Chat"]] as const).map(([k, label]) => (
              <button key={k} onClick={() => setRightTab(k as typeof rightTab)}
                className={`flex-1 py-2.5 text-xs font-semibold border-b-2 -mb-px transition-colors ${rightTab === k ? "text-link border-primary" : "text-muted-foreground border-transparent hover:text-foreground"}`}>
                {label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar p-3">

            {/* ── Signal ── */}
            {rightTab === "signal" && (
              <SignalPanel
                symbol={activeSymbol}
                currency={CURRENCY[activeExchange] ?? "₹"}
                signal={displaySignal}
                asking={asking}
                askError={askError}
                loadError={signalError}
                loading={signalLoading}
                askedEmpty={askedEmpty}
                onDemandAvailable={SIGNAL_EXCHANGES.has(activeExchange)}
                onUseSignal={(side, price) => { setPrefill({ side, price }); setRightTab("trade"); }}
              />
            )}

            {/* ── Trade ──
                Always mounted, visibility toggled by class: a conditional
                render here unmounts OrderTicket on every tab switch away and
                back, discarding whatever quantity/price the user had typed. */}
            <div className={rightTab === "trade" ? "" : "hidden"}>
              {TRADABLE_EXCHANGES.has(activeExchange) ? (
                <OrderTicket symbol={activeSymbol} exchange={activeExchange} name={activeSymbol}
                  ltp={ltp} changePct={changePct} prefill={prefill} />
              ) : (
                // The account is rupee-denominated — an order here would debit
                // rupees for a dollar fill with no conversion. Said plainly
                // instead of letting the user hit the API's 400 blind.
                <div className="bg-card border border-border p-4 text-center">
                  <p className="text-sm font-semibold mb-1">Paper trading isn&apos;t available for {activeExchange} yet</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    The paper account is in rupees, and {activeSymbol} prices in{" "}
                    {CURRENCY[activeExchange] ?? "a different currency"}. NSE and BSE only, for now —
                    you can still chart {activeSymbol} and ask the AI about it.
                  </p>
                </div>
              )}
            </div>

            {/* ── Positions ── */}
            {rightTab === "positions" && (
              <PositionsPanel
                positions={positions}
                loading={positionsLoading}
                error={positionsError}
                onRetry={() => setPositionsReload(n => n + 1)}
                onSelect={selectSymbol}
              />
            )}

            {/* ── Chat (agent) ── */}
            {rightTab === "chat" && (
              <ChatPanel
                /* Keyed by symbol: a new symbol is a new conversation, and
                   remounting resets the messages, the progress feed and any
                   in-flight turn together. */
                key={activeSymbol}
                symbol={activeSymbol}
                exchange={activeExchange}
                onDrawings={applyDrawings}
                onRemoveDrawings={removeTurnDrawings}
                onIndicatorChanges={applyIndicatorChanges}
                onCustomIndicator={applyCustomIndicators}
                onUseTrade={({ side, price, turnId }) => {
                  // The turn id travels with the prefill, so the order records
                  // which analysis it came out of.
                  setPrefill({ side, price, decisionTurnId: turnId });
                  setRightTab("trade");
                }}
              />
            )}

            {/* The qualification belongs on the surface where trades are
                actually placed. It was imported here and never rendered, so the
                one page that can move the paper account carried nothing —
                while the Signals page, which cannot, carried it. */}
            {rightTab !== "chat" && (
              <Disclaimer variant="short" className="mt-4 pt-3 border-t border-border" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
