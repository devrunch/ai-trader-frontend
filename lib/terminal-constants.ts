/** Exchanges the search box can jump to directly. */
export const SEARCH_EXCHANGES = ["NASDAQ", "NYSE", "FOREX", "NSE", "BSE", "MCX", "NFO"] as const;

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
 * MCX and NFO deliberately NOT included: derivatives have a genuinely
 * different P&L model (margin, lot size, mark-to-market, no simple quantity ×
 * price sizing) that the equity-shaped paper account doesn't represent. One
 * Nifty futures lot is 65 index points of exposure, so an order placed as a
 * quantity would be wrong by that factor and still look plausible.
 * Chart/search/live data cover both now; paper trading them is a real,
 * separate decision.
 */
export const TRADABLE_EXCHANGES = new Set(["NSE", "BSE"]);

/**
 * Exchanges with a real live tick feed -- Kite WebSocket for NSE/BSE/MCX/NFO,
 * Deriv WebSocket for FOREX (see deriv_ticker.py; forex/metals moved off
 * the delayed Twelve Data poll onto this). Everything else (NASDAQ, NYSE,
 * …) rides the yfinance poll instead, and that price is genuinely stale —
 * the delay disclosure only belongs on those.
 */
export const REALTIME_EXCHANGES = new Set(["NSE", "BSE", "MCX", "FOREX", "NFO"]);

// Missing entries fall back to "a different currency" in the Trade tab's own
// copy, which was wrong for NFO: it prices in rupees like the rest of NSE, and
// the reason paper trading is unavailable there is lot size, not currency.
export const CURRENCY: Record<string, string> = { NSE: "₹", BSE: "₹", NASDAQ: "$", NYSE: "$", MCX: "₹", FOREX: "$", NFO: "₹" };

export const MAX_WATCHLIST_SIZE = 15;
