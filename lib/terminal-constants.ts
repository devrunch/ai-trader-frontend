/** Exchanges the search box can jump to directly. */
export const SEARCH_EXCHANGES = ["NSE", "BSE", "NASDAQ", "NYSE", "MCX", "FOREX"] as const;

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
 * Exchanges on-demand signal generation covers.
 *
 * Same two exchanges as TRADABLE_EXCHANGES today, but a separate constant on
 * purpose — this one mirrors the API's own SIGNAL_EXCHANGES (signals.controller.ts),
 * a different restriction for a different reason (its cost/risk model is
 * India-specific, not a currency-mismatch issue). If trading and signal
 * coverage ever diverge, sharing one set here would silently gate the wrong
 * feature.
 *
 * MCX deliberately NOT included yet, same reasoning as TRADABLE_EXCHANGES
 * above — AI-generated buy/sell signals for commodities need their own risk
 * model, not silently inherited from the equity one.
 */
export const SIGNAL_EXCHANGES = new Set(["NSE", "BSE"]);

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
