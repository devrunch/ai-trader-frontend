"use client";

import { useState, useEffect, useRef, useCallback, type KeyboardEvent } from "react";
import {
  getHistorical,
  getQuote,
  getSignalsBySymbol,
  generateSignal,
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  getPaperPositions,
  searchSymbols,
  errorMessage,
  getIndicators,
  type ApiOhlcBar,
  type ApiSignal,
  type ApiGeneratedSignal,
  type ApiWatchlistItem,
  type ApiPosition,
  type ApiIndicator,
  type ChatDrawing,
  type CustomIndicatorSpec,
  type IndicatorChanges,
  type SymbolMatch,
  type Quote,
} from "@/lib/api";
import { PERIODS, withinVisibilityRange } from "@/lib/periods";
import type { PineInputMeta } from "@/lib/api/pine";
import { useChartLayout } from "@/lib/use-chart-layout";
import { useLiveQuote } from "@/lib/use-live-quote";
import { useIsMobile } from "@/lib/use-is-mobile";
import { DesktopTerminalLayout, type DesktopTerminalLayoutProps } from "./DesktopTerminalLayout";
import { useChartStateSync } from "@/lib/use-chart-state-sync";
import { useMarketStatus } from "@/lib/market-status";
import type { LegendItem } from "@/components/CandlestickChart";
import type { ChartAdapter } from "@/lib/chart-adapter/types";
import type { OrderPrefill } from "@/components/OrderTicket";
import type { DrawTool } from "@/components/terminal/DrawingToolbar";
import type { DisplaySignal } from "@/components/terminal/SignalPanel";
import type { PickerEntry } from "@/components/terminal/IndicatorPickerModal";
import type { IndicatorSettingsResult } from "@/components/terminal/IndicatorSettingsModal";
import { SPECIAL_INDICATORS, VOLUME_PROFILE_MODE_BY_ID, INDICATOR_NAME_BY_ID } from "@/lib/indicators/catalog";
import { VSA_LEGEND } from "@/lib/chart-adapter/vsa-colors";
import type { AttachedIndicator } from "@/lib/api/charts";
import { SIGNAL_EXCHANGES, MAX_WATCHLIST_SIZE } from "@/lib/terminal-constants";

/**
 * What a chart shows before anyone touches it, and what Reset returns it to:
 * candle + volume only, both native series under the LWC adapter -- no
 * attached indicator needed for either. Indicators attach via the picker
 * (IndicatorPickerModal, backed by the DB-stored library -- see
 * lib/api/indicators.ts), the chat agent (generate_custom_indicator), or
 * programmatically.
 */
const DEFAULT_INDICATORS: AttachedIndicator[] = [];

function fromApiSignal(s: ApiSignal): DisplaySignal {
  return {
    direction: s.direction, confidence: s.confidence,
    entryPrice: s.entryPrice, targetPrice: s.targetPrice, stopLoss: s.stopLoss,
    reasoning: s.reasoning, indicators: s.indicators,
    generatedAt: s.generatedAt ?? s.createdAt ?? null,
  };
}

function fromGenerated(s: ApiGeneratedSignal): DisplaySignal {
  return {
    direction: s.signal_type, confidence: s.confidence,
    entryPrice: s.entry_price, targetPrice: s.target_price, stopLoss: s.stop_loss,
    reasoning: s.reasoning, indicators: s.indicators,
    generatedAt: new Date().toISOString(),
  };
}


export default function TerminalPage() {
  // ?symbol=XYZ lets the Brief hand a candidate straight to the Terminal --
  // also the only thing a reload has to recover the user's own last pick
  // from, so selectSymbol() below keeps this in sync on every change.
  // Reading window.location during the initializer diverges from the server
  // render (window doesn't exist there, so it always renders "RELIANCE"/"NSE")
  // -- confirmed by hand as a real hydration-mismatch error whenever the URL
  // named any other symbol. Starting from the same fixed default on both
  // sides and correcting from the URL in an effect (client-only, runs after
  // hydration) is the standard fix; it costs one frame at the default symbol
  // before the real one takes over.
  const [activeSymbol, setActiveSymbol]     = useState("RELIANCE");
  const [activeExchange, setActiveExchange] = useState("NSE");
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const s = params.get("symbol");
    const e = params.get("exchange");
    // react-hooks/set-state-in-effect wants this expressed as either a
    // useMemo or a callback reacting to an external system's own change
    // event -- neither fits: window.location is only readable client-side
    // (see the hydration-mismatch comment above, a confirmed past bug), so
    // a useMemo here would re-diverge from the server render the same way
    // the old initializer did. This IS the React-documented pattern for
    // "seed state from something only available after mount" -- the rule
    // has no way to distinguish that from the sync-a-derived-value
    // antipattern it actually targets.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (s) setActiveSymbol(s.toUpperCase());
    if (e) setActiveExchange(e.toUpperCase());
  }, []);
  const [period, setPeriod]                 = useState("1D");
  const [bars, setBars]                     = useState<ApiOhlcBar[]>([]);
  const [barsLoading, setBarsLoading]       = useState(true);
  const [barsError, setBarsError]           = useState("");
  /** Bumped by the chart's retry button. */
  const [barsReload, setBarsReload]         = useState(0);
  const { quote, connected } = useLiveQuote(activeSymbol, activeExchange);
  const [suggestQuotes, setSuggestQuotes]   = useState<Record<string, Quote>>({});

  const [watchlist, setWatchlist]           = useState<ApiWatchlistItem[]>([]);
  const [watchlistLoading, setWatchlistLoading] = useState(true);
  const [watchlistBusy, setWatchlistBusy]   = useState(false);
  const [watchlistError, setWatchlistError] = useState("");

  const [displaySignal, setDisplaySignal] = useState<DisplaySignal | null>(null);
  const [signalLoading, setSignalLoading] = useState(true);
  const [signalError, setSignalError]     = useState("");
  const [positionsError, setPositionsError] = useState("");
  const [positionsReload, setPositionsReload] = useState(0);

  /* One shared market-status poll, from the dashboard layout. */
  const { phase: marketPhase } = useMarketStatus();
  const [asking, setAsking]               = useState(false);
  const [askedEmpty, setAskedEmpty]       = useState(false);
  const [askError, setAskError]           = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen]   = useState(false);
  /** Which exchange "Load anyway" jumps to when no live match covers it. */
  const [searchExchange, setSearchExchange] = useState<string>("NSE");
  /** Which exchange the results list is filtered to -- a different job from
   *  searchExchange above (that one only steers the raw-symbol fallback
   *  row), "ALL" shows every match across every exchange one search call
   *  already returned. */
  const [resultFilter, setResultFilter] = useState<string>("ALL");
  /** Keyboard-selected row index into the flat visible list (matches, or
   *  the fallback row, or the watchlist) -- -1 means nothing highlighted. */
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  /* Real symbol search — company name or ticker, across every exchange this
     app can chart, each result already carrying its own correct exchange so
     there is nothing left to guess. Debounced: this hits a live, unofficial,
     rate-limited vendor API on every call, and firing one per keystroke would
     make five requests for someone typing "apple". */
  const [symbolMatches, setSymbolMatches] = useState<SymbolMatch[]>([]);
  const [searchingSymbols, setSearchingSymbols] = useState(false);
  useEffect(() => {
    const q = searchQuery.trim();
    let alive = true;

    // Everything below runs inside the timer callback, never synchronously in
    // the effect body — including the "query cleared" branch. A direct
    // setState here would fire on every keystroke's render, not just once
    // debounce settles.
    const timer = setTimeout(() => {
      if (!alive) return;
      if (q.length < 1) { setSymbolMatches([]); setSearchingSymbols(false); return; }

      setSearchingSymbols(true);
      searchSymbols(q)
        .then(({ results }) => { if (alive) setSymbolMatches(results); })
        // A search miss is not an error the user needs to see — it just means
        // no live matches, and the manual-exchange fallback below still works.
        .catch(() => { if (alive) setSymbolMatches([]); })
        .finally(() => { if (alive) setSearchingSymbols(false); });
    }, q.length < 1 ? 0 : 300);

    return () => { alive = false; clearTimeout(timer); };
  }, [searchQuery]);

  // The highlighted row must not survive a change to what's actually being
  // shown -- a stale index from a longer list could point past the end of a
  // shorter one, or land on an unrelated row after the filter/query changes.
  // Adjusting state during render (not inside an effect) is the pattern
  // React itself recommends for this: comparing against the last-seen key
  // and resetting synchronously avoids the extra commit+effect round trip
  // a useEffect version of this would cost on every keystroke.
  const searchListKey = `${searchOpen}:${resultFilter}:${searchQuery}`;
  const [prevSearchListKey, setPrevSearchListKey] = useState(searchListKey);
  if (searchListKey !== prevSearchListKey) {
    setPrevSearchListKey(searchListKey);
    setHighlightedIndex(0);
  }

  const [prefill, setPrefill] = useState<OrderPrefill | null>(null);

  const chartRef = useRef<ChartAdapter | null>(null);
  const [activeTool, setActiveTool] = useState("cursor");
  /* Bumped when the chart instance is created. The saved layout is restored
     against a real chart — restoring into a null ref draws nothing, silently. */
  const [chartReady, setChartReady] = useState(0);

  const [indicators, setIndicators] = useState<AttachedIndicator[]>(DEFAULT_INDICATORS);
  const [indicatorPickerOpen, setIndicatorPickerOpen] = useState(false);

  /* The 49 built-ins plus this user's own custom indicators -- both live in
     the same DB-backed list now (see lib/api/indicators.ts), fetched once.
     Volume Profile/VSA aren't in it; they're not real Pine scripts and stay
     a small fixed list (SPECIAL_INDICATORS). */
  const [apiIndicators, setApiIndicators] = useState<ApiIndicator[]>([]);
  useEffect(() => {
    let alive = true;
    getIndicators().then((list) => { if (alive) setApiIndicators(list); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  const pickerEntries: PickerEntry[] = [
    ...apiIndicators.map((i): PickerEntry => ({ ...i, kind: "pine" })),
    ...SPECIAL_INDICATORS,
  ];

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingIndicator, setEditingIndicator] = useState<ApiIndicator | null>(null);
  /* setIndicators here only updates the app's own record of what SHOULD be
     attached (and is what gets saved/restored) -- it does not itself touch
     the chart. Actually attaching/removing is this effect's job, diffed
     against the adapter (there is no bulk "set these" call under the Pine
     model, unlike the old klinecharts name-list). */
  const attachedPineRef = useRef<Set<string>>(new Set());
  // The Pine sandbox can fail transiently (a subprocess race under load, a
  // timeout) with nothing else wrong -- attachPineIndicator used to return
  // the indicator's own id even on failure, so this was unreachable: the
  // indicator "attached" successfully and just never drew anything, with no
  // error anywhere. Found live when Supertrend silently failed to render.
  const [indicatorError, setIndicatorError] = useState<{ spec: AttachedIndicator; message: string } | null>(null);

  // Bumped after every successful attach, to re-run the effect below -- the
  // settings gear's visibility depends on chartRef.current.getIndicatorInputsMeta()/
  // getIndicatorPlotNames(), and nothing else would tell React a fresh
  // attach's data is ready once the async call resolves.
  const [metaVersion, setMetaVersion] = useState(0);
  const attachOne = useCallback((chart: ChartAdapter, spec: AttachedIndicator) => {
    attachedPineRef.current.add(spec.id);
    chart.attachPineIndicator(spec).then((id) => {
      if (id) { setMetaVersion((v) => v + 1); return; }
      // Allow a retry: this indicator isn't really attached, so the diffing
      // effect (or the retry button below) should be free to try it again.
      attachedPineRef.current.delete(spec.id);
      setIndicatorError({ spec, message: `"${spec.label}" couldn't load -- the chart engine may be busy.` });
    });
  }, []);

  // Reading chartRef.current during render is unsafe (nothing guarantees a
  // re-render when the ref's target data changes) -- this effect is the one
  // place that reads it, and legendItems below reads the resulting STATE
  // instead of calling the adapter directly.
  const [hasSettingsById, setHasSettingsById] = useState<Record<string, boolean>>({});
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const next: Record<string, boolean> = {};
    for (const i of indicators) {
      next[i.id] = (chart.getIndicatorInputsMeta(i.id)?.length ?? 0) > 0 || chart.getIndicatorPlotNames(i.id).length > 0;
    }
    setHasSettingsById(next);
  }, [indicators, chartReady, metaVersion]);

  /* Editing a custom indicator that's already on the chart: the diffing
     effect below only reacts to an id entering/leaving `indicators`, not to
     an existing id's own source changing, so a plain state update would
     leave the OLD compiled series showing. Removing it from both the chart
     and attachedPineRef first means the effect's next run treats the id as
     newly-wanted and genuinely re-attaches with the edited source.

     Declared before every caller below (handleSaveIndicatorSettings,
     applyIndicatorChanges, the IndicatorEditorModal onSaved handler) on
     purpose -- a forward reference to this useCallback from a function
     declared above it is fine at runtime (JS closures resolve by the time
     they're actually called), but broke React Compiler's ability to
     preserve this memoization statically (confirmed: moving this above its
     callers, with no other change, silenced the
     react-hooks/preserve-manual-memoization diagnostic). */
  const reattachIfLive = useCallback((id: string) => {
    const chart = chartRef.current;
    if (!chart || !attachedPineRef.current.has(id)) return;
    chart.removeIndicator(id);
    attachedPineRef.current.delete(id);
  }, []);

  const [settingsTarget, setSettingsTarget] = useState<{
    id: string; label: string; plotNames: string[]; inputsMeta: PineInputMeta[];
  } | null>(null);
  function handleSaveIndicatorSettings(id: string, result: IndicatorSettingsResult) {
    setIndicators((prev) => prev.map((i) => (i.id === id ? { ...i, ...result } : i)));
    // Always reattach: params changed needs a real sandbox re-run; style and
    // visibility don't, but reattach re-applies both anyway (attachPineIndicator
    // applies spec.style to the fresh series -- see lightweight-charts-adapter.ts),
    // and one extra sandbox call on an explicit Save click is not worth a
    // second code path to skip it.
    reattachIfLive(id);
  }

  // Pine indicators need to know which symbol/exchange they're running
  // against so the sandbox can resolve syminfo.*/timeframe.* for real --
  // must run before the attach effect below on the same commit (declared
  // first: React runs effects in declaration order, and a fresh chart
  // instance from a chartReady bump must have its symbol set before that
  // effect's first attachPineIndicator call reads it off the adapter).
  useEffect(() => {
    chartRef.current?.setActiveSymbol(activeSymbol, activeExchange);
  }, [activeSymbol, activeExchange, chartReady]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const attached = attachedPineRef.current;
    const wantedIds = new Set(indicators.map((i) => i.id));
    for (const id of [...attached]) {
      if (wantedIds.has(id)) continue;
      chart.removeIndicator(id);
      attached.delete(id);
    }
    for (const spec of indicators) {
      if (attached.has(spec.id)) continue;
      // Marked synchronously, before the attach call resolves: attachPineIndicator
      // awaits a network round-trip, so without this a second effect run racing
      // ahead of that promise (React StrictMode's double-invoke in dev, or a
      // rapid indicators-state change) would see `attached` not-yet-updated and
      // attach the same indicator a second time -- a real duplicate pane, caught
      // by hand when RSI showed up twice from a single toggle.
      attachOne(chart, spec);
    }
  }, [indicators, chartReady, attachOne]);

  // Volume Profile isn't a Pine script (no time axis of its own -- see
  // volume-profile-primitive.ts), so it doesn't go through the indicators
  // diffing effect above -- its own set of catalog ids (several modes, e.g.
  // Session alongside Visible Range, can be on at once) and its own diffing
  // effect, mirroring the Pine one's attach/remove shape.
  const [volumeProfiles, setVolumeProfiles] = useState<Set<string>>(new Set());
  const attachedVpRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const attached = attachedVpRef.current;
    for (const id of [...attached]) {
      if (volumeProfiles.has(id)) continue;
      chart.removeVolumeProfile(id);
      attached.delete(id);
    }
    for (const id of volumeProfiles) {
      if (attached.has(id)) continue;
      const mode = VOLUME_PROFILE_MODE_BY_ID[id];
      if (!mode) continue;
      attached.add(id);
      chart.attachVolumeProfile(id, mode);
    }
  }, [volumeProfiles, chartReady]);

  // Volume Spread Analysis recolors the existing volume histogram in place --
  // a single on/off switch, not an id-keyed attach/remove like everything
  // else (there's only one volume series to recolor).
  const [vsaOn, setVsaOn] = useState(false);
  useEffect(() => {
    chartRef.current?.setVolumeSpreadAnalysis(vsaOn);
  }, [vsaOn, chartReady]);

  // The on-chart legend's hide toggle. Not persisted through save/restore --
  // only attach/detach does that; hidden state resets to visible on reload,
  // a deliberate v1 gap rather than touching AttachedIndicator's save shape.
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const pCfg = PERIODS.find((p) => p.label === period) ?? PERIODS[0];
    for (const i of indicators) {
      chart.setIndicatorVisible(i.id, !hiddenIds.has(i.id) && withinVisibilityRange(pCfg.interval, i.visibility));
    }
    for (const id of volumeProfiles) {
      chart.setIndicatorVisible(id, !hiddenIds.has(id));
    }
  }, [hiddenIds, indicators, volumeProfiles, chartReady, period]);

  // Real-time report of what's on the chart, so the chat agent's
  // chart_indicators tools (list/set_indicator_params/edit_indicator_source/
  // remove_chart_indicator) see live data instead of nothing at all -- see
  // ai-trader-api's SignalsGateway and lib/use-chart-state-sync.ts.
  useChartStateSync(indicators, (PERIODS.find((p) => p.label === period) ?? PERIODS[0]).interval);

  const legendItems: LegendItem[] = [
    ...indicators.map((i): LegendItem => ({
      id: i.id, label: i.label, hidden: hiddenIds.has(i.id),
      // The gear covers Style/Visibility too, not just Inputs -- true
      // whenever the indicator has real input.*() metadata OR at least one
      // plotted line to style, which in practice is every
      // successfully-attached Pine indicator. Read from hasSettingsById
      // (state, set by the effect above), never chartRef.current directly
      // here -- this runs during render, where reading a ref's live value
      // is unsafe (nothing would guarantee a re-render when it changes).
      hasSettings: hasSettingsById[i.id] ?? false,
    })),
    ...[...volumeProfiles].map((id): LegendItem => ({ id, label: INDICATOR_NAME_BY_ID[id] ?? id, hidden: hiddenIds.has(id) })),
    // VSA is a single boolean toggle with no separate "attached but hidden"
    // state to distinguish -- only shown while on, and its hide/delete icons
    // both just turn it off (see handleToggleIndicatorVisible/handleDeleteIndicator).
    ...(vsaOn ? [{ id: "vsa", label: INDICATOR_NAME_BY_ID.vsa, hidden: false, colorKey: VSA_LEGEND }] : []),
  ];

  function handleDeleteIndicator(id: string) {
    if (id === "vsa") { setVsaOn(false); return; }
    setIndicators((prev) => prev.filter((a) => a.id !== id));
    setVolumeProfiles((prev) => { if (!prev.has(id)) return prev; const next = new Set(prev); next.delete(id); return next; });
    setHiddenIds((prev) => { if (!prev.has(id)) return prev; const next = new Set(prev); next.delete(id); return next; });
  }

  function handleToggleIndicatorVisible(id: string, visible: boolean) {
    if (id === "vsa") { if (!visible) setVsaOn(false); return; }
    setHiddenIds((prev) => {
      const next = new Set(prev);
      if (visible) next.delete(id); else next.add(id);
      return next;
    });
  }

  const [rightTab, setRightTab] = useState<"chart" | "signal" | "trade" | "positions" | "chat">("signal");
  const [positions, setPositions] = useState<ApiPosition[]>([]);
  /* Derived below from (rightTab, positionsLoaded) — holding it in state meant
     setting it synchronously inside an effect, which cascades a render. */
  const [positionsLoaded, setPositionsLoaded] = useState(false);

  const layout = useChartLayout({
    symbol: activeSymbol,
    exchange: activeExchange,
    chartRef,
    chartReady,
    indicators,
    onRestoreIndicators: setIndicators,
  });

  function pickTool(t: DrawTool) {
    setActiveTool(t.key);
    if (t.kind && chartRef.current) {
      try {
        chartRef.current.startManualDraw(t.kind, "draw", () => layout.scheduleSave());
      } catch (err) {
        // Known gap under the LWC adapter (see lightweight-charts-adapter.ts's
        // own comment): the drawing primitives render, but pointer-driven
        // interaction to actually place one isn't wired yet. Fails loud in
        // the console, not to the user as a crashed page.
        console.warn(`Manual "${t.kind}" drawing is not yet available:`, err);
        setActiveTool("cursor");
      }
    }
  }
  /** Only what the user drew themselves. The agent's marks are theirs to keep. */
  function clearMyDrawings() {
    chartRef.current?.removeDrawingsByGroup("draw");
    setActiveTool("cursor");
    layout.scheduleSave();
  }

  /**
   * Back to a plain chart.
   *
   * Needed because chart state became durable: before it was saved, a reload
   * was the reset. Now the agent's lines, the user's lines and whatever
   * indicators got switched on all persist, and there was no way back to an
   * empty chart at all.
   */
  function resetChart() {
    const chart = chartRef.current;
    chart?.removeDrawingsByGroup("draw");
    // Every per-turn group, plus the legacy shared one from before turn ids.
    chart?.removeDrawingsWhere((groupId) => groupId.startsWith("ai"));
    setIndicators(DEFAULT_INDICATORS);
    setVolumeProfiles(new Set());
    setHiddenIds(new Set());
    setVsaOn(false);
    setActiveTool("cursor");
    // Clearing has to reach the server too, or the next reload brings it back.
    layout.clear();
  }

  /** Take back exactly what one answer added, leaving the rest alone. */
  function removeTurnDrawings(turnId: string) {
    chartRef.current?.removeDrawingsByGroup(`ai:${turnId}`);
    layout.scheduleSave();
  }

  /**
   * Put the agent's drawings on the chart.
   *
   * Grouped per TURN (`ai:<turnId>`), not under one shared "ai" group. The
   * chart accumulates marks across a conversation, and without a per-answer
   * group the only available undo is "delete everything the AI ever drew" —
   * which is why the chat legend can now remove just its own.
   */
  function applyDrawings(drawings: ChatDrawing[], turnId?: string) {
    const groupId = turnId ? `ai:${turnId}` : "ai";
    chartRef.current?.addDrawings(drawings, groupId);
    // What the agent drew is part of the chart the user is looking at, so it is
    // kept with everything else — an explanation that vanishes on reload
    // explains nothing the next morning.
    if (drawings.length) layout.scheduleSave();
  }

  /**
   * The agent changed settings/source on, or removed, indicators already
   * on the chart -- set_indicator_params/edit_indicator_source/
   * remove_chart_indicator (chart_indicators.py). Reactive only: this only
   * ever arrives from a turn the user themself started (see chat_state
   * threading in useChartStateSync below for how the agent even knows
   * what's attached to change in the first place).
   *
   * Applies through exactly the same mechanism the settings gear itself
   * uses: merge the change into `indicators` state, then reattachIfLive so
   * the diffing effect picks up the new params/source on its next pass.
   */
  function applyIndicatorChanges(changes: IndicatorChanges) {
    const removedIds = new Set(changes.remove ?? []);
    setIndicators((prev) => {
      let next = prev;
      if (removedIds.size > 0) {
        next = next.filter((i) => !removedIds.has(i.id));
      }
      for (const { id, params } of changes.update ?? []) {
        next = next.map((i) => (i.id === id ? { ...i, params } : i));
      }
      for (const { id, source } of changes.edit_source ?? []) {
        next = next.map((i) => (i.id === id ? { ...i, source } : i));
      }
      return next;
    });
    for (const { id } of changes.update ?? []) reattachIfLive(id);
    for (const { id } of changes.edit_source ?? []) reattachIfLive(id);
  }

  /* The agent can author brand-new Pine indicators at runtime -- unlike
     applyChartIndicators above (a stale, built-in-catalog-only tool), these
     have no catalog to be in at all under the Pine model; each is attached
     individually by its own source.

     CustomIndicatorSpec (id/source/label/pane: "main"|"sub") is a strict
     subset of AttachedIndicator's own shape -- previously kept in its own
     parallel state (customIndicatorSpecs) with its own dedicated attach
     effect duplicating what the indicators-diffing effect below already
     does. That meant an agent-authored indicator was invisible to the
     settings gear, the save/restore layout (useChartLayout only ever read
     `indicators` -- an agent-made indicator silently vanished on reload),
     and (once built) the agent's own set_indicator_params/style/visibility
     tools. Folding straight into `indicators` fixes all of that at once:
     one list, one attach effect, one settings gear, one save path. */
  function applyCustomIndicators(specs: CustomIndicatorSpec[]) {
    setIndicators((prev) => {
      const byId = new Map(prev.map((i) => [i.id, i] as const));
      for (const spec of specs) byId.set(spec.id, { ...byId.get(spec.id), ...spec });
      return Array.from(byId.values());
    });
  }

  /* Watchlist — fetched on mount, drives the search suggestions.
     Every setState sits in a promise callback: a synchronous one inside an
     effect triggers a cascading render (react-hooks/set-state-in-effect). */
  useEffect(() => {
    getWatchlist()
      .then(wl => { setWatchlist(wl); setWatchlistError(""); })
      .catch(e => setWatchlistError(errorMessage(e, "Couldn't load your watchlist.")))
      .finally(() => setWatchlistLoading(false));
  }, []);

  /* Suggestion quotes for whatever's currently on the watchlist */
  useEffect(() => {
    Promise.allSettled(watchlist.map(w => getQuote(w.symbol, w.exchange)))
      .then(results => {
        const map: Record<string, Quote> = {};
        results.forEach((r, i) => {
          if (r.status === "fulfilled") map[watchlist[i].symbol] = { ...r.value, exchange: watchlist[i].exchange };
        });
        setSuggestQuotes(map);
      });
  }, [watchlist]);

  /* Historical bars */
  // How far back the chart has actually fetched — starts at the selected
  // period's own window and grows as the user pans further back than that
  // (see handleLoadMore). Reset whenever the base fetch below re-runs, so a
  // symbol/period/exchange change doesn't inherit a previous pan's widening.
  const loadedDaysRef = useRef(PERIODS[0].days);
  useEffect(() => {
    const pCfg = PERIODS.find(p => p.label === period) ?? PERIODS[0];
    loadedDaysRef.current = pCfg.days;
    getHistorical(activeSymbol, activeExchange, pCfg.interval, pCfg.days)
      .then(({ bars: b }) => { setBars(b); setBarsError(""); })
      .catch(e => { setBars([]); setBarsError(errorMessage(e, "Couldn't load the chart.")); })
      .finally(() => setBarsLoading(false));
  }, [activeSymbol, activeExchange, period, barsReload]);

  /* Bars older than what's currently loaded, for panning back past the
     chart's own edge. Re-fetches the same interval over a wider window
     (doubled each time, capped at "All"'s span) rather than true cursor
     pagination — the historical endpoint only takes a day-count from now,
     not a "before this timestamp" cursor. */
  const handleLoadMore = useCallback((oldestTimestampMs: number): Promise<ApiOhlcBar[]> => {
    const pCfg = PERIODS.find(p => p.label === period) ?? PERIODS[0];
    const nextDays = Math.min(loadedDaysRef.current * 2, 3650);
    if (nextDays <= loadedDaysRef.current) return Promise.resolve([]);
    loadedDaysRef.current = nextDays;
    return getHistorical(activeSymbol, activeExchange, pCfg.interval, nextDays)
      .then(({ bars: b }) => b.filter(bar => bar.time * 1000 < oldestTimestampMs))
      .catch(() => []);
  }, [activeSymbol, activeExchange, period]);

  /* Existing stored signal (background, doesn't force a fresh LLM call) */
  useEffect(() => {
    getSignalsBySymbol(activeSymbol)
      .then(sigs => {
        setDisplaySignal(sigs[0] ? fromApiSignal(sigs[0]) : null);
        setSignalError("");
      })
      .catch(e => { setDisplaySignal(null); setSignalError(errorMessage(e, "Couldn't check for an existing signal.")); })
      .finally(() => setSignalLoading(false));
  }, [activeSymbol]);

  /* Load running positions when that tab is open */
  useEffect(() => {
    if (rightTab !== "positions") return;
    getPaperPositions()
      .then(p => { setPositions(p); setPositionsError(""); })
      // Swallowing this rendered an outage as "No open positions" — telling the
      // user they hold nothing when we simply could not find out.
      .catch(e => { setPositions([]); setPositionsError(errorMessage(e, "Couldn't load your positions.")); })
      .finally(() => setPositionsLoaded(true));
  }, [rightTab, positionsReload]);

  // Only spins on the first visit; after that the previous positions stay on
  // screen while the refetch runs, which is less jarring than a flash of skeleton.
  const positionsLoading = rightTab === "positions" && !positionsLoaded;

  async function handleAskAI() {
    // The button is disabled for these exchanges too — this guards a
    // fast-second-click or any other path that reaches the handler directly.
    if (!SIGNAL_EXCHANGES.has(activeExchange)) return;
    setAsking(true);
    setAskError("");
    setAskedEmpty(false);
    try {
      const res = await generateSignal(activeSymbol, activeExchange);
      if (res.signal) {
        setDisplaySignal(fromGenerated(res.signal));
      } else {
        setDisplaySignal(null);
        setAskedEmpty(true);
      }
    } catch (err) {
      setAskError(err instanceof Error ? err.message : "Analysis failed — try again");
    } finally {
      setAsking(false);
    }
  }

  function selectSymbol(sym: string, exchange = "NSE") {
    const symbol = sym.toUpperCase();
    const exch = exchange.toUpperCase();
    setActiveSymbol(symbol);
    setActiveExchange(exch);
    setSearchQuery("");
    setSearchOpen(false);
    // Keeps the URL in sync so a reload restores this pick instead of
    // silently falling back to the RELIANCE/NSE default above.
    const url = new URL(window.location.href);
    url.searchParams.set("symbol", symbol);
    url.searchParams.set("exchange", exch);
    window.history.replaceState(null, "", url);
  }

  async function handleAddToWatchlist() {
    setWatchlistBusy(true);
    setWatchlistError("");
    try {
      const item = await addToWatchlist(activeSymbol, activeExchange);
      setWatchlist(wl => [...wl, item]);
    } catch (err) {
      setWatchlistError(err instanceof Error ? err.message : "Couldn't add to watchlist");
    } finally {
      setWatchlistBusy(false);
    }
  }

  async function handleRemoveFromWatchlist(symbol: string, exchange: string) {
    try {
      await removeFromWatchlist(symbol, exchange);
      setWatchlist(wl => wl.filter(w => !(w.symbol === symbol && w.exchange === exchange)));
    } catch (err) {
      setWatchlistError(err instanceof Error ? err.message : "Couldn't remove from watchlist");
    }
  }

  /* Null, never 0. A failed quote used to render as "₹0.00" in green, and that
     0 was handed to the order ticket as the market price — the ticket's own
     prop is documented "never render a fabricated 0", and this defeated it. */
  const ltp       = quote?.ltp ?? null;
  const change    = quote?.change ?? null;
  const changePct = quote?.change_percent ?? null;
  const isUp      = (change ?? 0) >= 0;
  // Absent (not 0) off-hours, on the yfinance fallback, or for an illiquid
  // symbol with no live order book -- same "never fabricate a number" rule as ltp above.
  const bid = quote?.bid ?? null;
  const ask = quote?.ask ?? null;
  const spread = quote?.spread ?? null;

  const q = searchQuery.trim().toUpperCase();
  const activeInWatchlist = watchlist.some(w => w.symbol === activeSymbol && w.exchange === activeExchange);
  const watchlistFull = watchlist.length >= MAX_WATCHLIST_SIZE;

  // Search modal's own derived view -- not state itself, just a projection
  // over searchQuery/symbolMatches/resultFilter/watchlist, recomputed each
  // render so keyboard nav (below) and the JSX render from one shared list.
  const filteredMatches = resultFilter === "ALL" ? symbolMatches : symbolMatches.filter(m => m.exchange === resultFilter);
  type SearchListItem =
    | { kind: "match"; match: SymbolMatch }
    | { kind: "fallback" }
    | { kind: "watchlist"; item: ApiWatchlistItem };
  const visibleItems: SearchListItem[] = q
    ? [...filteredMatches.map((match): SearchListItem => ({ kind: "match", match })), { kind: "fallback" }]
    : watchlist.map((item): SearchListItem => ({ kind: "watchlist", item }));

  function runSearchItem(item: SearchListItem) {
    if (item.kind === "match") selectSymbol(item.match.symbol, item.match.exchange);
    else if (item.kind === "fallback") selectSymbol(q, searchExchange);
    else selectSymbol(item.item.symbol, item.item.exchange);
  }

  function handleSearchKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") { setSearchOpen(false); return; }
    if (visibleItems.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex(i => Math.min(i + 1, visibleItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      runSearchItem(visibleItems[highlightedIndex] ?? visibleItems[0]);
    }
  }

  const isMobile = useIsMobile();

  // A mobile session should open on the chart, not desktop's side-panel
  // default -- but only the first time this resolves true, and only if the
  // user hasn't already touched the tab (still sitting at the untouched
  // "signal" default). Adjusting state during render (not inside an effect)
  // is the same pattern this file already uses for highlightedIndex above
  // (see searchListKey/prevSearchListKey) -- mobileDefaultApplied guards it
  // from firing more than once, so crossing the breakpoint later doesn't
  // yank the user off a tab they deliberately picked.
  const [mobileDefaultApplied, setMobileDefaultApplied] = useState(false);
  if (isMobile && !mobileDefaultApplied && rightTab === "signal") {
    setMobileDefaultApplied(true);
    setRightTab("chart");
  }

  if (isMobile === null) return null;

  const sharedProps: DesktopTerminalLayoutProps = {
    activeSymbol, activeExchange, quote, connected, ltp, change, changePct, isUp, bid, ask, spread,
    bars, barsLoading, barsError, setBarsReload, handleLoadMore,
    chartRef, setChartReady, activeTool, pickTool, clearMyDrawings, resetChart, layout,
    indicators, setIndicators, indicatorPickerOpen, setIndicatorPickerOpen, pickerEntries, setApiIndicators,
    editorOpen, setEditorOpen, editingIndicator, setEditingIndicator, reattachIfLive,
    indicatorError, setIndicatorError, attachOne,
    settingsTarget, setSettingsTarget, handleSaveIndicatorSettings,
    legendItems, handleDeleteIndicator, handleToggleIndicatorVisible,
    volumeProfiles, setVolumeProfiles, vsaOn, setVsaOn,
    period, setPeriod,
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
  };

  // MobileTerminalLayout doesn't exist yet -- a mobile session renders
  // nothing until that lands, rather than shipping a build error.
  return isMobile ? null : <DesktopTerminalLayout {...sharedProps} />;
}
