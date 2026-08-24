// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ResponsiveModal } from "./ResponsiveModal";

function mockViewport(isNarrow: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes("639px") ? isNarrow : false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

describe("ResponsiveModal", () => {
  afterEach(() => vi.restoreAllMocks());

  it("renders nothing when closed", () => {
    mockViewport(false);
    const { container } = render(
      <ResponsiveModal open={false} onClose={() => {}} ariaLabel="Test" maxWidthClass="max-w-lg" maxHeightClass="max-h-[76vh]">
        <p>content</p>
      </ResponsiveModal>
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("uses the centered-card chrome at desktop width", () => {
    mockViewport(false);
    render(
      <ResponsiveModal open onClose={() => {}} ariaLabel="Test" maxWidthClass="max-w-lg" maxHeightClass="max-h-[76vh]">
        <p>content</p>
      </ResponsiveModal>
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog.querySelector(".max-w-lg")).toBeTruthy();
  });

  it("drops the card chrome for full-screen below 640px", () => {
    mockViewport(true);
    render(
      <ResponsiveModal open onClose={() => {}} ariaLabel="Test" maxWidthClass="max-w-lg" maxHeightClass="max-h-[76vh]">
        <p>content</p>
      </ResponsiveModal>
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog.querySelector(".max-w-lg")).toBeNull();
  });

  it("calls onClose on backdrop click but not on content click", () => {
    mockViewport(false);
    const onClose = vi.fn();
    render(
      <ResponsiveModal open onClose={onClose} ariaLabel="Test" maxWidthClass="max-w-lg" maxHeightClass="max-h-[76vh]">
        <p>content</p>
      </ResponsiveModal>
    );
    fireEvent.click(screen.getByText("content"));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("dialog"));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
