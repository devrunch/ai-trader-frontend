import type { ApiNewsItem } from "@/lib/api";
import { timeAgo } from "@/lib/utils";

/** One headline: sentiment badge, and real per-stock impact -- not a
 *  keyword-matched ticker chip, see the signals-side news.py's own
 *  _analyze_impacts. Silent when the analysis genuinely found nothing (most
 *  headlines don't move a tradeable instrument); an explicit note only when
 *  the analysis itself couldn't run at all, since that's the one case
 *  worth flagging. Shared by the Signals > News tab and the Home page --
 *  same headline, same impacts, same rendering either place it shows up. */
export function NewsArticleCard({ article: n }: { article: ApiNewsItem }) {
  const col = n.sentiment === "POSITIVE" ? "var(--buy)" : n.sentiment === "NEGATIVE" ? "var(--sell)" : "var(--muted-foreground)";
  return (
    <a href={n.url} target="_blank" rel="noreferrer"
      className="block px-4 py-3.5 hover:bg-secondary/40 transition-colors">
      <div className="flex items-start justify-between gap-3 mb-1.5">
        <h3 className="text-sm font-medium leading-snug">{n.headline}</h3>
        <span className="shrink-0 px-1.5 py-0.5 text-[9px] font-bold uppercase" style={{ background: col, color: "#0b0e14" }}>{n.sentiment}</span>
      </div>
      {n.description && <p className="text-xs text-muted-foreground leading-relaxed mb-2 line-clamp-2">{n.description}</p>}
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono mb-1">
        <span>{n.source}</span><span>·</span><span>{timeAgo(n.publishedAt)}</span>
      </div>
      {n.impacts === null ? (
        <p className="text-[10px] text-muted-foreground/70 italic">Stock-impact analysis unavailable for this headline</p>
      ) : n.impacts.length > 0 ? (
        <div className="flex flex-col gap-1 mt-1.5">
          {n.impacts.map((imp, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <span className="shrink-0 px-1 py-0.5 text-[9px] font-mono text-muted-foreground border border-border">
                {imp.assetClass}
              </span>
              <span className="shrink-0 flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono font-bold"
                style={{ background: imp.direction === "up" ? "var(--buy)" : "var(--sell)", color: "#0b0e14" }}>
                {imp.symbol} {imp.direction === "up" ? "↑" : "↓"}
              </span>
              <span className="text-[11px] text-muted-foreground leading-snug">{imp.reason}</span>
            </div>
          ))}
        </div>
      ) : null}
    </a>
  );
}
