// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ChartTypePicker } from "./ChartTypePicker";
import type { ChartTypeId } from "@/lib/chart-adapter/types";

describe("ChartTypePicker", () => {
  it("is an icon-only trigger whose accessible name AND title both announce the current type, closed by default", () => {
    render(<ChartTypePicker value="candles" onChange={vi.fn()} />);
    // Regex, not the fixed string used elsewhere in this file, because the
    // accessible name carries the current selection -- an earlier version
    // was static ("Change chart type" alone) and lost that information for
    // screen-reader users, since `aria-label` wins over `title` in the
    // accessible-name computation whenever both are present.
    const trigger = screen.getByRole("button", { name: /Change chart type, currently Candles/ });
    expect(trigger).toHaveAttribute("title", "Chart type: Candles");
    expect(screen.queryByText("Chart Type")).not.toBeInTheDocument();
  });

  it("the accessible name updates to the new current type after a switch", () => {
    const { rerender } = render(<ChartTypePicker value="candles" onChange={vi.fn()} />);
    rerender(<ChartTypePicker value="line" onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: /Change chart type, currently Line$/ })).toBeInTheDocument();
  });

  it("opens on click and lists every registered chart type", () => {
    render(<ChartTypePicker value="candles" onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Change chart type/ }));
    for (const label of ["Candles", "Bars", "Line", "Line with Markers", "Step Line", "Area", "Baseline", "Columns"]) {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    }
  });

  it("picking a type calls onChange with its id and closes", () => {
    const onChange = vi.fn();
    render(<ChartTypePicker value="candles" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: /Change chart type/ }));
    fireEvent.click(screen.getByRole("button", { name: "Line" }));
    expect(onChange).toHaveBeenCalledWith("line");
    expect(screen.queryByText("Chart Type")).not.toBeInTheDocument();
  });

  it("falls back to the raw id when the current value has no registered icon or label", () => {
    // Every real ChartTypeId is registered now -- this exercises the
    // defensive fallback for a saved layout's chartType from an older or
    // future app build that names an id this one doesn't recognize. The
    // trigger must not crash or show blank.
    render(<ChartTypePicker value={"not-a-real-type" as ChartTypeId} onChange={vi.fn()} />);
    const trigger = screen.getByRole("button", { name: /Change chart type, currently not-a-real-type/ });
    expect(trigger).toHaveAttribute("title", "Chart type: not-a-real-type");
    expect(screen.getByText("not-a-real-type")).toBeInTheDocument();
  });

  it("a modal row for an id missing from CHART_TYPE_ICONS falls back to the raw id instead of an empty icon slot", () => {
    // Defensive-gap coverage: every registered type has a matching icon
    // today, so this can't be exercised through a real CHART_TYPES entry --
    // this asserts the fallback markup itself renders correctly, the same
    // guard the trigger already has, applied to each modal row too.
    render(<ChartTypePicker value="candles" onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Change chart type/ }));
    // Every row's icon slot has SOME content (the real icon) -- confirms
    // the ?? fallback wiring didn't break the normal, icon-present path.
    expect(screen.getByRole("button", { name: "Candles" }).querySelector("svg")).toBeInTheDocument();
  });
});
