// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { NewsArticleCard } from "./NewsArticleCard";
import type { ApiNewsItem } from "@/lib/api";

function article(over: Partial<ApiNewsItem> = {}): ApiNewsItem {
  return {
    id: "a1",
    headline: "Gold rallies on Fed bets",
    description: "Traders price in a cut",
    source: "Reuters",
    url: "https://example.com/a",
    publishedAt: new Date().toISOString(),
    sentiment: "POSITIVE",
    sentimentScore: 0.9,
    sentimentAvailable: true,
    impacts: [],
    ...over,
  };
}

describe("NewsArticleCard", () => {
  it("shows the real sentiment when it was actually scored", () => {
    render(<NewsArticleCard article={article()} />);
    expect(screen.getByText("POSITIVE")).toBeInTheDocument();
  });

  it("says Unscored rather than NEUTRAL when scoring was unavailable", () => {
    // The server sends NEUTRAL/0 for an unscored article. Rendering that
    // label would claim FinBERT read the headline as neutral when nothing
    // scored it at all -- the exact bug a real HF outage exposed.
    render(<NewsArticleCard article={article({ sentiment: "NEUTRAL", sentimentScore: 0, sentimentAvailable: false })} />);
    expect(screen.getByText(/unscored/i)).toBeInTheDocument();
    expect(screen.queryByText("NEUTRAL")).not.toBeInTheDocument();
  });

  it("still shows a genuine NEUTRAL reading", () => {
    render(<NewsArticleCard article={article({ sentiment: "NEUTRAL", sentimentScore: 0, sentimentAvailable: true })} />);
    expect(screen.getByText("NEUTRAL")).toBeInTheDocument();
    expect(screen.queryByText(/unscored/i)).not.toBeInTheDocument();
  });

  it("flags impacts that could not be analyzed, but stays silent on a real empty result", () => {
    const { unmount } = render(<NewsArticleCard article={article({ impacts: null })} />);
    expect(screen.getByText(/impact analysis unavailable/i)).toBeInTheDocument();
    unmount();

    render(<NewsArticleCard article={article({ impacts: [] })} />);
    expect(screen.queryByText(/impact analysis unavailable/i)).not.toBeInTheDocument();
  });

  it("renders each impact with its asset class, symbol and reason", () => {
    render(<NewsArticleCard article={article({
      impacts: [{ symbol: "XAUUSD", direction: "up", assetClass: "FOREX", reason: "Weaker dollar lifts gold." }],
    })} />);
    expect(screen.getByText("FOREX")).toBeInTheDocument();
    expect(screen.getByText(/XAUUSD/)).toBeInTheDocument();
    expect(screen.getByText("Weaker dollar lifts gold.")).toBeInTheDocument();
  });
});
