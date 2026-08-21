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
    setupFiles: ["vitest-canvas-mock"],
  },
});
