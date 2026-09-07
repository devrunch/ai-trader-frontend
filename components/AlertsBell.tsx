"use client";

import { useEffect, useRef, useState } from "react";
import { getAlerts, type ApiAlert } from "@/lib/api";
import { getSocket } from "@/lib/use-live-quote";
import { timeAgo } from "@/lib/utils";

const TYPE_LABEL: Record<ApiAlert["type"], string> = {
  drift: "Drift",
  reddit_sentiment: "Reddit sentiment",
};

const MAX_SHOWN = 30;

/** Bell in the header: recent market-moving alerts from the signals
 *  service's drift-check and reddit-sentiment pipelines (see their own
 *  docs under ai-trader-signals/app/market/). Fetches the recent list on
 *  mount, then multiplexes onto the app's one shared WebSocket (getSocket,
 *  same connection useLiveQuote already opens) for live pushes -- opening
 *  a second connection just for this would duplicate the app's only
 *  socket.io client. */
export function AlertsBell() {
  const [alerts, setAlerts] = useState<ApiAlert[]>([]);
  const [open, setOpen] = useState(false);
  const [unseen, setUnseen] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    getAlerts(MAX_SHOWN).then(a => { if (alive) setAlerts(a); }).catch(() => {});

    const socket = getSocket();
    const onAlert = (alert: ApiAlert) => {
      setAlerts(prev => [alert, ...prev].slice(0, MAX_SHOWN));
      setUnseen(n => n + 1);
    };
    socket.on("alert", onAlert);
    return () => { alive = false; socket.off("alert", onAlert); };
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => { setOpen(v => !v); setUnseen(0); }}
        aria-label={unseen > 0 ? `Alerts, ${unseen} new` : "Alerts"}
        className="relative w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unseen > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[15px] h-[15px] px-[3px] rounded-full text-[9px] font-bold flex items-center justify-center"
            style={{ background: "var(--sell)", color: "#0b0e14" }}>
            {unseen > 9 ? "9+" : unseen}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto bg-card border border-border shadow-lg z-40">
          {alerts.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-muted-foreground">No alerts yet.</p>
          ) : (
            alerts.map(a => (
              <div key={a._id} className="px-4 py-3 border-b border-border last:border-b-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[9px] font-mono uppercase text-muted-foreground">{TYPE_LABEL[a.type] ?? a.type}</span>
                  <span className="text-[10px] text-muted-foreground font-mono">{timeAgo(a.createdAt)}</span>
                </div>
                <p className="text-xs font-medium leading-snug mb-1">{a.title}</p>
                {a.body && <p className="text-[11px] text-muted-foreground leading-relaxed">{a.body}</p>}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
