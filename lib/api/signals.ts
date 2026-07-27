import { req } from "./client";

/* ── Signals ── */
export interface ApiSignal {
  _id: string;
  symbol: string;
  exchange: string;
  direction: "BUY" | "SELL" | "HOLD";
  entryPrice: number;
  targetPrice: number;
  stopLoss: number;
  confidence: number;       // 0-1
  reasoning: string;
  indicators: Record<string, number>;
  generatedAt: string;
  createdAt: string;
}

export const getSignals = (limit = 50) =>
  req<ApiSignal[]>(`/api/signals?limit=${limit}`);

export const getSignalsBySymbol = (symbol: string) =>
  req<ApiSignal[]>(`/api/signals/${symbol}`);


/* ── Signal performance (historical backtest of stored signals) ── */
export interface EvaluatedSignal extends ApiSignal {
  outcome: "TARGET_HIT" | "STOP_HIT" | "OPEN" | "NO_DATA";
  exitPrice: number | null;
  pnlPct: number;
}
export interface PerformanceBucket {
  key: string; trades: number; winRate: number; avgPnlPct: number;
}
/**
 * Below this many resolved trades a bucket's win rate is noise, not a finding.
 * A single lucky trade reads as "100%", which looks like evidence and is not.
 */
export const MIN_BUCKET_SAMPLE = 20;

export interface SignalPerformance {
  signals: EvaluatedSignal[];
  summary: {
    total: number; resolved: number; wins: number; losses: number;
    open: number; noData: number; winRate: number; avgPnlPct: number;
    /**
     * The bar this system must clear to make money, computed from its own
     * realised win/loss ratio. NOT 50% — a system whose average win is 3x its
     * average loss breaks even at 25%, so colouring against 50% would render a
     * profitable result as failure. Null when there are no losses to divide by.
     */
    breakevenWinRate?: number | null;
    /** Expected P&L per trade. The number that actually decides profitability. */
    expectancyPct?: number;
    /** 95% CI on expectancy. Null below two resolved trades. */
    expectancyCi95?: { low: number; high: number } | null;
    /** True when the CI spans zero — we cannot yet tell which way this goes. */
    inconclusive?: boolean;
    /** Resolved trades behind the statistics. */
    sampleSize?: number;
    avgWinPct?: number;
    avgLossPct?: number;
    winLossRatio?: number | null;
  };
  byConfidence: PerformanceBucket[];
  bySymbol: PerformanceBucket[];
}
export const getSignalPerformance = (limit = 40) =>
  req<SignalPerformance>(`/api/signals/performance?limit=${limit}`);

/** Raw shape returned by the FastAPI on-demand generator (snake_case, not the stored Mongo shape). */
export interface ApiGeneratedSignal {
  symbol: string;
  exchange: string;
  signal_type: "BUY" | "SELL" | "HOLD";
  confidence: number;
  entry_price: number;
  target_price: number;
  stop_loss: number;
  reasoning: string;
  indicators: Record<string, number>;
}

/** Triggers signal generation right now instead of waiting for the 15-min screener. */
export const generateSignal = (symbol: string, exchange = "NSE") =>
  req<{ signal: ApiGeneratedSignal | null; message?: string }>(
    `/api/signals/generate/${symbol}?exchange=${exchange}`,
    { method: "POST" }
  );
