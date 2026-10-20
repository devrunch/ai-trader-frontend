// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChatMessage } from "./ChatMessage";
import type { ChatTradeResult } from "@/lib/api";

/**
 * The card exists so a trader can read the trade without reading a paragraph,
 * and so a turn that never computed the geometry cannot show numbers anyway.
 *
 * The tests that matter are the refusals: a rejected setup must say so in
 * words, and an option must not display price levels as if its premium were a
 * price.
 */

const base: ChatTradeResult = {
  symbol: "NIFTY1!",
  interval: "1d",
  direction: "BUY",
  verdict: "passes_every_gate",
  entry: 22894,
  stop: 22806.4,
  target: 23069.2,
  last_price: 22895.2,
  risk_per_unit: 87.6,
  reward_per_unit: 175.2,
  reward_risk: 2.0,
  risk_pct_of_entry: 0.38,
  atr: 277.7,
  stop_in_atr: 1.0,
  how_stop_was_placed: "1.0x ATR floor",
  target_source: "next touched level",
  gates: [],
};

function show(trade: Partial<ChatTradeResult>) {
  render(
    <ChatMessage
      message={{
        role: "assistant",
        content: "NIFTY1! - no trade",
        results: { trade: { ...base, ...trade } },
      }}
    />,
  );
}

describe("TradeCard", () => {
  it("leads with the direction and the levels in a fixed order", () => {
    show({});
    expect(screen.getByText("BUY")).toBeTruthy();
    expect(screen.getByText("Entry")).toBeTruthy();
    expect(screen.getByText("Stop")).toBeTruthy();
    expect(screen.getByText("Target")).toBeTruthy();
    expect(screen.getByText("2×")).toBeTruthy();
  });

  it("says REJECTED in words, not just in colour", () => {
    // A card that merely looks different still reads as a recommendation to
    // someone scrolling.
    show({ verdict: "rejected", rejected_because: ["quant confluence 50% < 75%"] });
    expect(screen.getByText(/REJECTED/)).toBeTruthy();
    expect(screen.getByText(/quant confluence 50%/)).toBeTruthy();
  });

  it("shows only the binding reason, not every gate", () => {
    show({
      verdict: "rejected",
      rejected_because: ["quant confluence 50% < 75%", "R:R 0.74 < 1.50"],
    });
    expect(screen.getByText(/quant confluence 50%/)).toBeTruthy();
    expect(screen.queryByText(/R:R 0.74/)).toBeNull();
  });

  it("hides the price levels for an option", () => {
    // A premium is direction, volatility and time decay fused together.
    // Printing it in the same grid as a future's levels invites exactly the
    // misreading the verdict is warning about.
    show({
      verdict: "not_applicable",
      note: "These gates measure price, and an option's premium is not price.",
    });
    expect(screen.getByText("NOT APPLICABLE")).toBeTruthy();
    expect(screen.queryByText("Entry")).toBeNull();
    expect(screen.getByText(/premium is not price/)).toBeTruthy();
  });

  it("reports risk per lot for a contract and per unit otherwise", () => {
    show({ position_size: { unit: "lots", lot_size: 65, risk_per_lot: 5694 } });
    expect(screen.getByText("5,694 / lot")).toBeTruthy();
  });

  it("never shows a position size or says anything about the account", () => {
    // It cannot see what the user trades with. The only balance available
    // belongs to a paper simulator, and every attempt to use it became a
    // claim about their finances — first as advice, then as a paragraph
    // explaining why it was not advising. Both are noise between candles.
    show({ position_size: { unit: "lots", lot_size: 65, risk_per_lot: 5694 } });
    const text = document.body.textContent ?? "";
    for (const word of ["account", "capital", "afford", "simulated", "broker"]) {
      expect(text.toLowerCase()).not.toContain(word);
    }
    expect(screen.queryByText("Size")).toBeNull();
  });

  it("says a short cannot be placed here", () => {
    show({
      direction: "SELL",
      executable_here: false,
      executable_note: "The built-in paper account is long-only. Place it at your broker.",
    });
    expect(screen.getByText(/long-only/)).toBeTruthy();
  });

  it("shows nothing at all when the turn computed no trade", () => {
    // The whole point: a turn that answered from the chart alone cannot
    // produce numbers, plausible or otherwise.
    render(<ChatMessage message={{ role: "assistant", content: "NIFTY1! - no trade", results: {} }} />);
    expect(screen.queryByText("Entry")).toBeNull();
  });

  it("keeps forex precision on the levels", () => {
    // Rounding a 1.1052 entry to 1.11 moves the stop forty pips.
    show({ symbol: "EURUSD", entry: 1.1052, stop: 1.0987, target: 1.1183 });
    expect(screen.getByText("1.1052")).toBeTruthy();
  });
});
