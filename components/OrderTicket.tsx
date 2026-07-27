"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  ApiError, placePaperOrder, getPaperCashBalance, getRiskState, readOrderOutcome,
  errorMessage, newOrderIntentId,
  type OrderOutcome, type RiskState,
} from "@/lib/api";

/**
 * Whether a failed placement leaves the outcome genuinely unknown.
 *
 * A network failure or a timeout means the order may already be sitting in the
 * book — so a retry must carry the SAME idempotency key, or the user places it
 * twice. Any answer from the server is conclusive: it decided, and a retry is a
 * new intent that deserves a new key.
 */
function outcomeIsUnknown(err: unknown): boolean {
  if (!(err instanceof ApiError)) return true;
  return err.status === 0 || err.status === 408 || err.status === 504;
}

export interface OrderPrefill {
  side: "BUY" | "SELL";
  price: number;
  /**
   * Set when the prefill came from something the agent said, so the resulting
   * order can be traced back to the analysis behind it. Left unset for a
   * prefill the user produced themselves.
   */
  decisionTurnId?: string;
}

interface OrderTicketProps {
  symbol: string;
  exchange: string;
  name: string;
  /** Null when the quote could not be fetched — never render a fabricated 0. */
  ltp: number | null;
  changePct: number | null;
  /** Pass a new object each time to apply a fresh prefill (e.g. "Use this signal"). */
  prefill?: OrderPrefill | null;
}

function money(n: number) {
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Explicit sign on the percentage — colour must reinforce, never carry, direction. */
function signedPct(n: number) {
  return `${n >= 0 ? "+" : "−"}${Math.abs(n).toFixed(2)}%`;
}

export function OrderTicket({ symbol, exchange, name, ltp, changePct, prefill }: OrderTicketProps) {
  const [tab, setTab]                 = useState<"BUY" | "SELL">("BUY");
  const [qty, setQty]                 = useState("");
  const [price, setPrice]             = useState("");
  const [priceMode, setPriceMode]     = useState<"Limit" | "Market">("Limit");
  const [step, setStep]               = useState<"form" | "confirm" | "success" | "error">("form");
  const [orderErr, setOrderErr]       = useState("");
  const [outcome, setOutcome]         = useState<OrderOutcome | null>(null);
  const [cashBalance, setCashBalance] = useState<number | null>(null);
  const [balanceFailed, setBalanceFailed] = useState(false);

  /* The API has enforced position, aggregate-risk and daily-loss caps since the
     risk-limits work, but nothing showed them — so a user only discovered a
     limit existed by having an order rejected. Showing the state up front turns
     a refusal into an expectation. */
  const [risk, setRisk] = useState<RiskState | null>(null);

  /** In-flight guard. Without this two clicks placed two orders: the backend's
   *  atomic cash guard prevents an overdraft, not a duplicate. */
  const [placing, setPlacing] = useState(false);

  /** Idempotency key for the order currently being placed. A ref, not state,
   *  because it must not trigger a render and must be readable synchronously
   *  inside the submit handler. Null means "no intent in flight". */
  const intentId = useRef<string | null>(null);

  /** Announced to screen readers — an order result must be perceivable without sight. */
  const [announcement, setAnnouncement] = useState("");

  const initedForSymbol = useRef<string | null>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Apply a prefill during render rather than in an effect: the old effect re-ran
     for any render carrying the same object and silently reset quantity to "1". */
  const [lastPrefill, setLastPrefill] = useState<OrderPrefill | null | undefined>(prefill);
  if (prefill && prefill !== lastPrefill) {
    setLastPrefill(prefill);
    setTab(prefill.side);
    setPrice(prefill.price.toFixed(2));
    setQty("1");
  }

  /* Every setState here lives in a promise callback: a synchronous one in a
     function called from an effect triggers a cascading render. */
  function loadRisk() {
    getRiskState(exchange).then(setRisk).catch(() => setRisk(null));
  }

  function loadBalance() {
    getPaperCashBalance()
      .then(b => { setCashBalance(b); setBalanceFailed(false); })
      .catch(() => { setCashBalance(null); setBalanceFailed(true); });
  }

  useEffect(() => { loadBalance(); loadRisk(); }, []);

  useEffect(() => {
    if (initedForSymbol.current !== symbol && ltp != null && ltp > 0) {
      setPrice(ltp.toFixed(2));
      initedForSymbol.current = symbol;
    }
  }, [symbol, ltp]);

  useEffect(() => () => { if (dismissTimer.current) clearTimeout(dismissTimer.current); }, []);

  /* Escape closes the confirm modal; focus moves to Confirm when it opens. */
  useEffect(() => {
    if (step !== "confirm") return;
    confirmBtnRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !placing) setStep("form");
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [step, placing]);

  const isBuy      = tab === "BUY";
  const dir        = isBuy ? "var(--buy)" : "var(--sell)";
  const isLimit    = priceMode === "Limit";
  const priceKnown = ltp != null && ltp > 0;
  const limitPrice = parseFloat(price);
  const limitValid = !isLimit || (Number.isFinite(limitPrice) && limitPrice > 0);
  const qtyNum     = parseInt(qty, 10);
  const qtyValid   = Number.isFinite(qtyNum) && qtyNum > 0;
  // A market order needs a live price to be meaningful; a limit order does not.
  const canPlace   = qtyValid && limitValid && (isLimit || priceKnown);

  const estimateBase = isLimit && Number.isFinite(limitPrice) ? limitPrice : ltp;
  const orderTotal = qtyValid && estimateBase != null ? qtyNum * estimateBase : null;

  /* One sentence describing what actually happened — never the requested price. */
  function describeOutcome(o: OrderOutcome): string {
    const what = `${o.quantity || qtyNum} × ${o.symbol || symbol}`;
    if (o.status === "EXECUTED" && o.executedPrice != null) {
      return `${o.side} ${what} filled at ₹${money(o.executedPrice)}.`;
    }
    if (o.status === "EXECUTED") {
      return `${o.side} ${what} filled. See Portfolio for the fill price.`;
    }
    if (o.status === "PENDING") {
      return `Limit order for ${what} is resting. It fills only if the price is reached.`;
    }
    return `${o.side} ${what} — order ${o.status.toLowerCase()}.`;
  }

  async function handleConfirm() {
    if (placing) return;                     // guards the double click itself
    setPlacing(true);
    setOrderErr("");
    // One id per intent, not per attempt: if this request is sent twice — a
    // second click, a retry after a dropped connection — the API answers the
    // second with the first order instead of opening another position.
    intentId.current ??= newOrderIntentId();
    try {
      const res = await placePaperOrder({
        symbol, exchange,
        side: tab,
        // Previously omitted, so the API defaulted to MARKET and a "Limit"
        // order filled immediately at the market price.
        type: isLimit ? "LIMIT" : "MARKET",
        quantity: qtyNum,
        limitPrice: isLimit ? limitPrice : undefined,
        clientOrderId: intentId.current,
        decisionTurnId: prefill?.decisionTurnId,
      });
      const o = readOrderOutcome(res);
      intentId.current = null;               // this intent is spent
      setOutcome(o);
      setStep("success");
      setAnnouncement(describeOutcome(o));
      loadBalance();
      loadRisk();
      dismissTimer.current = setTimeout(() => {
        setStep("form");
        setQty("");
        setPrice(priceKnown ? ltp.toFixed(2) : "");
      }, 6000);
    } catch (err) {
      // Keep the id only when we cannot tell whether the order was placed.
      // After a definitive rejection, reusing it would return that rejection
      // forever — the user could never retry a blocked order.
      if (!outcomeIsUnknown(err)) intentId.current = null;
      const msg = errorMessage(err, "Order failed");
      setOrderErr(msg);
      setStep("error");
      setAnnouncement(`Order failed. ${msg}`);
      dismissTimer.current = setTimeout(() => { setStep("form"); setOrderErr(""); }, 8000);
    } finally {
      setPlacing(false);
    }
  }

  return (
    <>
      {/* Persistent live region — it must exist before its text changes to be announced. */}
      <div role="status" aria-live="polite" className="sr-only">{announcement}</div>

      <div className="border border-border bg-card overflow-hidden">
        <div className="px-4 pt-4 pb-3 border-b border-border">
          <div className="font-semibold text-base">{name}</div>
          <div className="text-muted-foreground text-xs mt-0.5 font-mono">
            {priceKnown ? (
              <span style={{ color: (changePct ?? 0) >= 0 ? "var(--buy)" : "var(--sell)" }}>
                {exchange} ₹{money(ltp)} {changePct != null && `(${signedPct(changePct)})`}
              </span>
            ) : (
              <span className="text-muted-foreground">{exchange} · price unavailable</span>
            )}
          </div>
        </div>

        <div className="flex" role="group" aria-label="Order side">
          {(["BUY", "SELL"] as const).map((t) => {
            const active = tab === t;
            const col = t === "BUY" ? "var(--buy)" : "var(--sell)";
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                aria-pressed={active}
                className="flex-1 py-3 text-sm font-bold transition-colors border-b-2"
                style={active
                  ? { color: col, borderColor: col, background: `color-mix(in oklch, ${col} 10%, transparent)` }
                  : { color: "var(--muted-foreground)", borderColor: "transparent" }}
              >
                {t}
              </button>
            );
          })}
        </div>

        <div className="p-4 space-y-4">
          {/* The Delivery/Intraday/MTF selector was removed: it was never sent to the
              API, and "MTF 2.86×" advertised leverage the engine does not apply.
              Market vs Limit below is the order type that is actually honoured. */}

          <div className="flex gap-2">
            {[1, 5, 10].map((q) => (
              <button key={q} onClick={() => setQty(String(q))}
                className="flex-1 py-1.5 text-xs font-semibold border border-border text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors font-mono">
                {q}
              </button>
            ))}
          </div>

          <div>
            <label htmlFor="order-qty" className="text-muted-foreground text-xs mb-1.5 block">Quantity · {exchange}</label>
            <input id="order-qty" type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="0"
              className="w-full px-3 py-2.5 bg-secondary border border-border text-right text-sm font-mono focus:border-primary transition-colors" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="order-price" className="text-muted-foreground text-xs">
                Price ·{" "}
                <button type="button" onClick={() => setPriceMode(isLimit ? "Market" : "Limit")} className="text-link hover:underline">
                  {priceMode} ↕
                </button>
              </label>
            </div>
            {isLimit
              ? <input id="order-price" type="number" value={price} onChange={(e) => setPrice(e.target.value)}
                  className="w-full px-3 py-2.5 bg-secondary border border-border text-right text-sm font-mono focus:border-primary transition-colors" />
              : <div className="w-full px-3 py-2.5 bg-secondary border border-border text-muted-foreground text-right text-sm">Market Price</div>
            }
            <p className="text-muted-foreground text-[10px] mt-1.5 leading-relaxed">
              {isLimit
                ? "Fills only if the market reaches this price — it may not fill at all."
                : "Fills immediately at the prevailing price, which may differ from the one shown."}
            </p>
          </div>

          {risk && (
            <div className="text-[10px] text-muted-foreground border-t border-border pt-2 flex flex-wrap gap-x-3 gap-y-1">
              <span title="Concurrent positions allowed">
                Positions{" "}
                <span className="font-mono tabular-nums text-foreground">
                  {risk.openPositions}/{risk.maxConcurrentPositions}
                </span>
              </span>
              <span title="Realised P&L this session against the daily loss limit">
                Today{" "}
                <span
                  className="font-mono tabular-nums"
                  style={{ color: risk.sessionRealisedPnlPct >= 0 ? "var(--buy)" : "var(--sell)" }}
                >
                  {risk.sessionRealisedPnlPct >= 0 ? "+" : "−"}
                  {Math.abs(risk.sessionRealisedPnlPct).toFixed(2)}%
                </span>
                <span className="text-muted-foreground"> / −{risk.maxDailyLossPct}% limit</span>
              </span>
              {risk.openRiskIsUnbounded ? (
                <span style={{ color: "var(--sell)" }} title="Positions with no declared stop have unbounded downside">
                  {risk.positionsWithoutStop} position{risk.positionsWithoutStop === 1 ? "" : "s"} with no stop
                </span>
              ) : (
                <span title="Aggregate open risk against the cap">
                  Open risk{" "}
                  <span className="font-mono tabular-nums text-foreground">
                    {risk.openRiskPct.toFixed(2)}%/{risk.maxAggregateRiskPct}%
                  </span>
                </span>
              )}
              {risk.blocked && risk.blockedReason && (
                <span className="w-full" style={{ color: "var(--sell)" }}>{risk.blockedReason}</span>
              )}
            </div>
          )}

          <div className="flex justify-between text-xs py-2 border-t border-border">
            <span className="text-muted-foreground">
              Balance{" "}
              {cashBalance !== null ? (
                <span className="text-foreground font-mono">₹{cashBalance.toLocaleString("en-IN")}</span>
              ) : balanceFailed ? (
                <button onClick={loadBalance} className="text-link hover:underline">unavailable — retry</button>
              ) : (
                <span className="text-muted-foreground font-mono">—</span>
              )}
            </span>
            <span className="text-muted-foreground">
              {isLimit ? "Req" : "Est"}{" "}
              <span className="font-mono" style={{ color: dir }}>
                {orderTotal != null ? `₹${orderTotal.toLocaleString("en-IN", { maximumFractionDigits: 2 })}` : "—"}
              </span>
            </span>
          </div>

          {!priceKnown && !isLimit && (
            <p className="text-[11px]" style={{ color: "var(--sell)" }}>
              A market order needs a live price. Switch to Limit, or retry once the quote returns.
            </p>
          )}

          <button
            disabled={!canPlace}
            onClick={() => setStep("confirm")}
            className="w-full py-3 font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: dir, color: "#0b0e14" }}
          >
            {tab} {qtyValid ? `${qtyNum} shares` : ""}
          </button>
        </div>
      </div>

      {/* Confirm modal */}
      {step === "confirm" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="order-confirm-title" className="bg-card border border-border p-6 w-full max-w-sm">
            <h3 id="order-confirm-title" className="font-heading font-semibold text-lg mb-1">Confirm order</h3>
            <p className="text-muted-foreground text-sm mb-5">Review before placing — this is a paper trade.</p>
            <div className="space-y-3 mb-5">
              {[
                { l: "Stock",      v: name },
                { l: "Action",     v: tab, c: dir },
                { l: "Order type", v: isLimit ? "Limit" : "Market" },
                { l: "Quantity",   v: `${qtyNum} shares` },
                { l: "Price",      v: isLimit ? `₹${price} limit` : "Market price" },
                { l: isLimit ? "Total value" : "Estimated value",
                  v: orderTotal != null ? `₹${orderTotal.toLocaleString("en-IN", { maximumFractionDigits: 2 })}` : "—" },
              ].map((r) => (
                <div key={r.l} className="flex justify-between items-center py-1.5 border-b border-border/50 last:border-0">
                  <span className="text-muted-foreground text-sm">{r.l}</span>
                  <span className="text-sm font-semibold font-mono" style={r.c ? { color: r.c } : undefined}>{r.v}</span>
                </div>
              ))}
            </div>
            <p className="text-muted-foreground text-[11px] leading-relaxed mb-4">
              {isLimit
                ? "A limit order rests until the market reaches your price. It may never fill."
                : "A market order fills at whatever the price is when it reaches the book — not necessarily the price shown above."}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setStep("form")} disabled={placing}
                className="flex-1 py-2.5 border border-border text-muted-foreground text-sm font-semibold hover:text-foreground hover:border-foreground/40 transition-colors disabled:opacity-40">
                Cancel
              </button>
              <button
                ref={confirmBtnRef}
                onClick={handleConfirm}
                disabled={placing}
                aria-busy={placing}
                className="flex-1 py-2.5 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-wait"
                style={{ background: dir, color: "#0b0e14" }}
              >
                {placing
                  ? <><span className="w-3.5 h-3.5 rounded-full border-2 border-black/25 border-t-black animate-spin" /> Placing…</>
                  : <>Confirm {tab}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {step === "success" && outcome && (
        <div role="status" className="fixed bottom-6 right-6 z-50 bg-card border p-4 flex items-start gap-3 min-w-64 max-w-sm"
          style={{ borderColor: outcome.status === "PENDING" ? "#e0ab4a" : "var(--buy)" }}>
          <div className="w-10 h-10 flex items-center justify-center shrink-0"
            style={{ background: `color-mix(in oklch, ${outcome.status === "PENDING" ? "#e0ab4a" : "var(--buy)"} 20%, transparent)` }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={outcome.status === "PENDING" ? "#e0ab4a" : "var(--buy)"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div className="min-w-0">
            <div className="font-bold text-sm">
              {outcome.status === "PENDING" ? "Limit order resting" : "Paper order filled"}
            </div>
            {/* The executed price, never the price the user typed. */}
            <div className="text-muted-foreground text-xs mt-0.5 font-mono">
              {outcome.status === "EXECUTED" && outcome.executedPrice != null
                ? `${outcome.side} ${outcome.quantity} × ${outcome.symbol} @ ₹${money(outcome.executedPrice)}`
                : outcome.status === "EXECUTED"
                  /* TODO: drop this branch once the API's PlaceOrderResult.executedPrice
                     ships — the interface exists in paper-trading.service.ts but
                     placeOrder does not return it yet. Until it does we must not
                     invent a fill price. */
                  ? `${outcome.side} ${outcome.quantity} × ${outcome.symbol} — fill price in Portfolio`
                  : `${outcome.side} ${outcome.quantity} × ${outcome.symbol} @ ₹${price} limit — not yet filled`}
            </div>
            <div className="flex items-center gap-3 mt-1">
              <Link href="/dashboard/portfolio" className="text-link text-xs hover:underline">View in Portfolio →</Link>
              <button onClick={() => setStep("form")} className="text-muted-foreground text-[10px] hover:text-foreground">Dismiss</button>
            </div>
          </div>
        </div>
      )}

      {step === "error" && (
        <div role="alert" className="fixed bottom-6 right-6 z-50 bg-card border p-4 flex items-start gap-3 min-w-64 max-w-sm" style={{ borderColor: "var(--sell)" }}>
          <div className="w-10 h-10 flex items-center justify-center shrink-0" style={{ background: "color-mix(in oklch, var(--sell) 15%, transparent)" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--sell)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </div>
          <div className="min-w-0">
            <div className="font-bold text-sm">Order not placed</div>
            <div className="text-xs mt-0.5 leading-relaxed" style={{ color: "var(--sell)" }}>{orderErr}</div>
            <button onClick={() => { setStep("confirm"); setOrderErr(""); }} className="text-link text-xs hover:underline mt-1">Try again</button>
          </div>
        </div>
      )}
    </>
  );
}
