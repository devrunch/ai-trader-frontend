import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    include: ["**/*.test.{ts,tsx}"],
    // klinecharts/lightweight-charts both measure text via a real canvas 2D
    // context at chart-init time -- happy-dom's own getContext("2d") is a
    // stub missing most of the API, so any test that actually calls a
    // charting library's init/createChart needs this mock in place.
    // vitest.setup.ts polyfills window.matchMedia for the same reason, under
    // jsdom specifically (see its own comment -- lightweight-charts needs
    // real getComputedStyle color normalization, which happy-dom doesn't do,
    // so LWC-creating tests run under jsdom instead; matchMedia is the one
    // thing jsdom itself doesn't implement that LWC calls unconditionally).
    setupFiles: ["vitest-canvas-mock", "./vitest.setup.ts"],
  },
});
