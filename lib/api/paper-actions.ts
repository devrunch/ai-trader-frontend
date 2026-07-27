import { req } from "./client";
import type { ApiPortfolio, OrderKind, PlaceOrderResponse } from "./paper";

export const createPaperPortfolio = (exchange = "NSE", initialCapital = 100000) =>
  req<ApiPortfolio>("/api/paper/portfolio", {
    method: "POST",
    body: JSON.stringify({ exchange, initialCapital }),
  });

/**
 * `type` is required, not optional: omitting it made the API default to MARKET
 * (`paper-trading.service.ts`), so a user who chose "Limit" silently got a
 * market order and the limit-reachability check never ran.
 *
 * `clientOrderId` is required for the same class of reason. Without it, a
 * double-click, a retry, or a connection dropped after the request was sent
 * opens a second position and debits the account twice. The caller generates
 * one id per order INTENT — not per attempt — so every retry of that intent
 * carries the same id and the API returns the original order.
 */
export const placePaperOrder = (body: {
  symbol: string;
  exchange: string;
  side: "BUY" | "SELL";
  type: OrderKind;
  quantity: number;
  limitPrice?: number;
  clientOrderId: string;
  /**
   * The agent turn this order acted on, when the user placed it from something
   * the agent said. Resolves through `getChatTurn` to what the agent was asked,
   * what it looked up and what it concluded.
   *
   * Only set when the user genuinely acted on the agent's output — attaching it
   * because a chat happened to be open would attribute a manual trade to advice
   * that was never taken.
   */
  decisionTurnId?: string;
}) => req<PlaceOrderResponse>("/api/paper/order", { method: "POST", body: JSON.stringify(body) });

/**
 * An id for one order intent.
 *
 * `crypto.randomUUID` needs a secure context, which localhost and HTTPS both
 * are — but a plain-HTTP LAN address is not, and there it is undefined. The
 * fallback keeps ordering working rather than throwing at the moment of a
 * trade.
 */
export function newOrderIntentId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `oid-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export const resetPaperPortfolio = (exchange = "NSE") =>
  req<{ ok: boolean; cashBalance: number }>("/api/paper/reset", {
    method: "POST",
    body: JSON.stringify({ exchange }),
  });

/**
 * Throws on failure rather than falling back to 0. A funded account that
 * rendered "Balance ₹0" because a request failed told the user they were broke.
 */
export const getPaperCashBalance = async (): Promise<number | null> => {
  const portfolios = await req<ApiPortfolio[]>("/api/paper/portfolio");
  return portfolios[0]?.cashBalance ?? null;
};

