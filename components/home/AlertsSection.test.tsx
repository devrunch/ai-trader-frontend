// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AlertsSection } from "./AlertsSection";
import type { ApiAlert } from "@/lib/api";

function alert(over: Partial<ApiAlert> = {}): ApiAlert {
  return {
    _id: "x1", type: "drift", title: "Gold +1.20% in the last hour",
    body: "Gold +1.20% (Risk-off gauge)", symbols: ["GC=F"], data: {},
    createdAt: new Date().toISOString(), ...over,
  };
}

describe("AlertsSection", () => {
  it("renders nothing at all when there are no alerts", () => {
    const { container } = render(<AlertsSection alerts={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows each drift mover's move and what it reads across to", () => {
    render(<AlertsSection alerts={[alert({
      data: { moved: [{ symbol: "^IXIC", name: "NASDAQ", why: "US tech close", pct: 1.95, value: 26506 }] },
    })]} />);
    expect(screen.getByText("NASDAQ")).toBeInTheDocument();
    expect(screen.getByText("+1.95%")).toBeInTheDocument();
    expect(screen.getByText("US tech close")).toBeInTheDocument();
  });

  it("shows a negative move with its sign", () => {
    render(<AlertsSection alerts={[alert({
      data: { moved: [{ symbol: "GC=F", name: "Gold", why: "Risk-off gauge", pct: -0.82, value: 4476 }] },
    })]} />);
    expect(screen.getByText("-0.82%")).toBeInTheDocument();
  });

  it("shows per-topic crowd sentiment with its reasoning", () => {
    render(<AlertsSection alerts={[alert({
      type: "reddit_sentiment", title: "Reddit sentiment",
      data: { topics: [{ topic: "global_macro", sentiment: "bearish", reason: "Gold bulls fading." }] },
    })]} />);
    expect(screen.getByText("bearish")).toBeInTheDocument();
    expect(screen.getByText("global_macro")).toBeInTheDocument();
    expect(screen.getByText("Gold bulls fading.")).toBeInTheDocument();
  });

  it("falls back to the summary line when the payload has no structure", () => {
    // An older alert, or an upstream shape change -- the summary is still
    // real, so it renders rather than showing an empty row.
    render(<AlertsSection alerts={[alert({ data: {} })]} />);
    expect(screen.getByText("Gold +1.20% (Risk-off gauge)")).toBeInTheDocument();
  });

  it("does not crash when the payload is the wrong shape entirely", () => {
    render(<AlertsSection alerts={[alert({ data: { moved: "not-an-array" } })]} />);
    expect(screen.getByText(/Gold \+1.20% in the last hour/)).toBeInTheDocument();
  });
});
