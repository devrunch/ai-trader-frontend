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
