// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MobileBottomTabBar } from "./MobileBottomTabBar";

describe("MobileBottomTabBar", () => {
  it("renders all 5 tabs", () => {
    render(<MobileBottomTabBar active="chart" onChange={() => {}} />);
    for (const label of ["Chart", "Signal", "Trade", "Positions", "Chat"]) {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    }
  });

  it("calls onChange with the tapped tab's key", () => {
    const onChange = vi.fn();
    render(<MobileBottomTabBar active="chart" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Chat" }));
    expect(onChange).toHaveBeenCalledWith("chat");
  });

  it("shows a text label only on the active tab", () => {
    render(<MobileBottomTabBar active="signal" onChange={() => {}} />);
    const signalButton = screen.getByRole("button", { name: "Signal" });
    expect(signalButton.querySelector("span:not(.sr-only)")).not.toBeNull();
    const chatButton = screen.getByRole("button", { name: "Chat" });
    expect(chatButton.querySelector("span:not(.sr-only)")).toBeNull();
  });
});
