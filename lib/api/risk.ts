import { req } from "./client";

/* ── Risk limits ── */
/**
 * Where the account stands against the position, aggregate-risk and daily-loss
 * caps. The API has enforced these since the risk-limits work; nothing showed
 * them, so a user only discovered a limit by having an order rejected.
 */
export interface RiskState {
  accountValue: number;
  openPositions: number;
  maxConcurrentPositions: number;
  openRisk: number;
  openRiskPct: number;
  maxAggregateRiskPct: number;
  sessionRealisedPnl: number;
  sessionRealisedPnlPct: number;
  maxDailyLossPct: number;
  sessionStart: string;
  positionsWithoutStop: number;
  openRiskIsUnbounded: boolean;
  blocked: boolean;
  blockedReason: string | null;
}

export const getRiskState = (exchange = "NSE") =>
  req<RiskState>(`/api/paper/risk?exchange=${exchange}`);

