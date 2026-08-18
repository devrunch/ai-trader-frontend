"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getLatestChatForSymbol,
  type AgentEvent,
  type ChatDrawing,
  type ChatResults,
  type CustomIndicatorSpec,
} from "@/lib/api";
import { streamChat, type StreamedTurn } from "@/lib/chat-stream";
import { AgentProgress } from "./AgentProgress";
import { ChatMessage, type ChatMsg } from "./ChatMessage";

const SUGGESTIONS = [
  "Draw the trend line",
  "Where's support and resistance?",
  "Backtest an MA crossover strategy",
  "Draw the Fibonacci levels",
];

export interface ChatPanelProps {
  symbol: string;
  exchange: string;
  /**
   * Apply what the agent drew. Called once per answer, with everything it drew
   * and the turn it came from — the turn id is what lets a single answer's
   * marks be removed later without touching the rest.
   */
  onDrawings: (drawings: ChatDrawing[], turnId?: string) => void;
  /** Take one answer's marks back off the chart. */
  onRemoveDrawings?: (turnId: string) => void;
  /** The agent asked to toggle chart indicators. */
  onIndicators: (change: { add?: string[]; remove?: string[] }) => void;
  /** The agent authored one or more custom (diascript) indicators. */
  onCustomIndicator: (specs: CustomIndicatorSpec[]) => void;
  /**
   * The user chose to act on a trade the agent worked through. Carries the turn
   * id, which is what lets the resulting order be traced back to this analysis.
   */
  onUseTrade?: (trade: { side: "BUY" | "SELL"; price: number; turnId?: string }) => void;
}

/**
 * The conversation with the agent.
 *
 * Lifted out of the terminal page, which was a 766-line file holding the chart,
 * the drawing tools, the watchlist, the order ticket and this. Its own file
 * because it now owns three things that page has no reason to know about: a
 * streamed turn, the live progress feed, and restoring the last conversation.
 */
export function ChatPanel({
  symbol, exchange, onDrawings, onRemoveDrawings, onIndicators, onCustomIndicator, onUseTrade,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState<AgentEvent[]>([]);
  const [restoring, setRestoring] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<(() => void) | null>(null);

  /* Restore the last conversation about this symbol. Before this, a reload lost
     everything the user had asked — the history lived only in React state.

     Runs once per mount, not on every symbol change: the terminal keys this
     component by symbol, so switching symbols remounts it. That resets the
     conversation, the progress feed and any in-flight turn in one step, rather
     than clearing three pieces of state inside an effect and cascading a render
     for each. */
  useEffect(() => {
    let live = true;

    getLatestChatForSymbol(symbol)
      .then((turns) => {
        if (!live) return;
        setMessages(
          turns.flatMap((t): ChatMsg[] => [
            { role: "user", content: t.message },
            { role: "assistant", content: t.answer, turnId: t.turnId },
          ]),
        );
      })
      // A conversation we could not restore is not worth an error banner over
      // the thing the user came to do. The panel simply starts empty.
      .catch(() => undefined)
      .finally(() => live && setRestoring(false));

    return () => {
      live = false;
    };
  }, [symbol]);

  /* An abandoned turn should not keep spending on an answer nobody will see. */
  useEffect(() => () => cancelRef.current?.(), []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, progress]);

  const applyResult = useCallback(
    (turn: StreamedTurn) => {
      onDrawings(turn.drawings ?? [], turn.turnId);
      const indicators = (turn.results as ChatResults | undefined)?.chart_indicators;
      if (indicators?.add?.length || indicators?.remove?.length) onIndicators(indicators);

      const customIndicators = (turn.results as ChatResults | undefined)?.custom_indicators;
      if (customIndicators?.length) onCustomIndicator(customIndicators);

      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: turn.message,
          results: turn.results,
          // Kept on the message, not just applied to the chart: the marks need
          // to stay explained by the answer that made them.
          drawings: turn.drawings ?? [],
          turnId: turn.turnId,
        },
      ]);
    },
    [onDrawings, onIndicators, onCustomIndicator],
  );

  function send() {
    const text = input.trim();
    if (!text || sending) return;

    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((m) => [...m, { role: "user", content: text }]);
    setInput("");
    setProgress([]);
    setSending(true);

    cancelRef.current = streamChat(
      { symbol, exchange, message: text, history },
      {
        onEvent: (event) => setProgress((p) => [...p, event]),
        onResult: (turn) => {
          applyResult(turn);
          setSending(false);
          setProgress([]);
          cancelRef.current = null;
        },
        onError: (message) => {
          setMessages((m) => [...m, { role: "assistant", content: message }]);
          setSending(false);
          setProgress([]);
          cancelRef.current = null;
        },
      },
    );
  }

  function stop() {
    cancelRef.current?.();
    cancelRef.current = null;
    setSending(false);
    setProgress([]);
    setMessages((m) => [...m, { role: "assistant", content: "Stopped." }]);
  }

  const empty = !restoring && messages.length === 0;

  return (
    <div className="flex flex-col min-h-[calc(100vh-9rem)]">
      <div className="flex-1 space-y-3">
        {empty && (
          <div className="text-center py-6">
            <div className="w-10 h-10 bg-primary/15 flex items-center justify-center mb-3 mx-auto">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)"
                   strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <p className="text-sm font-semibold mb-1">Ask about {symbol}</p>
            <p className="text-xs text-muted-foreground leading-relaxed mb-4">
              The AI can draw on the chart, backtest a strategy, or simulate a trade.
            </p>
            <div className="flex flex-col gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => setInput(s)}
                  className="text-left text-xs px-3 py-2 border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <div aria-live="polite" aria-atomic="false" className="contents">
          {messages.map((m, i) => (
            <ChatMessage
              key={m.turnId ? `${m.turnId}-${m.role}` : `m-${i}`}
              message={m}
              onUseTrade={onUseTrade}
              onRemoveDrawings={onRemoveDrawings}
              // Restoring is the same call that drew them originally — the
              // drawings are data on the message, so nothing had to be kept
              // anywhere else for this to work.
              onShowDrawings={onDrawings}
            />
          ))}
        </div>

        {sending && (
          <div className="border border-border bg-card px-3 py-2.5">
            <AgentProgress events={progress} />
            <button onClick={stop}
              className="text-[11px] text-muted-foreground hover:text-foreground mt-2 underline underline-offset-2">
              Stop
            </button>
          </div>
        )}

        <div ref={endRef} />
      </div>

      <div className="sticky bottom-0 bg-background pt-2 mt-2">
        <div className="flex items-center gap-2 border border-border bg-card px-3 py-2 focus-within:border-primary transition-colors">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") send(); }}
            disabled={sending}
            placeholder={`Ask about ${symbol}…`}
            aria-label={`Ask the AI analyst about ${symbol}`}
            className="flex-1 min-w-0 bg-transparent text-sm placeholder-muted-foreground focus:outline-none"
          />
          <button onClick={send} disabled={sending || !input.trim()} aria-label="Send message"
            className="text-link disabled:opacity-40 shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
