import { req } from "./client";

/** A market-moving alert from one of the signals service's odd-cadence
 *  pipelines -- see ai-trader-signals/app/market/drift_check.py and
 *  reddit_sentiment.py for how each is produced. Shared by every user
 *  (not per-user), same as the market overview. */
export interface ApiAlert {
  _id: string;
  type: "drift" | "reddit_sentiment";
  title: string;
  body: string;
  symbols: string[];
  data: Record<string, unknown>;
  createdAt: string;
}

/** One cue that moved past threshold, from a `drift` alert's own payload.
 *  `why` is the curated editorial line on what the cue reads across to. */
export interface DriftMover {
  symbol: string;
  name: string;
  why: string;
  pct: number;
  value: number;
}

/** One topic's crowd read, from a `reddit_sentiment` alert's payload. */
export interface SentimentTopic {
  topic: string;
  sentiment: "bullish" | "bearish" | "mixed";
  reason: string;
}

/* `data` crosses the wire as opaque JSON written by the Python pipelines,
 * so it is narrowed here rather than trusted -- a shape change upstream
 * should render one alert without its detail, never crash the page. */

export function driftMovers(alert: ApiAlert): DriftMover[] {
  const moved = alert.data?.moved;
  if (!Array.isArray(moved)) return [];
  return moved.filter((m): m is DriftMover =>
    !!m && typeof m === "object"
    && typeof (m as DriftMover).symbol === "string"
    && typeof (m as DriftMover).pct === "number");
}

export function sentimentTopics(alert: ApiAlert): SentimentTopic[] {
  const topics = alert.data?.topics;
  if (!Array.isArray(topics)) return [];
  return topics.filter((t): t is SentimentTopic =>
    !!t && typeof t === "object"
    && typeof (t as SentimentTopic).topic === "string"
    && ["bullish", "bearish", "mixed"].includes((t as SentimentTopic).sentiment));
}

export const getAlerts = (limit = 30) =>
  req<ApiAlert[]>(`/api/alerts?limit=${limit}`);
