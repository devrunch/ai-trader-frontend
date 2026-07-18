"use client";

import { useEffect, useRef, useState } from "react";

type Message = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "What stocks are trending today?",
  "Explain call vs put options",
  "Best mutual funds for SIP in 2025?",
  "How to read a candlestick chart?",
];

const SendIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const BotIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    <circle cx="12" cy="16" r="1" fill="currentColor" />
  </svg>
);

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const updated: Message[] = [...messages, { role: "user", content: trimmed }];
    setMessages(updated);
    setInput("");
    setLoading(true);

    const apiMessages = updated.map((m) => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
      });

      if (!res.ok || !res.body) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Something went wrong. Please try again." },
        ]);
        return;
      }

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let aiText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        aiText += decoder.decode(value, { stream: true });
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: "assistant", content: aiText },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Network error. Please check your connection." },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  const isEmpty = messages.length === 0;

  return (
    <div className="h-full flex flex-col">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto no-scrollbar py-6">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full gap-8 text-center px-4">
            <div>
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#00b386] to-[#00d4a0] flex items-center justify-center text-white font-bold text-xl mx-auto mb-4">
                AI
              </div>
              <h2 className="text-xl font-bold text-[#1a1a1a] mb-1">AI Trading Assistant</h2>
              <p className="text-[#6b7280] text-sm max-w-sm">
                Ask me about stocks, F&amp;O strategies, mutual funds, or market insights.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-left px-4 py-3 rounded-xl border border-[#e8e8e8] bg-white text-sm text-[#374151] hover:border-[#00b386] hover:text-[#00b386] hover:bg-[#f0fdf8] transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 max-w-2xl mx-auto w-full">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex items-end gap-2 ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}
              >
                {m.role === "assistant" && (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#00b386] to-[#00d4a0] flex items-center justify-center text-white shrink-0 mb-0.5">
                    <BotIcon />
                  </div>
                )}
                <div
                  className={`max-w-[78%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-[#00b386] text-white rounded-br-sm"
                      : "bg-white border border-[#e8e8e8] text-[#1a1a1a] rounded-bl-sm"
                  } ${m.role === "assistant" && m.content === "" ? "min-w-[60px]" : ""}`}
                >
                  {m.role === "assistant" && m.content === "" ? (
                    <span className="flex gap-1 items-center h-5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#9ca3af] animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#9ca3af] animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#9ca3af] animate-bounce" style={{ animationDelay: "300ms" }} />
                    </span>
                  ) : (
                    m.content
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input bar */}
      <div className="shrink-0 border-t border-[#e8e8e8] bg-white py-3">
        <div className="max-w-2xl mx-auto flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about stocks, strategies, or market trends..."
            rows={1}
            disabled={loading}
            className="flex-1 resize-none bg-[#f8f9fa] border border-[#e8e8e8] rounded-xl px-4 py-2.5 text-sm text-[#1a1a1a] placeholder-[#9ca3af] outline-none focus:border-[#00b386] focus:bg-white transition-colors max-h-32 overflow-y-auto no-scrollbar disabled:opacity-50"
            style={{ lineHeight: "1.5" }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = Math.min(el.scrollHeight, 128) + "px";
            }}
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || loading}
            className="w-10 h-10 rounded-xl bg-[#00b386] text-white flex items-center justify-center hover:bg-[#009e76] transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            <SendIcon />
          </button>
        </div>
        <p className="text-center text-[10px] text-[#b0b0b0] mt-2">
          AI can make mistakes. Verify important financial decisions independently.
        </p>
      </div>
    </div>
  );
}
