import { req } from "./client";

/* ── Market overview ──
 *
 * Was "morning brief" everywhere. The name is deliberately generic now: the
 * signals service generates this twice a day (pre-open and pre-US-open), so
 * "morning" was already wrong for half of them, and the useful content is a
 * market read rather than anything diary-shaped.
 *
 * The API route and Mongo collection are still named `brief` on the backend
 * -- renaming those is a migration, not a label change, and nothing about
 * the wire format differs.
 */

export interface MarketCue {
  symbol: string;
  name: string;
  /** us | asia | commodity | currency | volatility | india */
  group: string;
  /** Curated one-liner on why this cue matters -- real editorial text from
   *  the signals service's own CUES table, not model output. */
  why: string;
  value: number;
  change_pct: number;
  as_of: string;
}

export interface MarketRead {
  bias: "positive" | "negative" | "neutral";
  label: string;
  confidence: string;
  notes: string[];
  us_avg_pct: number | null;
  asia_avg_pct: number | null;
}

export interface MarketOverview {
  date: string;
  generatedAt: string;
  marketRead: MarketRead;
  globalCues: MarketCue[];
  narrative: string;
  disclaimer: string;
}

/** 404s when none has been generated yet -- callers should treat that as
 *  "no overview yet", not as an error worth a banner. */
export const getMarketOverview = () => req<MarketOverview>("/api/brief");
