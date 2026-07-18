"use client";

import { useEffect, useRef, useState } from "react";

type Message = { role: "user" | "assistant"; content: string };

const QUICK_ACTIONS = [
  { label: "🔥 Top Picks Now",        prompt: "Give me your top 5 stock picks right now based on current signals. Format each with buy zone, targets, stop loss, and brief reasoning." },
  { label: "📊 F&O Opportunities",    prompt: "What are the best F&O setups right now? Give me 3 options strategies with strikes, expiry, and reasoning." },
  { label: "🚀 Breakout Stocks",      prompt: "Which stocks are breaking out or about to break out? List 4–5 with entry levels and targets." },
  { label: "💰 Long-term Buys",       prompt: "Which 5 stocks should I buy and hold for 1–2 years? Focus on strong fundamentals and growth story." },
];

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const autoFetched = useRef(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 80);
      if (!autoFetched.current) {
        autoFetched.current = true;
        sendPrompt("Give me your top 5 stock picks right now based on current market signals. Format each with buy zone, targets, stop loss, and brief reasoning.");
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function sendPrompt(text: string, history: Message[] = messages) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const updated: Message[] = [...history, { role: "user", content: trimmed }];
    setMessages(updated);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updated.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok || !res.body) {
        setMessages((p) => [...p, { role: "assistant", content: "Something went wrong. Try again." }]);
        return;
      }

      setMessages((p) => [...p, { role: "assistant", content: "" }]);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let aiText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        aiText += decoder.decode(value, { stream: true });
        setMessages((p) => [...p.slice(0, -1), { role: "assistant", content: aiText }]);
      }
    } catch {
      setMessages((p) => [...p, { role: "assistant", content: "Network error. Check your connection." }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendPrompt(input);
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Chat panel */}
      {open && (
        <div
          className="w-[370px] bg-white rounded-2xl shadow-2xl border border-[#e8e8e8] flex flex-col overflow-hidden"
          style={{ height: "520px" }}
        >
          {/* Header */}
          <div className="flex items-center gap-2.5 px-4 py-3 bg-[#00b386] shrink-0">
            <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-xs">
              AI
            </div>
            <div className="flex-1">
              <p className="text-white font-semibold text-sm leading-none">AI Stock Advisor</p>
              <p className="text-white/70 text-[11px] mt-0.5">
                {loading ? (
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-white/60 animate-pulse inline-block" />
                    Analyzing markets...
                  </span>
                ) : "Live market analysis · Powered by Claude"}
              </p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-white/70 hover:text-white transition-colors p-1"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto no-scrollbar px-3 py-3 flex flex-col gap-3">
            {messages.length === 0 && loading && (
              <div className="flex items-end gap-1.5">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#00b386] to-[#00d4a0] flex items-center justify-center text-white text-[9px] font-bold shrink-0">
                  AI
                </div>
                <div className="bg-[#f3f4f6] rounded-2xl rounded-bl-sm px-3 py-2">
                  <span className="flex gap-1 items-center h-4">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#9ca3af] animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#9ca3af] animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#9ca3af] animate-bounce" style={{ animationDelay: "300ms" }} />
                  </span>
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex items-end gap-1.5 ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}
              >
                {m.role === "assistant" && (
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#00b386] to-[#00d4a0] flex items-center justify-center text-white text-[9px] font-bold shrink-0 mb-0.5">
                    AI
                  </div>
                )}
                <div
                  className={`max-w-[82%] px-3 py-2 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-[#00b386] text-white rounded-br-sm"
                      : "bg-[#f3f4f6] text-[#1a1a1a] rounded-bl-sm"
                  }`}
                >
                  {m.role === "assistant" && m.content === "" ? (
                    <span className="flex gap-1 items-center h-4">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#9ca3af] animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#9ca3af] animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#9ca3af] animate-bounce" style={{ animationDelay: "300ms" }} />
                    </span>
                  ) : m.content}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Quick action chips */}
          {!loading && (
            <div className="shrink-0 px-3 pb-2 flex gap-1.5 overflow-x-auto no-scrollbar">
              {QUICK_ACTIONS.map((a) => (
                <button
                  key={a.label}
                  onClick={() => sendPrompt(a.prompt)}
                  className="shrink-0 text-[10px] px-2.5 py-1 rounded-full border border-[#e8e8e8] bg-white text-[#374151] hover:border-[#00b386] hover:text-[#00b386] hover:bg-[#f0fdf8] transition-all whitespace-nowrap"
                >
                  {a.label}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="shrink-0 border-t border-[#e8e8e8] px-3 py-2.5 flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask for picks, analysis, strategies..."
              rows={1}
              disabled={loading}
              className="flex-1 resize-none bg-[#f8f9fa] border border-[#e8e8e8] rounded-xl px-3 py-2 text-xs text-[#1a1a1a] placeholder-[#9ca3af] outline-none focus:border-[#00b386] focus:bg-white transition-colors max-h-24 overflow-y-auto no-scrollbar disabled:opacity-50"
              style={{ lineHeight: "1.5" }}
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = Math.min(el.scrollHeight, 96) + "px";
              }}
            />
            <button
              onClick={() => sendPrompt(input)}
              disabled={!input.trim() || loading}
              className="w-8 h-8 rounded-xl bg-[#00b386] text-white flex items-center justify-center hover:bg-[#009e76] transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-14 h-14 rounded-full bg-[#00b386] text-white shadow-lg hover:bg-[#009e76] hover:shadow-xl transition-all flex items-center justify-center relative"
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#e84040] border-2 border-white text-white text-[8px] font-bold flex items-center justify-center">
              AI
            </span>
          </>
        )}
      </button>
    </div>
  );
}
