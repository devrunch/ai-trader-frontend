// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { IntervalPicker } from "./IntervalPicker";

describe("IntervalPicker", () => {
  it("shows the current interval on the trigger, closed by default", () => {
    render(<IntervalPicker value="5m" onChange={vi.fn()} />);
    expect(screen.getByText("5m")).toBeInTheDocument();
    expect(screen.queryByText("Custom")).not.toBeInTheDocument();
  });

  it("opens on click and lists all 6 native presets", () => {
    render(<IntervalPicker value="5m" onChange={vi.fn()} />);
    fireEvent.click(screen.getByTitle("Change candle interval"));
    for (const preset of ["1m", "5m", "15m", "30m", "1h", "1d"]) {
      expect(screen.getAllByText(preset).length).toBeGreaterThan(0);
    }
  });

  it("picking a preset calls onChange with it and closes", () => {
    const onChange = vi.fn();
    render(<IntervalPicker value="5m" onChange={onChange} />);
    fireEvent.click(screen.getByTitle("Change candle interval"));
    fireEvent.click(screen.getByRole("button", { name: "15m" }));
    expect(onChange).toHaveBeenCalledWith("15m");
    expect(screen.queryByLabelText("Custom interval")).not.toBeInTheDocument();
  });

  it("applying a valid custom interval calls onChange with the normalised value", () => {
    const onChange = vi.fn();
    render(<IntervalPicker value="5m" onChange={onChange} />);
    fireEvent.click(screen.getByTitle("Change candle interval"));
    fireEvent.change(screen.getByLabelText("Custom interval"), { target: { value: " 3M " } });
    fireEvent.click(screen.getByText("Apply"));
    expect(onChange).toHaveBeenCalledWith("3m");
  });

  it("applying an unparseable custom interval shows an error and never calls onChange", () => {
    const onChange = vi.fn();
    render(<IntervalPicker value="5m" onChange={onChange} />);
    fireEvent.click(screen.getByTitle("Change candle interval"));
    fireEvent.change(screen.getByLabelText("Custom interval"), { target: { value: "banana" } });
    fireEvent.click(screen.getByText("Apply"));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText(/number plus m\/h\/d\/w/)).toBeInTheDocument();
  });

  it("Enter in the custom field applies it too", () => {
    const onChange = vi.fn();
    render(<IntervalPicker value="5m" onChange={onChange} />);
    fireEvent.click(screen.getByTitle("Change candle interval"));
    const input = screen.getByLabelText("Custom interval");
    fireEvent.change(input, { target: { value: "2h" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith("2h");
  });

  it("flags the current value as the active custom interval when it isn't a preset", () => {
    render(<IntervalPicker value="3m" onChange={vi.fn()} />);
    fireEvent.click(screen.getByTitle("Change candle interval"));
    expect(screen.getByText(/current: 3m/)).toBeInTheDocument();
  });
});
