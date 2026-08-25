"use client";

import type { DesktopTerminalLayoutProps } from "./DesktopTerminalLayout";
import { MobileBottomTabBar } from "@/components/terminal/mobile/MobileBottomTabBar";
import { MobileChartToolbar } from "@/components/terminal/mobile/MobileChartToolbar";
import { CandlestickChart } from "@/components/CandlestickChart";
import { ErrorState } from "@/components/ErrorState";
import { OrderTicket } from "@/components/OrderTicket";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { SignalPanel } from "@/components/terminal/SignalPanel";
import { PositionsPanel } from "@/components/terminal/PositionsPanel";
import { Disclaimer } from "@/components/Disclaimer";
import { IndicatorPickerModal } from "@/components/terminal/IndicatorPickerModal";
import { IndicatorEditorModal } from "@/components/terminal/IndicatorEditorModal";
import { IndicatorSettingsModal } from "@/components/terminal/IndicatorSettingsModal";
import { SymbolSearchModal } from "@/components/terminal/SymbolSearchModal";
import { toAttachedIndicator } from "@/lib/indicators/catalog";
import { deleteIndicator } from "@/lib/api";
import { TRADABLE_EXCHANGES, SIGNAL_EXCHANGES, CURRENCY } from "@/lib/terminal-constants";

/** Mobile's own chrome around the same chart/panels DesktopTerminalLayout
 *  uses -- the Chart destination stays mounted (CSS-hidden, not unmounted)
 *  when another bottom tab is active, same "always mounted" reasoning
 *  OrderTicket already relies on, so pan/zoom/in-progress drawings survive
 *  a trip to Chat and back. Signal/Trade/Positions/Chat keep whatever mount
 *  policy they already have in DesktopTerminalLayout -- this file does not
 *  invent a new one per component. */
export function MobileTerminalLayout(props: DesktopTerminalLayoutProps) {
  const {
    activeSymbol, activeExchange, quote, ltp, changePct,
    bars, barsLoading, barsError, setBarsReload, handleLoadMore,
    chartRef, setChartReady, activeTool, pickTool,
    indicators, setIndicators, indicatorPickerOpen, setIndicatorPickerOpen, pickerEntries, setApiIndicators,
    editorOpen, setEditorOpen, editingIndicator, setEditingIndicator, reattachIfLive,
    indicatorError, setIndicatorError, attachOne,
    settingsTarget, setSettingsTarget, handleSaveIndicatorSettings,
    legendItems, handleDeleteIndicator, handleToggleIndicatorVisible,
    period, setPeriod,
    candleInterval, setCandleInterval,
    chartType, setChartType,
    rightTab, setRightTab,
    displaySignal, signalError, signalLoading, askedEmpty, askError, asking, handleAskAI,
    prefill, setPrefill,
    positions, positionsLoading, positionsError, setPositionsReload, selectSymbol,
    applyDrawings, removeTurnDrawings, applyIndicatorChanges, applyCustomIndicators,
    volumeProfiles, setVolumeProfiles, vsaOn, setVsaOn,
    searchOpen, setSearchOpen, searchQuery, setSearchQuery, handleSearchKeyDown,
    q, resultFilter, setResultFilter, searchingSymbols, symbolMatches, filteredMatches,
    highlightedIndex, setHighlightedIndex, searchExchange, setSearchExchange,
    watchlist, watchlistLoading, suggestQuotes, handleRemoveFromWatchlist,
  } = props;

  return (
    <div className="h-full flex flex-col -mx-4 sm:-mx-8">
      {/* Chart destination -- always mounted, CSS-hidden when another tab
          is active (see this file's own top comment for why). */}
      <div className={rightTab === "chart" ? "flex-1 flex flex-col min-h-0" : "hidden"}>
        <MobileChartToolbar
          symbol={activeSymbol} exchange={activeExchange}
          currency={CURRENCY[activeExchange] ?? "₹"}
          ltp={ltp}
          onOpenSearch={() => setSearchOpen(true)}
          activeTool={activeTool} onPickTool={pickTool}
          period={period} onPickPeriod={setPeriod}
          candleInterval={candleInterval} onPickInterval={setCandleInterval}
          chartType={chartType} onPickChartType={setChartType}
          onOpenIndicators={() => setIndicatorPickerOpen(true)}
        />
        <div className="flex-1 min-w-0 relative bg-card">
          {barsLoading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-7 h-7 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
            </div>
          ) : barsError ? (
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
      </div>

      {/* Signal / Trade / Positions / Chat -- full-screen destinations,
          each keeping its own mount policy from DesktopTerminalLayout. */}
      {rightTab !== "chart" && (
        <div className="flex-1 min-h-0 overflow-y-auto p-3">
          {rightTab === "signal" && (
            <>
            <button onClick={handleAskAI} disabled={asking || !SIGNAL_EXCHANGES.has(activeExchange)}
              title={SIGNAL_EXCHANGES.has(activeExchange) ? undefined : "On-demand analysis is available for NSE and BSE only right now"}
              className="w-full mb-3 flex items-center justify-center gap-1.5 px-3.5 py-2 bg-primary text-primary-foreground text-sm font-bold hover:brightness-110 transition-all disabled:opacity-60 disabled:cursor-not-allowed">
              {asking ? (
                <><span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Analyzing…</>
              ) : (
                <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/></svg> Ask AI</>
              )}
            </button>
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
            </>
          )}

          <div className={rightTab === "trade" ? "" : "hidden"}>
            {TRADABLE_EXCHANGES.has(activeExchange) ? (
              <OrderTicket symbol={activeSymbol} exchange={activeExchange} name={activeSymbol}
                ltp={ltp} changePct={changePct} prefill={prefill} />
            ) : (
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

          {rightTab === "positions" && (
            <PositionsPanel
              positions={positions}
              loading={positionsLoading}
              error={positionsError}
              onRetry={() => setPositionsReload(n => n + 1)}
              onSelect={selectSymbol}
            />
          )}

          {rightTab === "chat" && (
            <ChatPanel
              key={activeSymbol}
              symbol={activeSymbol}
              exchange={activeExchange}
              onDrawings={applyDrawings}
              onRemoveDrawings={removeTurnDrawings}
              onIndicatorChanges={applyIndicatorChanges}
              onCustomIndicator={applyCustomIndicators}
              onUseTrade={({ side, price, turnId }) => {
                setPrefill({ side, price, decisionTurnId: turnId });
                setRightTab("trade");
              }}
            />
          )}

          {rightTab !== "chat" && (
            <Disclaimer variant="short" className="mt-4 pt-3 border-t border-border" />
          )}
        </div>
      )}

      <MobileBottomTabBar active={rightTab} onChange={setRightTab} />

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
            setIndicators((prev) => prev.filter((a) => a.id !== id));
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
          onSave={(result) => handleSaveIndicatorSettings(settingsTarget.id, result)}
        />
      )}
    </div>
  );
}
