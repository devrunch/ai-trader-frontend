"use client";

import { useState, useEffect } from "react";
import { errorMessage, getMarketNews, type ApiNewsItem } from "@/lib/api";
import { ErrorState } from "@/components/ErrorState";
import { NewsArticleCard } from "@/components/news/NewsArticleCard";
import { AssetClassFilterBar, countByAssetClass, type AssetClassFilter } from "@/components/news/AssetClassFilterBar";

export default function HomePage() {
  const [news, setNews] = useState<ApiNewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [assetClassFilter, setAssetClassFilter] = useState<AssetClassFilter>("All");

  useEffect(() => {
    let alive = true;
    getMarketNews(undefined, 25)
      .then(r => { if (alive) { setNews(r.articles); setError(""); } })
      .catch(e => { if (alive) setError(errorMessage(e)); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [retry]);

  // Real per-stock impact only -- see NewsArticleCard's own docs on why an
  // article with impacts: null (couldn't analyze) is kept separate from one
  // with impacts: [] (analyzed, genuinely nothing tradeable in it). Both are
  // excluded from a page whose whole point is "what actually moves a stock",
  // but for different reasons -- one is a gap, the other is a real answer.
  const impactAnalysisDown = news.length > 0 && news.every(n => n.impacts === null);
  const impactNews = news.filter(n => n.impacts && n.impacts.length > 0);
  const assetClassCounts = countByAssetClass(impactNews);
  const filteredNews = assetClassFilter === "All" ? impactNews
    : impactNews.filter(n => n.impacts?.some(imp => imp.assetClass === assetClassFilter));

  return (
    <div className="h-full overflow-y-auto no-scrollbar py-5">
      <div className="max-w-[1100px] space-y-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Home</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Today&apos;s headlines with a real, per-stock impact -- not a keyword match. Divided by market.
          </p>
        </div>

        {loading ? (
          <div className="p-10 text-center text-muted-foreground text-sm">Loading news…</div>
        ) : error ? (
          <ErrorState message={error} onRetry={() => { setLoading(true); setRetry(n => n + 1); }} />
        ) : impactAnalysisDown ? (
          <div className="border border-border bg-card p-10 text-center">
            <p className="text-sm font-medium mb-1">Impact analysis is unavailable right now</p>
            <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
              The news feed loaded, but couldn&apos;t be analyzed for real stock impact this time. Try again shortly.
            </p>
          </div>
        ) : (
          <>
            <AssetClassFilterBar counts={assetClassCounts} value={assetClassFilter} onChange={setAssetClassFilter} />

            {filteredNews.length === 0 ? (
              <div className="border border-border bg-card p-10 text-center">
                <p className="text-sm font-medium mb-1">No high-impact headlines right now</p>
                <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                  Most headlines don&apos;t move a tradeable stock or instrument -- an empty list here is the
                  honest answer, not a broken feed.
                </p>
              </div>
            ) : (
              <div className="border border-border bg-card divide-y divide-border">
                {filteredNews.map(n => <NewsArticleCard key={n.id} article={n} />)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
