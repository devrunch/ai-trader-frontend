/**
 * The API client, by domain.
 *
 * This was one 769-line file holding every endpoint and every type in the
 * product. It is now a module per domain, re-exported here so that
 * `import { getQuote } from "@/lib/api"` keeps working exactly as before — the
 * split changed no call site.
 *
 * `client.ts` is the only file that talks to `fetch`. Everything else describes
 * one domain's endpoints and the shapes they return, so a change to timeout,
 * error mapping or credentials has one home rather than eighty.
 */
export * from "./client";
export * from "./signals";
export * from "./brief";
export * from "./chat";
export * from "./charts";
// `paper` describes the account and reads it; `paper-actions` changes it.
export * from "./paper";
export * from "./paper-actions";
export * from "./market";
export * from "./watchlist";
export * from "./risk";
export * from "./admin";
export * from "./indicators";
