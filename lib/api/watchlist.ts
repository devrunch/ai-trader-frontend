import { req } from "./client";

/* ── Watchlist ── */
export interface ApiWatchlistItem {
  _id: string;
  symbol: string;
  exchange: string;
}

export const getWatchlist = () => req<ApiWatchlistItem[]>("/api/watchlist");

export const addToWatchlist = (symbol: string, exchange = "NSE") =>
  req<ApiWatchlistItem>("/api/watchlist", {
    method: "POST",
    body: JSON.stringify({ symbol, exchange }),
  });

export const removeFromWatchlist = (symbol: string, exchange = "NSE") =>
  req<{ removed: boolean }>(`/api/watchlist/${symbol}?exchange=${exchange}`, {
    method: "DELETE",
  });
