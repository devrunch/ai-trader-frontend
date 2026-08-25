import { req } from "./client";

/* ── Market data ── */
export interface ApiIndex {
  name: string;
  ltp: number;
  change: number;
  change_percent: number;
}

/**
 * Mirrors `GET /market/status` in ai-trader-signals/app/market/router.py.
 *
 * Every field below `timestamp` was already on the wire and was being dropped by
 * this declaration, so the frontend could not tell a trading holiday from a
 * weekend, or a failed quote leg from a genuinely flat market.
 */
export interface ApiMarketStatus {
  nse_open: boolean;
  timestamp: string;
  nifty50: { ltp: number | null; change_percent: number | null };
  sensex:  { ltp: number | null; change_percent: number | null };
  /** Weekday that is not a holiday — true even outside 09:15–15:30. */
  is_trading_day?: boolean;
  is_holiday?: boolean;
  /** The end-of-session forced-flatten window. */
  is_square_off?: boolean;
  /** ISO timestamp of the next open, when the market is shut. */
  next_open?: string | null;
  /** False when the holiday calendar could not be consulted — treat dates as unconfirmed. */
  holiday_calendar_known?: boolean;
  /** Set by the signals service when a data source failed. The last good value
   *  is being shown, and must not be presented as current. */
  degraded?: boolean;
}

/** What the market is doing right now, as one value the UI can switch on. */
export type MarketPhase = "OPEN" | "SQUARE_OFF" | "HOLIDAY" | "CLOSED";

export function marketPhase(m: ApiMarketStatus | null): MarketPhase | null {
  if (!m) return null;
  if (m.is_square_off) return "SQUARE_OFF";
  if (m.nse_open) return "OPEN";
  if (m.is_holiday) return "HOLIDAY";
  return "CLOSED";
}

/** Prices come from a free, unofficial feed. Say so wherever one is shown. */
export const PRICE_DELAY_NOTE = "Delayed ~15 min";

export interface ApiNewsItem {
  id: string;
  headline: string;
  description: string;
  source: string;
  url: string;
  publishedAt: string;
  sentiment: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
  sentimentScore: number;
  symbols: string[];
}

export interface ApiOhlcBar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
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

export const getMarketStatus = () =>
  req<ApiMarketStatus>("/api/market/status");

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
