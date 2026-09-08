import { driftMovers, sentimentTopics, type ApiAlert } from "@/lib/api";
import { timeAgo } from "@/lib/utils";

const SENTIMENT_COLOR: Record<string, string> = {
  bullish: "var(--buy)",
  bearish: "var(--sell)",
  mixed: "var(--muted-foreground)",
};

/** One alert, with its real structured payload rendered rather than the
 *  flattened one-line summary the header bell shows. A drift alert knows
 *  exactly which cues moved, by how much, and what each reads across to;
 *  a sentiment alert knows the crowd's read per topic and why. All of
 *  that was already being collected and thrown away at the UI. */
function AlertRow({ alert }: { alert: ApiAlert }) {
  const movers = alert.type === "drift" ? driftMovers(alert) : [];
  const topics = alert.type === "reddit_sentiment" ? sentimentTopics(alert) : [];

  return (
    <div className="px-4 py-3">
      <div className="flex items-baseline justify-between gap-3 mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="shrink-0 px-1.5 py-0.5 text-[9px] font-mono uppercase border border-border text-muted-foreground">
            {alert.type === "drift" ? "Drift" : "Crowd"}
          </span>
          <span className="text-sm font-medium truncate">{alert.title}</span>
        </div>
        <span className="shrink-0 text-[10px] text-muted-foreground font-mono">{timeAgo(alert.createdAt)}</span>
      </div>

      {movers.length > 0 ? (
        <div className="flex flex-col gap-1">
          {movers.map(m => (
            <div key={m.symbol} className="flex items-baseline gap-2">
              <span className="shrink-0 w-28 text-xs font-mono truncate">{m.name}</span>
              <span className="shrink-0 text-xs font-mono font-bold tabular-nums"
                style={{ color: m.pct >= 0 ? "var(--buy)" : "var(--sell)" }}>
                {m.pct >= 0 ? "+" : ""}{m.pct.toFixed(2)}%
              </span>
              {m.why && <span className="text-[11px] text-muted-foreground leading-snug truncate">{m.why}</span>}
            </div>
          ))}
        </div>
      ) : topics.length > 0 ? (
        <div className="flex flex-col gap-1">
          {topics.map(t => (
            <div key={t.topic} className="flex items-baseline gap-2">
              <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-mono font-bold"
                style={{ background: SENTIMENT_COLOR[t.sentiment], color: "#0b0e14" }}>
                {t.sentiment}
              </span>
              <span className="shrink-0 text-[11px] font-mono text-muted-foreground">{t.topic}</span>
              <span className="text-[11px] text-muted-foreground leading-snug">{t.reason}</span>
            </div>
          ))}
        </div>
      ) : (
        // No structured payload (an older alert, or a shape change upstream)
        // -- the summary line is still real, so show that rather than nothing.
        alert.body && <p className="text-[11px] text-muted-foreground leading-relaxed">{alert.body}</p>
      )}
    </div>
  );
}

export function AlertsSection({ alerts }: { alerts: ApiAlert[] }) {
  if (alerts.length === 0) return null;
  return (
    <section className="space-y-2">
      <h2 className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">Alerts</h2>
      <div className="border border-border bg-card divide-y divide-border">
        {alerts.map(a => <AlertRow key={a._id} alert={a} />)}
      </div>
    </section>
  );
}
