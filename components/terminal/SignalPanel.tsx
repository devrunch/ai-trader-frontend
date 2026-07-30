"use client";

import { useState } from "react";
import { indicatorLabel, indicatorValue } from "@/lib/indicator-labels";
import type { ChartSignal } from "@/components/CandlestickChart";

/** A signal as this panel and the chart both need it, whatever endpoint it came from. */
export interface DisplaySignal extends ChartSignal {
  reasoning: string;
  indicators: Record<string, number>;
  /** When the signal was produced. Null for one generated in this session.
   *  Trade levels have a shelf life of hours; the panel used to show a
   *  three-week-old entry identically to a fresh one. */
  generatedAt: string | null;
}

/** Age of a signal, plus whether it is too old to act on without regenerating. */
export function signalAge(iso: string | null): { label: string; stale: boolean } | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  const mins = Math.max(0, Math.round((Date.now() - t) / 60_000));
  // An intraday signal from a previous session is not actionable.
  const stale = mins > 6 * 60;
  if (mins < 1)   return { label: "just now", stale: false };
  if (mins < 60)  return { label: `${mins}m ago`, stale };
  const hours = Math.round(mins / 60);
  if (hours < 24) return { label: `${hours}h ago`, stale };
  return { label: `${Math.round(hours / 24)}d ago`, stale: true };
}

export interface SignalPanelProps {
  symbol: string;
  /** "₹" or "$" — signal generation is NSE/BSE-only server-side, but the panel
   *  stays generic rather than assuming rupees, same as everywhere else. */
  currency: string;
  signal: DisplaySignal | null;
  /** A live analysis is running. */
  asking: boolean;
  /** The on-demand request failed. Already a sentence a user can read. */
  askError: string;
  /**
   * Looking up an existing signal failed.
   *
   * Distinct from finding none: "we couldn't check" and "there is nothing" are
   * different answers, and showing the second when the first is true tells the
   * user the engine had no view when in fact we never asked it.
   */
  loadError?: string;
  /** Looking for an already-stored signal. */
  loading: boolean;
  /**
   * The user asked and the engine legitimately produced nothing. Distinct from
   * "not asked yet": the first is an answer, the second is an empty screen.
   */
  askedEmpty: boolean;
  /**
   * On-demand generation runs its own India-specific cost/risk model — it is
   * NSE/BSE only, by design, same restriction as paper trading. A stored
   * signal from before this exchange was viewable still shows normally; this
   * only changes what the EMPTY state says, so the boundary reads as a
   * decision rather than a raw backend rejection the user had to trigger to
   * discover.
   */
  onDemandAvailable: boolean;
  onUseSignal: (side: "BUY" | "SELL", price: number) => void;
}

/**
 * The AI signal for the charted symbol.
 *
 * Lifted out of the terminal page, which held this, the chart, the watchlist,
 * the drawing rail and the positions list in one file. Its four states —
 * running, failed, nothing found, and a signal — are the reason it is worth its
 * own component: they were four nested ternaries in the middle of a 766-line
 * page, and collapsing any two of them shows a user the wrong thing.
 */
export function SignalPanel({
  symbol, currency, signal, asking, askError, loadError, loading, askedEmpty,
  onDemandAvailable, onUseSignal,
}: SignalPanelProps) {
  const [showIndicators, setShowIndicators] = useState(false);
  const age = signalAge(signal?.generatedAt ?? null);

  const dirColour =
    signal?.direction === "BUY" ? "var(--buy)"
      : signal?.direction === "SELL" ? "var(--sell)"
        : "var(--muted-foreground)";

  return (
    <div className="bg-card border border-border p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 bg-primary/15 flex items-center justify-center shrink-0">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--primary)"
               strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" />
          </svg>
        </div>
        <span className="font-bold text-sm">AI Signal</span>
        <span className="ml-auto text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
          on-demand
        </span>
      </div>

      {asking ? (
        <div className="text-center py-6">
          <div className="w-6 h-6 mx-auto mb-2 rounded-full border-2 border-primary/25 border-t-primary animate-spin motion-reduce:animate-none" />
          <p className="text-xs text-muted-foreground">
            Analyzing {symbol}…<br />this can take up to 15s
          </p>
        </div>
      ) : askError ? (
        <div className="text-center py-6" role="alert">
          <p className="text-xs" style={{ color: "var(--sell)" }}>{askError}</p>
        </div>
      ) : loading ? (
        <div className="text-center py-6 text-xs text-muted-foreground">
          Checking for an existing signal…
        </div>
      ) : loadError && !signal ? (
        <div className="text-center py-6" role="alert">
          <p className="text-xs" style={{ color: "var(--sell)" }}>{loadError}</p>
          <p className="text-xs text-muted-foreground mt-1">
            This is not &ldquo;no signal&rdquo; — we could not check.
          </p>
        </div>
      ) : !signal ? (
        <div className="text-center py-6">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--muted-foreground)"
               strokeWidth="1.5" className="mx-auto mb-2 opacity-50" aria-hidden="true">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {!onDemandAvailable
              ? <>On-demand analysis is available for NSE and BSE only right now.<br />You can still chart {symbol} and ask the AI about it in Chat.</>
              : askedEmpty
                ? `No signal for ${symbol} right now — confidence or reward:risk didn't clear the bar.`
                : <>No analysis yet for {symbol}.<br />Press &ldquo;Ask AI&rdquo; above for a live read.</>}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 text-xs font-extrabold"
                  style={{ background: dirColour, color: "#0b0e14" }}>
              {signal.direction}
            </span>
            <span className="text-xs font-semibold text-muted-foreground font-mono">
              {Math.round(signal.confidence * 100)}% confidence
            </span>
            {age && (
              <span className="ml-auto text-[10px] font-mono"
                    style={{ color: age.stale ? "#e0ab4a" : "var(--muted-foreground)" }}>
                {age.label}
              </span>
            )}
          </div>

          {/* Trade levels have a shelf life of hours. Without this the panel
              showed a three-week-old entry exactly like a fresh one. */}
          {age?.stale && (
            <p className="text-[11px] leading-relaxed border-l-2 pl-2.5"
               style={{ color: "#e0ab4a", borderColor: "#e0ab4a" }}>
              These levels are {age.label} — from a different session&apos;s prices.
              Press &ldquo;Ask AI&rdquo; for a current read before acting on them.
            </p>
          )}

          <div className="grid grid-cols-3 gap-2 text-xs">
            {[
              { l: "Entry",  v: `${currency}${signal.entryPrice}`,  c: "var(--foreground)" },
              { l: "Target", v: `${currency}${signal.targetPrice}`, c: "var(--buy)" },
              { l: "Stop",   v: `${currency}${signal.stopLoss}`,    c: "var(--sell)" },
            ].map((x) => (
              <div key={x.l} className="bg-secondary border border-border p-2 text-center">
                <div className="text-muted-foreground text-[9.5px] mb-0.5 uppercase tracking-wide">{x.l}</div>
                <div className="font-mono font-bold text-xs" style={{ color: x.c }}>{x.v}</div>
              </div>
            ))}
          </div>

          <div className="bg-secondary border border-border p-2.5 text-xs text-muted-foreground leading-relaxed">
            {signal.reasoning}
          </div>

          {Object.keys(signal.indicators).length > 0 && (
            <>
              <button onClick={() => setShowIndicators((v) => !v)}
                      aria-expanded={showIndicators}
                      className="text-[11px] font-semibold text-link hover:underline">
                {showIndicators ? "▾ Hide" : "▸ Show"} indicator readout
              </button>
              {showIndicators && (
                <div className="bg-secondary border border-border p-2.5 grid grid-cols-2 gap-y-1.5 gap-x-3 text-[11px]">
                  {Object.entries(signal.indicators).map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span className="text-muted-foreground text-[10px]">{indicatorLabel(k)}</span>
                      <span className="font-mono font-semibold tabular-nums">
                        {typeof v === "number" ? indicatorValue(k, Number(v.toFixed(2))) : String(v)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          <button
            onClick={() => onUseSignal(signal.direction as "BUY" | "SELL", signal.entryPrice)}
            className="w-full py-2 text-xs font-semibold transition-all hover:brightness-110"
            style={{ background: dirColour, color: "#0b0e14" }}
          >
            Use this signal → {signal.direction}
          </button>
        </div>
      )}
    </div>
  );
}
