// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ChartTypePicker } from "./ChartTypePicker";

describe("ChartTypePicker", () => {
  it("is an icon-only trigger naming the current type in its title, closed by default", () => {
    render(<ChartTypePicker value="candles" onChange={vi.fn()} />);
    const trigger = screen.getByLabelText("Change chart type");
    expect(trigger).toHaveAttribute("title", "Chart type: Candles");
    expect(screen.queryByText("Chart Type")).not.toBeInTheDocument();
  });

  it("opens on click and lists every registered chart type", () => {
    render(<ChartTypePicker value="candles" onChange={vi.fn()} />);
    fireEvent.click(screen.getByLabelText("Change chart type"));
    for (const label of ["Candles", "Bars", "Line", "Line with Markers", "Step Line", "Area", "Baseline", "Columns"]) {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    }
  });

  it("picking a type calls onChange with its id and closes", () => {
    const onChange = vi.fn();
    render(<ChartTypePicker value="candles" onChange={onChange} />);
    fireEvent.click(screen.getByLabelText("Change chart type"));
    fireEvent.click(screen.getByRole("button", { name: "Line" }));
    expect(onChange).toHaveBeenCalledWith("line");
    expect(screen.queryByText("Chart Type")).not.toBeInTheDocument();
  });

  it("falls back to the raw id when the current value has no registered icon or label", () => {
    // "tpo" is a real ChartTypeId with no built renderer yet (see
    // chart-types/registry.ts) -- the trigger must not crash or show blank.
    render(<ChartTypePicker value="tpo" onChange={vi.fn()} />);
    const trigger = screen.getByLabelText("Change chart type");
    expect(trigger).toHaveAttribute("title", "Chart type: tpo");
    expect(screen.getByText("tpo")).toBeInTheDocument();
  });
});
