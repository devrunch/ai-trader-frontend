import { req } from "./client";

/** A market-moving alert from one of the signals service's odd-cadence
 *  pipelines -- see ai-trader-signals/app/market/drift_check.py and
 *  reddit_sentiment.py for how each is produced. Shared by every user
 *  (not per-user), same as the morning brief. */
export interface ApiAlert {
  _id: string;
  type: "drift" | "reddit_sentiment";
  title: string;
  body: string;
  symbols: string[];
  data: Record<string, unknown>;
  createdAt: string;
}

export const getAlerts = (limit = 30) =>
  req<ApiAlert[]>(`/api/alerts?limit=${limit}`);
