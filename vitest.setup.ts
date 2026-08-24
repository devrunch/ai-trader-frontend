// Extends vitest's `expect` with the DOM matchers (.toBeInTheDocument(),
// .toBeEmptyDOMElement(), ...) the mobile terminal component tests use --
// this repo had no React component tests before those, so nothing here
// registered these until now.
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// This repo doesn't run vitest with `globals: true` (every existing test
// explicitly imports describe/it/expect/vi), so React Testing Library's own
// auto-cleanup -- which relies on detecting an ambient global `afterEach` --
// never registers on its own. Without this, a component rendered in one
// test would still be in the jsdom document when the next test's `render()`
// runs, silently doubling up matches like `getByRole`.
afterEach(() => cleanup());

// jsdom (unlike a real browser) doesn't implement matchMedia -- lightweight-charts'
// device-pixel-ratio observer (via the fancy-canvas package) calls it
// unconditionally at chart construction time. Only defined when `window`
// exists (node-environment tests have no window at all) and only when it's
// actually missing (happy-dom does implement it).
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }) as unknown as MediaQueryList;
}
