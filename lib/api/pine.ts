import { req } from "./client";

export interface PineRunResult {
  ok: boolean;
  plots: Record<string, number[]> | null;
  error: string | null;
}

export const runPineIndicator = (source: string, bars: { time: number; open: number; high: number; low: number; close: number; volume: number }[]) =>
  req<PineRunResult>("/api/pine/run", { method: "POST", body: JSON.stringify({ source, bars, mode: "indicator" }) });
