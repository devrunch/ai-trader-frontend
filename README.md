# ai-trader-frontend

Next.js 14 trading terminal — charts, signal UI, chat with the AI analyst, paper trading. TypeScript, Tailwind.

Part of the [ai-trader](https://github.com/devrunch/ai-trader) monorepo — run via the umbrella repo's `docker compose up` for the full stack, or standalone against a running `ai-trader-api` for frontend-only work.

## What's here

| Path | Responsibility |
|---|---|
| `app/dashboard/terminal/` | The core screen — chart, search, watchlist, order ticket, signal/positions/chat panels |
| `components/` | `CandlestickChart.tsx` (KLineCharts wrapper — pan-to-load-more, right-edge snap, indicator toggling), `OrderTicket.tsx`, `terminal/*` panel components, `ui/` (shadcn primitives) |
| `lib/api/` | Typed REST client — one seam per domain, shared error handling and timeout |
| `lib/use-live-quote.ts` | Real-time price ticks — one shared `socket.io-client` connection, used for every symbol/exchange unconditionally (which vendor answers is decided server-side) |
| `lib/use-chart-layout.ts` | Persisted per-symbol chart layout (drawings, indicators) |
| `middleware.ts` | Route guarding — dashboard routes require a session cookie |

## Real-time price ticks

`useLiveQuote(symbol, exchange)` connects once (module-level singleton socket) to `ai-trader-api`'s Socket.IO gateway, emits `subscribe_symbol`/`unsubscribe_symbol` on connect and on symbol change, and returns `{ quote, connected }` — `connected` reflects the actual socket state so the UI can distinguish "no tick yet" from "the connection dropped," rather than showing an indefinite, unlabeled loading state. An immediate one-shot REST snapshot backs it up so a symbol still shows a price outside market hours (when no live tick will ever arrive), superseded the moment a real tick lands.

## Local development

```bash
cp .env.example .env.local   # NEXT_PUBLIC_API_URL, etc.
npm install
npm run dev
```

Open http://localhost:3000. Needs a reachable `ai-trader-api` — either the full stack via the umbrella repo's `docker compose up`, or a locally running `ai-trader-api` pointed at by `NEXT_PUBLIC_API_URL`.

## Testing

```bash
npx tsc --noEmit    # types
npx eslint .        # lint
npm test            # vitest
npm run build       # production build
```

## Notes

- `NEXT_PUBLIC_API_URL` is inlined into the JS bundle at `next build` time, not read at container start — a production rebuild is required whenever the API's public origin changes (handled by the umbrella repo's `deploy.sh`).
- Price-delay disclosure is exchange-conditional: NSE/BSE get genuinely real-time Kite-backed ticks; other exchanges are served via a ~15-minute-delayed yfinance poll and show a delay notice.
