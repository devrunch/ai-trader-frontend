import { req } from "./client";

/* ── Market data ── */

/** US-listed prices come from a free, delayed feed. Say so wherever one is shown. */
export const PRICE_DELAY_NOTE = "Delayed ~15 min";

/** Real, per-headline stock/instrument impact from the signals-side LLM
 *  analysis (app/market/news.py's own _analyze_impacts) -- not a keyword
 *  match against a fixed ticker list. `direction` is the analysis' own
 *  call on which way this headline plausibly moves that symbol; `reason`
 *  is grounded in the headline text, never invented. */
/** This app's own real exchange set (market.controller.ts's EXCHANGES) plus
 *  CRYPTO (informational only -- no crypto trading/price integration exists
 *  anywhere in this app) and OTHER, the signals-side honest fallback for
 *  anything that doesn't fit rather than a forced wrong guess. */
export type NewsAssetClass = "NSE" | "BSE" | "NASDAQ" | "NYSE" | "FOREX" | "MCX" | "CRYPTO" | "OTHER";

export interface ApiNewsImpact {
  symbol: string;
  direction: "up" | "down";
  reason: string;
  assetClass: NewsAssetClass;
}

export interface ApiNewsItem {
  id: string;
  headline: string;
  description: string;
  source: string;
  url: string;
  publishedAt: string;
  sentiment: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
  /** False means the sentiment above is "we could not score it" (always
   *  NEUTRAL in that case), not "the model read it as neutral". */
  sentimentAvailable: boolean;
  /** Real per-symbol impact, or null when the whole batch couldn't be
   *  analyzed (no LLM configured, the call failed) -- never collapse that
   *  into an empty array, which means "analyzed, no real impact found". */
  impacts: ApiNewsImpact[] | null;
}

export interface ApiOhlcBar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  /** null means the bar's volume was never measured, which is not the same
   *  as no trading. Forex/metals volume is a Dukascopy tick count fetched
   *  only for the recent stretch worth paying for, so most of a long gold
   *  chart is legitimately unmeasured -- rendering that as 0 makes the older
   *  half look like a dead market. */
  volume: number | null;
}

export interface Quote {
  symbol: string;
  exchange: string;
  ltp: number;
  change: number;
  change_percent: number;
  /** Top-of-book bid/ask from the broker's market depth. Absent when the
   *  quote came from the yfinance fallback, or when a symbol has no live
   *  order book (pre-market, illiquid) -- never fabricated as 0. */
  bid?: number | null;
  ask?: number | null;
  spread?: number | null;
}

export const getMarketNews = (symbols?: string, limit = 15) => {
  const params = new URLSearchParams({ limit: String(limit) });
  if (symbols) params.set("symbols", symbols);
  return req<{ articles: ApiNewsItem[]; count: number }>(`/api/market/news?${params}`);
};

export const getQuote = (symbol: string, exchange = "NSE") =>
  req<Omit<Quote, "exchange">>(
    `/api/market/quote/${symbol}?exchange=${exchange}`
  );

export const getHistorical = (symbol: string, exchange = "NSE", interval = "15m", days = 30) =>
  req<{ bars: ApiOhlcBar[] }>(
    `/api/market/historical/${symbol}?exchange=${exchange}&interval=${interval}&days=${days}`
  );

/** Real ECN tick count since `sinceEpochSec` -- the still-forming candle's
 *  live volume, FOREX/metals only. `count: null` means this symbol isn't
 *  Dukascopy-covered or the vendor call failed; never a fabricated 0 (see
 *  the signals-side get_tick_volume's own docstring). */
export const getTickVolume = (symbol: string, sinceEpochSec: number) =>
  req<{ count: number | null }>(
    `/api/market/tick-volume/${symbol}?since=${sinceEpochSec}`
  );

export interface ApiTick {
  /** Unix milliseconds -- Dukascopy's own tick resolution, finer than this
   *  app's whole-second convention everywhere else. */
  t: number;
  /** Mid of Dukascopy's own bid/ask pair -- a tick here is a quote update,
   *  not a single-sided trade print. */
  p: number;
}

/** Real ECN ticks (mid price) for Volume Footprint/TPO, FOREX/metals only,
 *  bounded to a max 4h window (see the signals-side get_ticks' own
 *  MAX_TICKS_WINDOW_SECONDS). `ticks: null` means this symbol isn't
 *  Dukascopy-covered, the window was rejected, or the vendor call failed --
 *  never render that as "no trading happened," only as "couldn't check." */
export const getTicks = (symbol: string, sinceEpochSec: number, untilEpochSec: number) =>
  req<{ ticks: ApiTick[] | null }>(
    `/api/market/ticks/${symbol}?since=${sinceEpochSec}&until=${untilEpochSec}`
  );

export interface SymbolMatch {
  symbol: string;
  name: string;
  exchange: string;
}

/** Company name or symbol -> real matches, each already on an exchange this
 *  app can chart — no manual exchange guessing needed for a result you click. */
export const searchSymbols = (query: string) =>
  req<{ results: SymbolMatch[] }>(`/api/market/search?q=${encodeURIComponent(query)}`);
