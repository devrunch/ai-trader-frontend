

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/** Default per-request budget. The chat route is allowed longer (see chatWithAI). */
const DEFAULT_TIMEOUT_MS = 20_000;

/**
 * An error that carries the HTTP status and the message the API actually wrote.
 *
 * The old code threw `${res.status} ${res.statusText}` and discarded the body,
 * so a user who tried to overspend saw "400 Bad Request" instead of
 * "Insufficient balance. Required ₹9,000.00, available ₹500.00" — a message the
 * backend had gone to the trouble of composing.
 */
export class ApiError extends Error {
  readonly status: number;
  /** True when the message came from the API body rather than our fallback table. */
  readonly fromServer: boolean;

  constructor(message: string, status: number, fromServer = false) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fromServer = fromServer;
  }
}

/**
 * A written sentence for every status. Never a status code, never a status text.
 *
 * Exported so the streaming client shares this table rather than growing a
 * second one that says the same things differently.
 */
export function humanMessage(status: number): string {
  if (status === 0)   return "Can't reach the server. Check your connection and try again.";
  if (status === 401) return "Your session has expired — sign in again to continue.";
  if (status === 403) return "You don't have access to that.";
  if (status === 404) return "We couldn't find that.";
  if (status === 408) return "That took too long. Try again.";
  if (status === 429) return "Too many requests — give it a moment and try again.";
  if (status >= 500)  return "Something went wrong on our side. Try again in a moment.";
  return "That didn't work. Try again.";
}

/**
 * Some upstream messages name our own internals ("Signals service unavailable
 * (upstream 503)", "fetch failed"). Those are for logs, not for a user of a
 * consumer product — fall back to a written sentence instead.
 */
const INTERNAL_LEAK =
  /signals service|paper.trading|upstream|fetch failed|econnrefused|enotfound|etimedout|localhost|127\.0\.0\.1|internal server error|cannot read propert|undefined is not/i;

function pickServerMessage(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const raw = (body as { message?: unknown; error?: unknown }).message
    ?? (body as { error?: unknown }).error;
  const text = Array.isArray(raw)
    ? raw.filter(x => typeof x === "string").join(". ")
    : typeof raw === "string" ? raw : null;
  if (!text) return null;
  const trimmed = text.trim();
  if (!trimmed || INTERNAL_LEAK.test(trimmed)) return null;
  return trimmed;
}

export async function req<T>(path: string, init?: RequestInit & { timeoutMs?: number }): Promise<T> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...rest } = init ?? {};
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      credentials: "include",          // send httpOnly JWT cookie
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(timeoutMs),
      ...rest,
    });
  } catch (e) {
    // Network failure or timeout — neither produces a Response.
    const timedOut = e instanceof DOMException && (e.name === "TimeoutError" || e.name === "AbortError");
    throw new ApiError(
      timedOut ? "That took longer than expected. Try again." : humanMessage(0),
      timedOut ? 408 : 0,
    );
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const serverMessage = pickServerMessage(body);
    throw new ApiError(serverMessage ?? humanMessage(res.status), res.status, serverMessage !== null);
  }

  // 204 / empty body — a few endpoints legitimately return nothing.
  const text = await res.text();
  if (!text) return null as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiError("We got an unreadable response from the server.", res.status);
  }
}

/** Turn anything thrown by `req` (or a component) into a sentence safe to render. */
export function errorMessage(e: unknown, fallback = "That didn't work. Try again."): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error && e.message && !INTERNAL_LEAK.test(e.message)) return e.message;
  return fallback;
}
