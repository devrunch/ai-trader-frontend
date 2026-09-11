import type { MarketOverview as Overview, MarketCue } from "@/lib/api";
import { timeAgo } from "@/lib/utils";

const GROUP_ORDER = ["us", "asia", "commodity", "currency", "volatility", "india"] as const;
const GROUP_LABEL: Record<string, string> = {
  us: "US markets", asia: "Asia", commodity: "Commodities",
  currency: "Currency", volatility: "Volatility", india: "India",
};

function pct(n: number) {
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

function CueGroup({ group, items }: { group: string; items: MarketCue[] }) {
  return (
    <div className="bg-card p-4">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono mb-2">
        {GROUP_LABEL[group] ?? group}
      </div>
      <div className="space-y-1.5">
        {items.map(c => (
          <div key={c.symbol} className="flex items-baseline justify-between gap-3" title={c.why}>
            <span className="text-sm">{c.name}</span>
            <span className="font-mono text-sm tabular-nums">
              <span className="text-muted-foreground mr-2">{c.value.toLocaleString(undefined)}</span>
              <span style={{ color: c.change_pct >= 0 ? "var(--buy)" : "var(--sell)" }}>{pct(c.change_pct)}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** The twice-daily market read: real overnight/intraday cues, a bias call
 *  derived from them, and the narrative connecting the two.
 *
 *  Every number here is fetched, never modelled -- the signals service's
 *  own rule (see global_cues.py). The LLM writes only the narrative. This
 *  is a SNAPSHOT, not live, so the generated-at stamp is shown rather than
 *  left to imply the numbers are current. */
export function MarketOverview({ overview }: { overview: Overview }) {
  const mr = overview.marketRead;
  const biasColor =
    mr.bias === "positive" ? "var(--buy)" : mr.bias === "negative" ? "var(--sell)" : "var(--muted-foreground)";

  const grouped = GROUP_ORDER
    .map(g => ({ group: g as string, items: overview.globalCues.filter(c => c.group === g) }))
    .filter(g => g.items.length > 0);

  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <h2 className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">Market overview</h2>
        <span className="text-[10px] text-muted-foreground font-mono" title={overview.generatedAt}>
          snapshot · {timeAgo(overview.generatedAt)}
        </span>
      </div>

      {grouped.length > 0 && (
        <div className="grid gap-px bg-border border border-border sm:grid-cols-2 lg:grid-cols-3">
          {grouped.map(({ group, items }) => <CueGroup key={group} group={group} items={items} />)}
        </div>
      )}

      <div className="border border-border bg-card p-4">
        <div className="flex items-center gap-3 flex-wrap mb-2">
          <span className="px-2.5 py-1 text-xs font-extrabold" style={{ background: biasColor, color: "#0b0e14" }}>
            {mr.label}
          </span>
          <span className="text-xs text-muted-foreground font-mono">confidence: {mr.confidence}</span>
        </div>
        {overview.narrative && <p className="text-sm leading-relaxed">{overview.narrative}</p>}
        {mr.notes?.length > 0 && (
          <ul className="mt-2 space-y-1">
            {mr.notes.map((n, i) => <li key={i} className="text-xs text-muted-foreground">• {n}</li>)}
          </ul>
        )}
      </div>
    </section>
  );
}
