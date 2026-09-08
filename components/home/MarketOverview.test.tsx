// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MarketOverview } from "./MarketOverview";
import type { MarketOverview as Overview } from "@/lib/api";

function overview(over: Partial<Overview> = {}): Overview {
  return {
    date: "2026-09-08",
    generatedAt: new Date().toISOString(),
    marketRead: {
      bias: "negative", label: "Weak open likely", confidence: "moderate",
      notes: ["India VIX up sharply"], us_avg_pct: -0.6, asia_avg_pct: -0.4,
    },
    globalCues: [
      { symbol: "^IXIC", name: "NASDAQ", group: "us", why: "US tech close", value: 26370.89, change_pct: -0.64, as_of: "2026-09-07" },
      { symbol: "GC=F", name: "Gold", group: "commodity", why: "Risk-off gauge", value: 4504.2, change_pct: 0.58, as_of: "2026-09-07" },
    ],
    narrative: "Global markets retreated overnight.",
    disclaimer: "Not advice.",
    ...over,
  };
}

describe("MarketOverview", () => {
  it("shows the bias call, its confidence and the narrative", () => {
    render(<MarketOverview overview={overview()} />);
    expect(screen.getByText("Weak open likely")).toBeInTheDocument();
    expect(screen.getByText(/confidence: moderate/)).toBeInTheDocument();
    expect(screen.getByText("Global markets retreated overnight.")).toBeInTheDocument();
  });

  it("groups cues under their market and signs each move", () => {
    render(<MarketOverview overview={overview()} />);
    expect(screen.getByText("US markets")).toBeInTheDocument();
    expect(screen.getByText("Commodities")).toBeInTheDocument();
    expect(screen.getByText("-0.64%")).toBeInTheDocument();
    expect(screen.getByText("+0.58%")).toBeInTheDocument();
  });

  it("marks itself a snapshot rather than implying live numbers", () => {
    // It regenerates twice a day, so presenting these as current would be
    // a lie by omission.
    render(<MarketOverview overview={overview()} />);
    expect(screen.getByText(/snapshot/)).toBeInTheDocument();
  });

  it("renders the read even when no cues came back", () => {
    render(<MarketOverview overview={overview({ globalCues: [] })} />);
    expect(screen.getByText("Weak open likely")).toBeInTheDocument();
    expect(screen.queryByText("US markets")).not.toBeInTheDocument();
  });

  it("shows the supporting notes", () => {
    render(<MarketOverview overview={overview()} />);
    expect(screen.getByText(/India VIX up sharply/)).toBeInTheDocument();
  });
});
