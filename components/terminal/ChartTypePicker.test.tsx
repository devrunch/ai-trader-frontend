// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ChartTypePicker } from "./ChartTypePicker";

describe("ChartTypePicker", () => {
  it("shows the current type's label on the trigger, closed by default", () => {
    render(<ChartTypePicker value="candles" onChange={vi.fn()} />);
    expect(screen.getByText("Candles")).toBeInTheDocument();
    expect(screen.queryByText("Line")).not.toBeInTheDocument();
  });

  it("opens on click and lists every registered chart type", () => {
    render(<ChartTypePicker value="candles" onChange={vi.fn()} />);
    fireEvent.click(screen.getByTitle("Change chart type"));
    for (const label of ["Candles", "Line", "Area"]) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
  });

  it("picking a type calls onChange with its id and closes", () => {
    const onChange = vi.fn();
    render(<ChartTypePicker value="candles" onChange={onChange} />);
    fireEvent.click(screen.getByTitle("Change chart type"));
    fireEvent.click(screen.getByRole("button", { name: "Line" }));
    expect(onChange).toHaveBeenCalledWith("line");
    expect(screen.queryByText("Chart Type")).not.toBeInTheDocument();
  });

  it("falls back to the raw id when the current value has no registered label", () => {
    // "tpo" is a real ChartTypeId with no built renderer yet (see
    // chart-types/registry.ts) -- the trigger must not crash or show blank.
    render(<ChartTypePicker value="tpo" onChange={vi.fn()} />);
    expect(screen.getByText("tpo")).toBeInTheDocument();
  });
});
