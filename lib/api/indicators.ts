import { req } from "./client";

export type IndicatorPane = "main" | "sub" | "volume";

/** One Pine indicator -- a default (ownerId: null, shared, read-only to
 *  everyone) or a user's own custom one (ownerId: their own id, fully
 *  theirs to edit/delete). Both live in the same list; the picker doesn't
 *  need to know which is which beyond that. */
export interface ApiIndicator {
  id: string;
  ownerId: string | null;
  name: string;
  category: string;
  pane: IndicatorPane;
  source: string;
}

export interface IndicatorInput {
  name: string;
  category: string;
  pane: IndicatorPane;
  source: string;
}

export const getIndicators = () => req<ApiIndicator[]>("/api/indicators");

export const createIndicator = (input: IndicatorInput) =>
  req<ApiIndicator>("/api/indicators", { method: "POST", body: JSON.stringify(input) });

export const updateIndicator = (id: string, input: IndicatorInput) =>
  req<ApiIndicator>(`/api/indicators/${id}`, { method: "PUT", body: JSON.stringify(input) });

export const deleteIndicator = (id: string) =>
  req<{ removed: boolean }>(`/api/indicators/${id}`, { method: "DELETE" });
