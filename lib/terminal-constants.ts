/** Exchanges the search box can jump to directly. */
export const SEARCH_EXCHANGES = ["NASDAQ", "NYSE", "FOREX", "NSE", "BSE", "MCX"] as const;

/** What the terminal opens on before the user picks anything. */
export const DEFAULT_SYMBOL = "AAPL";
export const DEFAULT_EXCHANGE = "NASDAQ";

/**
 * Exchanges the paper account can actually trade on.
 *
 * The account is denominated in rupees — an order in a dollar-priced symbol
 * would debit rupees for a dollar fill with no conversion. Matches the API's
 * own `TradableExchange` allowlist; kept here too so the Trade tab can explain
 * itself instead of the user finding out from a 400.
 *
 * MCX deliberately NOT included yet: futures have a genuinely different P&L
 * model (margin, lot size, mark-to-market, no simple quantity × price sizing)
 * that the equity-shaped paper account doesn't represent. Chart/search/live
 * data cover MCX now; paper trading it is a real, separate decision.
 */
export const TRADABLE_EXCHANGES = new Set(["NSE", "BSE"]);

/**
 * Exchanges with a real live tick feed -- Kite WebSocket for NSE/BSE/MCX,
 * Deriv WebSocket for FOREX (see deriv_ticker.py; forex/metals moved off
 * the delayed Twelve Data poll onto this). Everything else (NASDAQ, NYSE,
 * …) rides the yfinance poll instead, and that price is genuinely stale —
 * the delay disclosure only belongs on those.
 */
export const REALTIME_EXCHANGES = new Set(["NSE", "BSE", "MCX", "FOREX"]);

export const CURRENCY: Record<string, string> = { NSE: "₹", BSE: "₹", NASDAQ: "$", NYSE: "$", MCX: "₹", FOREX: "$" };

export const MAX_WATCHLIST_SIZE = 15;
