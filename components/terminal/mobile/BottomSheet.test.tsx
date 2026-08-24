// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BottomSheet } from "./BottomSheet";

describe("BottomSheet", () => {
  it("renders nothing when closed", () => {
    const { container } = render(
      <BottomSheet open={false} onClose={() => {}} ariaLabel="Test sheet"><p>content</p></BottomSheet>
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders its children when open", () => {
    render(<BottomSheet open onClose={() => {}} ariaLabel="Test sheet"><p>content</p></BottomSheet>);
    expect(screen.getByText("content")).toBeInTheDocument();
  });

  it("calls onClose on backdrop click but not on content click", () => {
    const onClose = vi.fn();
    render(<BottomSheet open onClose={onClose} ariaLabel="Test sheet"><p>content</p></BottomSheet>);
    fireEvent.click(screen.getByText("content"));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("dialog"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose on Escape", () => {
    const onClose = vi.fn();
    render(<BottomSheet open onClose={onClose} ariaLabel="Test sheet"><p>content</p></BottomSheet>);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });
});
