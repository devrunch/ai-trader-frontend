const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",          // send httpOnly JWT cookie
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

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

/* ── Paper trading ── */
export interface ApiPosition {
  _id: string;
  userId: string;
  symbol: string;
  exchange: string;
  quantity: number;
  averageCost: number;
  currentPrice: number;
  unrealisedPnl: number;
}

export interface ApiPortfolio {
  _id: string;
  userId: string;
  exchange: string;
  initialCapital: number;
  cashBalance: number;
  realisedPnl: number;
  /** Present on the detailed GET /paper/portfolio/:exchange response */
  positions?: ApiPosition[];
  totalValue?: number;
  unrealisedPnl?: number;
  totalPnl?: number;
}

export interface ApiPortfolioSummary {
  totalInvested: number;
  currentValue: number;
  totalPnl: number;
  pnlPct: number;
}

export interface ApiOrder {
  _id: string;
  symbol: string;
  exchange: string;
  side: "BUY" | "SELL";
  quantity: number;
  limitPrice?: number;
  executedPrice?: number;
  status: "PENDING" | "EXECUTED" | "REJECTED" | "CANCELLED";
  createdAt: string;
}

/** Returns the NSE paper portfolio summary derived from all positions. */
export async function getPaperPortfolio(): Promise<ApiPortfolioSummary | null> {
  try {
    const portfolios = await req<ApiPortfolio[]>("/api/paper/portfolio");
    if (!portfolios.length) return null;
    const p = portfolios[0];
    const positions = await req<ApiPosition[]>("/api/paper/positions");
    const invested   = positions.reduce((s, x) => s + x.averageCost * x.quantity, 0);
    const current    = positions.reduce((s, x) => s + x.currentPrice * x.quantity, 0) + p.cashBalance;
    const totalPnl   = p.realisedPnl + positions.reduce((s, x) => s + x.unrealisedPnl, 0);
    return {
      totalInvested: invested,
      currentValue:  current,
      totalPnl,
      pnlPct: invested > 0 ? (totalPnl / invested) * 100 : 0,
    };
  } catch {
    return null;
  }
}

export const getPaperPositions = () =>
  req<ApiPosition[]>("/api/paper/positions");

export const getPaperOrders = () =>
  req<ApiOrder[]>("/api/paper/orders");

export const placePaperOrder = (body: {
  symbol: string;
  exchange: string;
  side: "BUY" | "SELL";
  quantity: number;
  limitPrice?: number;
}) => req<ApiOrder>("/api/paper/order", { method: "POST", body: JSON.stringify(body) });
