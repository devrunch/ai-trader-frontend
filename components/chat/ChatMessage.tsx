"use client";

import type { ChatDrawing, ChatResults } from "@/lib/api";
import { DrawingLegend } from "./DrawingLegend";
import { Markdown } from "./Markdown";

export interface ChatMsg {
  role: "user" | "assistant";
  content: string;
  results?: ChatResults;
  /** What this answer put on the chart, so the marks stay explained. */
  drawings?: ChatDrawing[];
  /** The turn this answer came from — the handle for "why was this trade taken". */
  turnId?: string;
}

const inr = (n: number) => n.toLocaleString(undefined);

/**
 * One message in the conversation.
 *
 * Extracted from the terminal page so the answer, the strategy card and the
 * trade card can each be read on their own. They are separate cards because
 * they answer separate questions: the strategy card is a claim about history,
 * the simulation card is arithmetic about a trade not yet taken.
 */
export interface ChatMessageProps {
  message: ChatMsg;
  /**
   * Take the agent's simulated trade to the order ticket.
   *
   * The only place `decisionTurnId` is produced: pressing this is the user
   * saying they acted on THIS analysis. Attaching the id any other way — say,
   * because a chat happened to be open — would credit a manual trade to advice
   * that was never taken.
   */
  onUseTrade?: (trade: { side: "BUY" | "SELL"; price: number; turnId?: string }) => void;
  /** Take this answer's marks off the chart, leaving every other answer's alone. */
  onRemoveDrawings?: (turnId: string) => void;
  /** Put them back — the same call that drew them in the first place. */
  onShowDrawings?: (drawings: ChatDrawing[], turnId?: string) => void;
}

export function ChatMessage({
  message, onUseTrade, onRemoveDrawings, onShowDrawings,
}: ChatMessageProps) {
  const mine = message.role === "user";
  const simulation = message.results?.simulation;
  const side = simulation?.side === "SELL" ? "SELL" : "BUY";

  return (
    <div className={mine ? "flex justify-end" : ""}>
      <div
        className={
          mine
            ? "bg-primary text-primary-foreground text-xs px-3 py-2 max-w-[85%]"
            : "bg-secondary border border-border text-xs px-3 py-2 max-w-[92%] leading-relaxed"
        }
      >
        {/* The user's own words go through verbatim; the model writes Markdown,
            and rendering it as literal asterisks made the answer look broken in
            exactly the place it was being most useful. */}
        {mine ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="text-foreground"><Markdown text={message.content} /></div>
        )}

        {message.drawings && message.drawings.length > 0 && (
          <DrawingLegend
            drawings={message.drawings}
            // Only offered when the turn can be identified — without an id
            // there is no group to remove, and a button that does nothing is
            // worse than no button.
            onRemove={
              message.turnId && onRemoveDrawings
                ? () => onRemoveDrawings(message.turnId!)
                : undefined
            }
            onRestore={
              message.turnId && onShowDrawings
                ? () => onShowDrawings(message.drawings ?? [], message.turnId)
                : undefined
            }
          />
        )}

        {message.results?.trade && <TradeCard trade={message.results.trade} />}
        {message.results?.strategy && <StrategyCard strategy={message.results.strategy} />}
        {simulation && <SimulationCard simulation={simulation} />}

        {simulation && onUseTrade && (
          <button
            onClick={() => onUseTrade({ side, price: simulation.entry, turnId: message.turnId })}
            className="w-full mt-2 py-1.5 text-[11px] font-semibold border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
          >
            Take this to the order ticket
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * The trade, as numbers rather than a paragraph.
 *
 * A trader reads this between candles. The verdict goes first and large; the
 * levels sit in a fixed order so the eye lands on the same place every time.
 *
 * The verdict is never implied by styling alone — a rejected setup says
 * REJECTED in words next to the reason, because a card that merely looks
 * different still reads as a recommendation to someone scrolling.
 */
function TradeCard({ trade }: { trade: NonNullable<ChatResults["trade"]> }) {
  const passes = trade.verdict === "passes_every_gate";
  const notApplicable = trade.verdict === "not_applicable";
  const long = trade.direction === "BUY";
  const accent = notApplicable
    ? "var(--muted-foreground)"
    : passes
      ? (long ? "var(--buy)" : "var(--sell)")
      : "var(--sell)";
  const verdictLabel = notApplicable
    ? "NOT APPLICABLE"
    : passes ? trade.direction : `${trade.direction} · REJECTED`;

  const size = trade.position_size;
  const lots = size?.lots;
  const shares = size?.shares;

  return (
    <div className="mt-2 pt-2 border-t border-border/60 font-mono text-[11px] space-y-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-semibold tracking-wide" style={{ color: accent }}>
          {verdictLabel}
        </span>
        <span className="text-muted-foreground">
          {trade.symbol} · {trade.interval}
        </span>
      </div>

      {/* Suppressed for an option: these are price-based levels and a premium
          is not price, so showing them in the same grid as a future's would
          invite exactly the misreading the verdict is warning about. */}
      {!notApplicable && (
        <>
          <Row label="Entry" value={fmt(trade.entry)} />
          <Row label="Stop" value={fmt(trade.stop)} colour="var(--sell)" />
          <Row label="Target" value={fmt(trade.target)} colour="var(--buy)" />
          {trade.reward_risk != null && (
            <Row label="R:R" value={`${trade.reward_risk}×`} />
          )}
          <Row
            label="Risk"
            value={
              size?.risk_per_lot != null
                ? `${fmt(size.risk_per_lot)} / lot`
                : `${fmt(trade.risk_per_unit)} / unit`
            }
          />
          {lots != null && <Row label="Size" value={`${lots} lot${lots === 1 ? "" : "s"}`} />}
          {lots == null && shares != null && <Row label="Size" value={`${shares} units`} />}
        </>
      )}

      {trade.contract?.expiry && (
        <Row label="Expiry" value={`${trade.contract.expiry}${
          trade.contract.lot_size ? ` · lot ${trade.contract.lot_size}` : ""}`} />
      )}

      {/* The binding reason, not every gate that ran. */}
      {trade.rejected_because?.length ? (
        <p className="text-muted-foreground leading-snug pt-1 font-sans">
          {trade.rejected_because[0]}
        </p>
      ) : null}

      {notApplicable && trade.note && (
        <p className="text-muted-foreground leading-snug pt-1 font-sans">{trade.note}</p>
      )}

      {/* Sizing the user still has to do themselves, and why. */}
      {size?.how_to_size && (
        <p className="text-muted-foreground leading-snug pt-1 font-sans">{size.how_to_size}</p>
      )}

      {trade.executable_here === false && trade.executable_note && (
        <p className="text-muted-foreground leading-snug pt-1 font-sans">
          {trade.executable_note}
        </p>
      )}
    </div>
  );
}

/** Levels keep their own precision — rounding 1.1052 to 1.11 moves a forex
 *  stop by forty pips. */
function fmt(n: number): string {
  const digits = Math.abs(n) < 100 ? 4 : 2;
  return n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: digits });
}

function StrategyCard({ strategy }: { strategy: NonNullable<ChatResults["strategy"]> }) {
  if (strategy.error) {
    return (
      <div className="mt-2 pt-2 border-t border-border/60 font-mono text-[11px]">
        <span className="text-muted-foreground">{strategy.error}</span>
      </div>
    );
  }

  const positive = strategy.total_return_pct >= 0;
  return (
    <div className="mt-2 pt-2 border-t border-border/60 font-mono text-[11px] space-y-1">
      <div className="font-semibold text-foreground">{strategy.strategy}</div>
      <Row label="Trades" value={String(strategy.num_trades)} />
      <Row label="Win rate" value={`${strategy.win_rate}%`} />
      <Row
        label="Total return"
        value={`${positive ? "+" : ""}${strategy.total_return_pct}%`}
        colour={positive ? "var(--buy)" : "var(--sell)"}
      />
      {/* A win rate over a handful of trades is noise, and reads as a result
          unless it is labelled. */}
      {strategy.num_trades < 30 && (
        <p className="text-muted-foreground leading-snug pt-1 font-sans">
          {strategy.num_trades} trades is too few to judge — treat this as a sketch, not a result.
        </p>
      )}
    </div>
  );
}

function SimulationCard({ simulation }: { simulation: NonNullable<ChatResults["simulation"]> }) {
  return (
    <div className="mt-2 pt-2 border-t border-border/60 font-mono text-[11px] space-y-1">
      <div className="font-semibold text-foreground">
        {simulation.side} · R:R {simulation.reward_risk}×
      </div>
      <Row label="Profit at target" value={`+₹${inr(simulation.profit_at_target)}`} colour="var(--buy)" />
      <Row label="Loss at stop" value={`₹${inr(simulation.loss_at_stop)}`} colour="var(--sell)" />
      <Row label="Capital" value={`₹${inr(simulation.capital_required)}`} />
    </div>
  );
}

function Row({ label, value, colour }: { label: string; value: string; colour?: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span style={colour ? { color: colour } : undefined}>{value}</span>
    </div>
  );
}
