"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
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
  PRICE_DELAY_NOTE,
  getIndicators,
  deleteIndicator,
  type ApiOhlcBar,
  type ApiSignal,
  type ApiGeneratedSignal,
  type ApiWatchlistItem,
  type ApiPosition,
  type ApiIndicator,
  type ChatDrawing,
  type CustomIndicatorSpec,
  type SymbolMatch,
  type Quote,
} from "@/lib/api";
import { PERIODS } from "@/lib/periods";
import { useChartLayout } from "@/lib/use-chart-layout";
import { useLiveQuote } from "@/lib/use-live-quote";
import { useMarketStatus } from "@/lib/market-status";
import { CandlestickChart, type LegendItem } from "@/components/CandlestickChart";
import type { ChartAdapter } from "@/lib/chart-adapter/types";
import { OrderTicket, type OrderPrefill } from "@/components/OrderTicket";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { ErrorState } from "@/components/ErrorState";
import { DrawingToolbar, type DrawTool } from "@/components/terminal/DrawingToolbar";
import { SignalPanel, type DisplaySignal } from "@/components/terminal/SignalPanel";
import { PositionsPanel } from "@/components/terminal/PositionsPanel";
import { Disclaimer } from "@/components/Disclaimer";
import { IndicatorPickerModal, type PickerEntry } from "@/components/terminal/IndicatorPickerModal";
import { IndicatorEditorModal } from "@/components/terminal/IndicatorEditorModal";
import { toAttachedIndicator, SPECIAL_INDICATORS, VOLUME_PROFILE_MODE_BY_ID, INDICATOR_NAME_BY_ID } from "@/lib/indicators/catalog";
import { VSA_LEGEND } from "@/lib/chart-adapter/vsa-colors";
import type { AttachedIndicator } from "@/lib/api/charts";

const MAX_WATCHLIST_SIZE = 15;

/**
 * What a chart shows before anyone touches it, and what Reset returns it to:
 * candle + volume only, both native series under the LWC adapter -- no
 * attached indicator needed for either. Indicators attach via the picker
 * (IndicatorPickerModal, backed by the DB-stored library -- see
 * lib/api/indicators.ts), the chat agent (generate_custom_indicator), or
 * programmatically.
 */
const DEFAULT_INDICATORS: AttachedIndicator[] = [];

/** Exchanges the search box can jump to directly. */
const SEARCH_EXCHANGES = ["NSE", "BSE", "NASDAQ", "NYSE"] as const;

/**
 * Exchanges the paper account can actually trade on.
 *
 * The account is denominated in rupees — an order in a dollar-priced symbol
 * would debit rupees for a dollar fill with no conversion. Matches the API's
 * own `TradableExchange` allowlist; kept here too so the Trade tab can explain
 * itself instead of the user finding out from a 400.
 */
const TRADABLE_EXCHANGES = new Set(["NSE", "BSE"]);

/**
 * Exchanges on-demand signal generation covers.
 *
 * Same two exchanges as TRADABLE_EXCHANGES today, but a separate constant on
 * purpose — this one mirrors the API's own SIGNAL_EXCHANGES (signals.controller.ts),
 * a different restriction for a different reason (its cost/risk model is
 * India-specific, not a currency-mismatch issue). If trading and signal
 * coverage ever diverge, sharing one set here would silently gate the wrong
 * feature.
 */
const SIGNAL_EXCHANGES = new Set(["NSE", "BSE"]);

/**
 * Exchanges fed by the real-time Kite WebSocket. Everything else (NASDAQ,
 * NYSE, …) rides the yfinance poll instead, and that price is genuinely
 * stale — the delay disclosure only belongs on those.
 */
const REALTIME_EXCHANGES = new Set(["NSE", "BSE"]);

const CURRENCY: Record<string, string> = { NSE: "₹", BSE: "₹", NASDAQ: "$", NYSE: "$" };

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
    if (s) setActiveSymbol(s.toUpperCase());
    if (e) setActiveExchange(e.toUpperCase());
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const attachOne = useCallback((chart: ChartAdapter, spec: AttachedIndicator) => {
    attachedPineRef.current.add(spec.id);
    chart.attachPineIndicator(spec).then((id) => {
      if (id) return;
      // Allow a retry: this indicator isn't really attached, so the diffing
      // effect (or the retry button below) should be free to try it again.
      attachedPineRef.current.delete(spec.id);
      setIndicatorError({ spec, message: `"${spec.label}" couldn't load -- the chart engine may be busy.` });
    });
  }, []);

  /* Editing a custom indicator that's already on the chart: the diffing
     effect below only reacts to an id entering/leaving `indicators`, not to
     an existing id's own source changing, so a plain state update would
     leave the OLD compiled series showing. Removing it from both the chart
     and attachedPineRef first means the effect's next run treats the id as
     newly-wanted and genuinely re-attaches with the edited source. */
  const reattachIfLive = useCallback((id: string) => {
    const chart = chartRef.current;
    if (!chart || !attachedPineRef.current.has(id)) return;
    chart.removeIndicator(id);
    attachedPineRef.current.delete(id);
  }, []);

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
    for (const id of [...indicators.map((i) => i.id), ...volumeProfiles]) {
      chart.setIndicatorVisible(id, !hiddenIds.has(id));
    }
  }, [hiddenIds, indicators, volumeProfiles, chartReady]);

  const legendItems: LegendItem[] = [
    ...indicators.map((i): LegendItem => ({ id: i.id, label: i.label, hidden: hiddenIds.has(i.id) })),
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

  const [rightTab, setRightTab] = useState<"signal" | "trade" | "positions" | "chat">("signal");
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
   * The agent's `chart_indicators` tool result -- add/remove BUILT-IN
   * catalog names (e.g. "EMA"). Same root problem as the removed
   * IndicatorSearchModal: this tool contract (ai-trader-signals'
   * add_chart_indicator) is built around the retired klinecharts/diascript
   * catalog and has no Pine equivalent yet. Task 9 rewrites
   * generate_custom_indicator (the agent's Pine-AUTHORING tool) but not
   * this one -- a separate, unscoped follow-up: either retire this tool
   * server-side in favor of generate_custom_indicator entirely, or give it
   * a real Pine-source-producing replacement. Left a documented no-op
   * rather than fabricating fake AttachedIndicator objects from bare
   * catalog names, which would silently "succeed" while attaching nothing
   * real.
   */
  function applyChartIndicators(_change: { add?: string[]; remove?: string[] }) {
    // Intentionally does nothing -- see comment above.
  }

  /* The agent can author brand-new Pine indicators at runtime — unlike
     applyChartIndicators above (a stale, built-in-catalog-only tool), these
     have no catalog to be in at all under the Pine model; each is attached
     individually by its own source.

     The specs themselves live in state, not just a ref: CandlestickChart's
     chart-init effect disposes and recreates the chart instance on an
     ordinary symbol/exchange/period switch or a data retry (its effect
     depends on `bars`), which wipes every indicator off the new instance.
     Built-in indicators survive that because they live in `indicators` state
     and get re-applied by an effect keyed on chartReady; a ref-only "already
     attached" bookkeeping would survive the same rebuild with stale state
     pointing at a chart that's gone, permanently losing the indicator. */
  const [customIndicatorSpecs, setCustomIndicatorSpecs] = useState<CustomIndicatorSpec[]>([]);
  function applyCustomIndicators(specs: CustomIndicatorSpec[]) {
    setCustomIndicatorSpecs(prev => {
      const byId = new Map(prev.map(s => [s.id, s] as const));
      for (const spec of specs) byId.set(spec.id, spec);
      return Array.from(byId.values());
    });
  }

  /* Registers + attaches every known custom indicator against whichever chart
     instance currently exists. Keyed on chartReady (bumped in onReady below,
     on every fresh `init(el)`) as well as the specs, so a chart rebuild
     re-attaches everything instead of leaving the new instance blank.

     `attached` tracks name -> id per CHART INSTANCE (reset whenever the
     instance changes, same shape as CandlestickChart's own appliedRef) so a
     later spec arriving on the SAME chart doesn't recreate a pane that's
     already there — createIndicator has no "already attached" check of its
     own, it hands back a fresh id on every call. The id is checked for
     truthiness before being counted as attached, matching CandlestickChart's
     own pattern, and each spec gets its own try/catch — one malformed
     formula must not stop the rest of the batch from rendering. */
  const attachedRef = useRef<{ chart: ChartAdapter | null; ids: Map<string, string> }>({ chart: null, ids: new Map() });
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || customIndicatorSpecs.length === 0) return;
    if (attachedRef.current.chart !== chart) attachedRef.current = { chart, ids: new Map() };
    const attached = attachedRef.current.ids;
    let cancelled = false;

    (async () => {
      for (const spec of customIndicatorSpecs) {
        if (attached.has(spec.id)) continue;
        try {
          const id = await chart.attachPineIndicator(spec);
          if (cancelled) return;
          if (id) {
            attached.set(spec.id, id);
          } else {
            console.warn(`Custom indicator "${spec.label}" did not attach to the chart`);
          }
        } catch (err) {
          console.error(`Failed to render custom indicator "${spec.label}"`, err);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [customIndicatorSpecs, chartReady]);

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


  return (
    <>
      {/* Below ~1024px the three-pane layout collapses and the chart column
          computes to roughly zero width — the user got a broken screen with no
          explanation. Saying so is a fine answer; a silently unusable chart is
          not. The rest of the product (signals, brief, portfolio) is fully
          usable on a phone, so send them there rather than to a dead end. */}
      <div className="lg:hidden h-full flex items-center justify-center px-6 text-center">
        <div className="max-w-xs">
          <h1 className="font-heading text-lg font-semibold mb-2">The terminal needs a wider screen</h1>
          <p className="text-muted-foreground text-sm mb-5">
            Charting, drawing and the AI panel need at least a small laptop
            (1024px). Everything else works here.
          </p>
          <div className="flex flex-col gap-2">
            <Link href="/dashboard/signals" className="px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground">
              Go to Signals
            </Link>
            <Link href="/dashboard/brief" className="px-4 py-2 text-sm font-semibold border border-border text-muted-foreground hover:text-foreground transition-colors">
              Read the Morning Brief
            </Link>
          </div>
        </div>
      </div>

    <div className="hidden lg:flex h-full flex-col -mx-4 sm:-mx-8">

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
        {searchOpen && (
          <div
            role="dialog" aria-modal="true" aria-label="Search symbols"
            className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm p-4 pt-[8vh]"
            onClick={() => setSearchOpen(false)}
          >
            <div
              className="bg-card border border-border w-full max-w-md max-h-[70vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted-foreground)" strokeWidth="2" className="shrink-0"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input
                  autoFocus
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search symbol…"
                  aria-label="Search symbol"
                  className="flex-1 min-w-0 text-sm text-foreground placeholder-muted-foreground focus:outline-none bg-transparent"
                />
                <button onClick={() => setSearchOpen(false)} aria-label="Close" className="text-muted-foreground hover:text-foreground shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                </button>
              </div>
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
                  {symbolMatches.map((m) => (
                    <button
                      key={`${m.symbol}-${m.exchange}`}
                      onClick={() => selectSymbol(m.symbol, m.exchange)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-secondary transition-colors"
                    >
                      <span className="text-sm font-bold shrink-0">{m.symbol}</span>
                      <span className="text-xs text-muted-foreground truncate min-w-0">{m.name}</span>
                      <span className="ml-auto text-[10px] text-muted-foreground font-mono shrink-0">{m.exchange}</span>
                    </button>
                  ))}

                  {/* Fallback, always available: the live search is a scraped
                      vendor endpoint and will occasionally miss something real
                      — never block the user behind it finding a match. */}
                  <div className={symbolMatches.length > 0 || searchingSymbols ? "border-t border-border" : ""}>
                    <button onClick={() => selectSymbol(q, searchExchange)}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-primary/10 transition-colors">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                      <span className="text-sm font-bold">{q}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {symbolMatches.length > 0 ? "— not listed above? try" : "on"} {searchExchange}
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
                  ) : watchlist.map(w => {
                    const sq = suggestQuotes[w.symbol];
                    return (
                      <div key={`${w.symbol}-${w.exchange}`} className="w-full flex items-center justify-between px-3 py-2 hover:bg-secondary transition-colors group">
                        <button onClick={() => selectSymbol(w.symbol, w.exchange)} className="flex-1 text-left">
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
            </div>
          </div>
        )}

        {/* Symbol + price inline */}
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="font-bold text-sm">{activeSymbol}</span>
          <span className="text-[10px] text-muted-foreground font-mono">{activeExchange}</span>
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
              onReady={(c) => { chartRef.current = c; setChartReady(n => n + 1); }}
              onLoadMore={handleLoadMore}
              legendItems={legendItems}
              onToggleVisible={handleToggleIndicatorVisible}
              onDelete={handleDeleteIndicator} />
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
                onIndicators={applyChartIndicators}
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
    </>
  );
}
