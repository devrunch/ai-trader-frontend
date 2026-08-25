// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MobileChartToolbar } from "./MobileChartToolbar";

const baseProps = {
  symbol: "RELIANCE", exchange: "NSE", currency: "₹", ltp: 1310.5,
  onOpenSearch: vi.fn(), activeTool: "cursor", onPickTool: vi.fn(),
  period: "1D", onPickPeriod: vi.fn(), onOpenIndicators: vi.fn(),
  candleInterval: "1m", onPickInterval: vi.fn(),
  chartType: "candles" as const, onPickChartType: vi.fn(),
};

describe("MobileChartToolbar", () => {
  it("shows the symbol and price, tapping it opens search", () => {
    const onOpenSearch = vi.fn();
    render(<MobileChartToolbar {...baseProps} onOpenSearch={onOpenSearch} />);
    expect(screen.getByText("RELIANCE")).toBeInTheDocument();
    fireEvent.click(screen.getByText("RELIANCE"));
    expect(onOpenSearch).toHaveBeenCalledOnce();
  });

  it("opens the drawing-tools sheet from the pencil icon, and picking a tool calls onPickTool", () => {
    const onPickTool = vi.fn();
    render(<MobileChartToolbar {...baseProps} onPickTool={onPickTool} />);
    fireEvent.click(screen.getByLabelText("Drawing tools"));
    fireEvent.click(screen.getByTitle("Trend line"));
    expect(onPickTool).toHaveBeenCalledWith(expect.objectContaining({ key: "trendline" }));
  });

  it("calls onOpenIndicators from the Indicators icon", () => {
    const onOpenIndicators = vi.fn();
    render(<MobileChartToolbar {...baseProps} onOpenIndicators={onOpenIndicators} />);
    fireEvent.click(screen.getByLabelText("Indicators"));
    expect(onOpenIndicators).toHaveBeenCalledOnce();
  });

  it("renders every period as a tappable pill and calls onPickPeriod", () => {
    const onPickPeriod = vi.fn();
    render(<MobileChartToolbar {...baseProps} onPickPeriod={onPickPeriod} />);
    fireEvent.click(screen.getByText("1W"));
    expect(onPickPeriod).toHaveBeenCalledWith("1W");
  });
});
