// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useIsMobile } from "./use-is-mobile";

function mockMatchMedia(initialMatches: boolean) {
  const listeners: ((e: MediaQueryListEvent) => void)[] = [];
  const mql = {
    matches: initialMatches,
    media: "(max-width: 1023px)",
    addEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => listeners.push(cb),
    removeEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => {
      const i = listeners.indexOf(cb);
      if (i >= 0) listeners.splice(i, 1);
    },
  };
  window.matchMedia = vi.fn().mockReturnValue(mql);
  return {
    fire(matches: boolean) {
      mql.matches = matches;
      listeners.forEach((cb) => cb({ matches } as MediaQueryListEvent));
    },
    listenerCount: () => listeners.length,
  };
}

describe("useIsMobile", () => {
  afterEach(() => vi.restoreAllMocks());

  it("resolves to the real matchMedia result after mount, not a guessed default", () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it("resolves to false when the viewport is wide", () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it("updates live when the viewport crosses the breakpoint", () => {
    const m = mockMatchMedia(false);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    act(() => m.fire(true));
    expect(result.current).toBe(true);
  });

  it("removes its resize listener on unmount", () => {
    const m = mockMatchMedia(false);
    const { unmount } = renderHook(() => useIsMobile());
    expect(m.listenerCount()).toBe(1);
    unmount();
    expect(m.listenerCount()).toBe(0);
  });
});
