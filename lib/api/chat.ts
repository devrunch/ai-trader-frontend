import { req } from "./client";

/* ── AI chat agent ── */
export interface ChatDrawing {
  kind: "segment" | "priceline" | "fibonacci" | "trade_marker" | "series";
  points?: { timestamp: number; value: number }[];
  value?: number;
  timestamp?: number;
  color?: string;
  label?: string;
  side?: "BUY" | "SELL";
}
export interface ChatStrategyResult {
  strategy: string;
  num_trades: number;
  win_rate: number;
  total_return_pct: number;
  trades: { entry_price: number; exit_price: number; pnl_pct: number }[];
  error?: string;
}
export interface ChatSimulationResult {
  side: string;
  entry: number; target: number; stop: number; quantity: number;
  profit_at_target: number; loss_at_stop: number; reward_risk: number; capital_required: number;
}
export interface CustomIndicatorSpec {
  id: string;
  source: string;
  label: string;
  /** Which pane this renders in — the writer LLM decides this (it already
   * knows "Gaussian filter" overlays price and "RSI-style" doesn't), since
   * the chart needs an explicit pane to overlay on price vs. get its own. */
  pane: "main" | "sub";
}
/** One already-attached indicator's params changed, keyed by varId --
 *  set_indicator_params (chart_indicators.py). Applied the same way the
 *  settings gear's own Inputs tab applies a change: merge into the
 *  matching AttachedIndicator's params, then reattach. */
export interface IndicatorParamsChange {
  id: string;
  params: Record<string, unknown>;
}
/** One already-attached indicator's ENTIRE Pine source was replaced --
 *  edit_indicator_source (chart_indicators.py). Validated against the real
 *  sandbox server-side before this ever arrives. */
export interface IndicatorSourceEdit {
  id: string;
  source: string;
}
/** What the agent changed about indicators already on the chart this turn
 *  -- distinct from custom_indicators below, which is brand-new ones.
 *  Reactive only: this never arrives unless the user asked for it in this
 *  same turn. */
export interface IndicatorChanges {
  update?: IndicatorParamsChange[];
  edit_source?: IndicatorSourceEdit[];
  remove?: string[];
}
export interface ChatResults {
  strategy?: ChatStrategyResult;
  simulation?: ChatSimulationResult;
  /** Agent authored one or more custom Pine indicators */
  custom_indicators?: CustomIndicatorSpec[];
  /** Agent changed settings/source on, or removed, indicators already on the chart */
  indicator_changes?: IndicatorChanges;
}
export interface ChatResponse {
  message: string;
  drawings: ChatDrawing[];
  results: ChatResults;
}
export interface ChatHistoryItem { role: "user" | "assistant"; content: string }

export const chatWithAI = (symbol: string, exchange: string, message: string, history: ChatHistoryItem[]) =>
  req<ChatResponse>("/api/signals/chat", {
    method: "POST",
    body: JSON.stringify({ symbol, exchange, message, history }),
  });

/* ── Agent memory: what the agent did, kept ── */

/** One step the agent took, as recorded during the turn. */
export interface AgentEvent {
  kind: string;
  at_ms: number | null;
  /** A sentence written server-side — never a raw tool name. */
  label: string;
  tool?: string | null;
  detail?: Record<string, unknown>;
}

export interface ChatTurnRecord {
  turnId: string;
  sessionId: string;
  symbol: string;
  exchange: string;
  /** What the user asked. */
  message: string;
  /** What the agent answered. */
  answer: string;
  events: AgentEvent[];
  usage?: Record<string, number>;
  stopReason?: string;
  createdAt: string;
}

export interface ChatSessionSummary {
  sessionId: string;
  symbol: string;
  exchange: string;
  turns: number;
  startedAt: string;
  lastTurnAt: string;
  /** The opening question — what the conversation is recognisably about. */
  title: string;
}

/** One backtested trade, as the backtest computed it off real bars. */
export interface StrategyTrade {
  /** Epoch milliseconds. */
  entry_ts: number;
  entry_price: number;
  exit_ts?: number | null;
  exit_price?: number | null;
  /** Why the position closed: "signal", "stop", or "end". */
  exit_reason?: string;
  /** Net of round-trip costs. */
  pnl_pct: number;
}

export interface StrategyRunDetail {
  /** Preset name, for `backtest_strategy`. */
  strategy?: string;
  /** User-described name, for `build_strategy`. */
  name?: string;
  symbol?: string;
  interval?: string;
  num_trades?: number;
  win_rate?: number;
  total_return_pct?: number;
  stopped_out?: number;
  stop_pct?: number;
  bars?: number;
  /** The validated rule spec the model produced. Never code. */
  spec?: Record<string, unknown>;
  trades?: StrategyTrade[];
}

export interface StrategyRunRecord {
  turnId: string;
  sessionId: string;
  symbol: string;
  ranAt: string;
  /** The question that led to this run. */
  askedFor: string;
  label: string;
  detail: StrategyRunDetail;
}

export const getChatSessions = (limit = 30) =>
  req<ChatSessionSummary[]>(`/api/chat/sessions?limit=${limit}`);

export const getChatSession = (sessionId: string) =>
  req<ChatTurnRecord[]>(`/api/chat/sessions/${encodeURIComponent(sessionId)}`);

/** The conversation to restore when the terminal opens on a symbol. */
export const getLatestChatForSymbol = (symbol: string) =>
  req<ChatTurnRecord[]>(`/api/chat/sessions/latest/${encodeURIComponent(symbol)}`);

/** The record behind "why was this trade taken". */
export const getChatTurn = (turnId: string) =>
  req<ChatTurnRecord>(`/api/chat/turns/${encodeURIComponent(turnId)}`);

export const getStrategyRuns = (limit = 50) =>
  req<StrategyRunRecord[]>(`/api/chat/strategies?limit=${limit}`);
