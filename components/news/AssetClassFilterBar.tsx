import type { NewsAssetClass } from "@/lib/api";

export type AssetClassFilter = "All" | NewsAssetClass;

/** Fixed order, not derived from whatever happens to be in today's news --
 *  this app's own real exchange set (see ai-trader-api's market.controller.ts
 *  EXCHANGES) plus CRYPTO/OTHER, so the filter row's shape doesn't jump
 *  around as headlines come and go. */
export const ASSET_CLASSES: NewsAssetClass[] = ["NASDAQ", "NYSE", "FOREX", "CRYPTO", "NSE", "BSE", "MCX", "OTHER"];

/** Divides today's impacts by market/asset class -- NSE, BSE, NASDAQ, NYSE,
 *  FOREX, MCX, plus CRYPTO (informational; this app has no crypto trading
 *  integration) and OTHER, the honest fallback the signals-side analysis
 *  uses when nothing real fits. A count of 0 still shows the chip; it just
 *  does nothing useful to click. */
export function AssetClassFilterBar({ counts, value, onChange }: {
  counts: Partial<Record<NewsAssetClass, number>>;
  value: AssetClassFilter;
  onChange: (v: AssetClassFilter) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <button onClick={() => onChange("All")}
        className="px-2.5 py-1 text-[10px] font-mono font-medium border transition-colors"
        style={value === "All"
          ? { background: "var(--foreground)", color: "var(--background)", borderColor: "var(--foreground)" }
          : { borderColor: "var(--border)", color: "var(--muted-foreground)" }}>
        All markets
      </button>
      {ASSET_CLASSES.map(cls => (
        <button key={cls} onClick={() => onChange(cls)}
          disabled={!counts[cls]}
          className="px-2.5 py-1 text-[10px] font-mono font-medium border transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          style={value === cls
            ? { background: "var(--foreground)", color: "var(--background)", borderColor: "var(--foreground)" }
            : { borderColor: "var(--border)", color: "var(--muted-foreground)" }}>
          {cls} <span className="opacity-60">{counts[cls] ?? 0}</span>
        </button>
      ))}
    </div>
  );
}

/** Per-article, not per-impact -- an article with two NSE-tagged impacts
 *  counts once toward "how many headlines touch NSE today", not two. */
export function countByAssetClass(articles: { impacts?: { assetClass: NewsAssetClass }[] | null }[]): Partial<Record<NewsAssetClass, number>> {
  const counts: Partial<Record<NewsAssetClass, number>> = {};
  for (const a of articles) {
    const classesHere = new Set((a.impacts ?? []).map(imp => imp.assetClass));
    for (const cls of classesHere) counts[cls] = (counts[cls] ?? 0) + 1;
  }
  return counts;
}
