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

export const getMarketStatus = () =>
  req<ApiMarketStatus>("/api/market/status");

export const getMarketNews = (symbols?: string, limit = 15) => {
  const params = new URLSearchParams({ limit: String(limit) });
  if (symbols) params.set("symbols", symbols);
  return req<{ articles: ApiNewsItem[]; count: number }>(`/api/market/news?${params}`);
};

export const getQuote = (symbol: string, exchange = "NSE") =>
  req<{ ltp: number; change: number; change_percent: number; symbol: string }>(
    `/api/market/quote/${symbol}?exchange=${exchange}`
  );

export const getHistorical = (symbol: string, exchange = "NSE", interval = "15m", days = 30) =>
  req<{ bars: ApiOhlcBar[] }>(
    `/api/market/historical/${symbol}?exchange=${exchange}&interval=${interval}&days=${days}`
  );
