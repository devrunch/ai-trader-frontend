// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MobileBottomTabBar } from "./MobileBottomTabBar";

describe("MobileBottomTabBar", () => {
  it("renders all 4 visible tabs (Signal hidden)", () => {
    render(<MobileBottomTabBar active="chart" onChange={() => {}} />);
    for (const label of ["Chart", "Trade", "Positions", "Chat"]) {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    }
    expect(screen.queryByRole("button", { name: "Signal" })).not.toBeInTheDocument();
  });

  it("calls onChange with the tapped tab's key", () => {
    const onChange = vi.fn();
    render(<MobileBottomTabBar active="chart" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Chat" }));
    expect(onChange).toHaveBeenCalledWith("chat");
  });

  it("shows a text label only on the active tab", () => {
    render(<MobileBottomTabBar active="trade" onChange={() => {}} />);
    const tradeButton = screen.getByRole("button", { name: "Trade" });
    expect(tradeButton.querySelector("span:not(.sr-only)")).not.toBeNull();
    const chatButton = screen.getByRole("button", { name: "Chat" });
    expect(chatButton.querySelector("span:not(.sr-only)")).toBeNull();
  });
});
