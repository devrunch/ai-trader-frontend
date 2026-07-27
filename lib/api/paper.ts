import { req } from "./client";

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

export type OrderStatus = "PENDING" | "EXECUTED" | "REJECTED" | "CANCELLED";

/** Must match `OrderType` in ai-trader-api/src/portfolio/schemas/paper-order.schema.ts. */
export type OrderKind = "MARKET" | "LIMIT";

export interface ApiOrder {
  _id: string;
  symbol: string;
  exchange: string;
  side: "BUY" | "SELL";
  type?: OrderKind;
  quantity: number;
  limitPrice?: number;
  executedPrice?: number;
  status: OrderStatus;
  createdAt: string;
  /**
   * The agent turn this order acted on, when the user placed it from the AI's
   * analysis. Absent for a manually placed order — and the UI says "Manual"
   * rather than leaving a blank that reads as a panel which failed to load.
   */
  decisionTurnId?: string;
}

/**
 * The shape `POST /api/paper/order` may return.
 *
 * The API is mid-migration: it currently returns `{ order, trade }` for a
 * filled MARKET order and a bare order document for a resting LIMIT one, and is
 * being changed to a flat `PlaceOrderResult` carrying `executedPrice` directly
 * (`paper-trading.service.ts`). We accept all three so the fill price is read
 * correctly either way — and so this keeps working the moment the new shape
 * lands, without a frontend change.
 */
export type PlaceOrderResponse =
  | ApiOrder
  | { order: ApiOrder; trade?: unknown }
  | {
      order: ApiOrder;
      trade?: unknown;
      status: OrderStatus;
      executedPrice: number | null;
      requestedPrice: number | null;
      quantity: number;
      symbol: string;
      side: "BUY" | "SELL";
      message?: string;
    };

/** What the UI needs to report an order truthfully, from any of the shapes above. */
export interface OrderOutcome {
  status: OrderStatus;
  /** The price the account actually moved at. Null while nothing has filled. */
  executedPrice: number | null;
  quantity: number;
  symbol: string;
  side: "BUY" | "SELL";
}

function hasOrder(r: PlaceOrderResponse): r is { order: ApiOrder; trade?: unknown } {
  return typeof r === "object" && r !== null && "order" in r;
}

/**
 * Normalise a place-order response. Never invents a fill price: if the response
 * carries no executed price the order has not filled, and callers must say so
 * rather than echoing back the price the user typed.
 */
export function readOrderOutcome(res: PlaceOrderResponse): OrderOutcome {
  const flat = res as Extract<PlaceOrderResponse, { executedPrice: number | null }>;
  const order: ApiOrder = hasOrder(res) ? res.order : (res as ApiOrder);

  // Prefer the explicit top-level field once the API provides it.
  const executedPrice =
    typeof flat?.executedPrice === "number" ? flat.executedPrice
    : typeof order?.executedPrice === "number" ? order.executedPrice
    : null;

  return {
    status: flat?.status ?? order?.status ?? "PENDING",
    executedPrice,
    quantity: flat?.quantity ?? order?.quantity ?? 0,
    symbol: flat?.symbol ?? order?.symbol ?? "",
    side: flat?.side ?? order?.side ?? "BUY",
  };
}

/**
 * Returns the NSE paper portfolio summary derived from all positions.
 *
 * Throws on failure and returns `null` only when the user genuinely has no
 * portfolio. It used to swallow every error and return `null`, so an API outage
 * rendered as "No paper account yet" — an affirmative false claim about the
 * user's money. The caller must render those two cases differently.
 */
export async function getPaperPortfolio(): Promise<ApiPortfolioSummary | null> {
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
}

export const getPaperPositions = () =>
  req<ApiPosition[]>("/api/paper/positions");

export const getPaperOrders = () =>
  req<ApiOrder[]>("/api/paper/orders");

