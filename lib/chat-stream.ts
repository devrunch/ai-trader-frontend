import {
  ApiError,
  API_BASE_URL,
  getChatTurn,
  humanMessage,
  type AgentEvent,
  type ChatResponse,
  type ChatHistoryItem,
} from "./api";

/**
 * The terminal event of a stream: everything `POST /api/signals/chat` would have
 * returned, plus the id under which the turn was recorded.
 */
export interface StreamedTurn extends ChatResponse {
  turnId?: string;
  turn_id?: string;
}

export interface ChatStreamHandlers {
  /** One step the agent took. Already a readable sentence — render it as-is. */
  onEvent?: (event: AgentEvent) => void;
  /** The finished turn. Always fires exactly once unless the stream failed. */
  onResult: (turn: StreamedTurn) => void;
  /** The stream could not complete. `message` is safe to show a user. */
  onError?: (message: string) => void;
}

/**
 * Run one agent turn, reading its progress as it happens.
 *
 * A turn can take the better part of a minute — up to six model rounds, each
 * able to trigger market-data fetches. A spinner for that long is
 * indistinguishable from a hang, which is what this replaces.
 *
 * Returns an abort function. Calling it stops the read AND, because the socket
 * closes, cancels the turn server-side: an abandoned turn should not keep
 * spending on an answer nobody will see.
 */
export function streamChat(
  args: {
    symbol: string;
    exchange: string;
    message: string;
    history: ChatHistoryItem[];
  },
  handlers: ChatStreamHandlers,
): () => void {
  const controller = new AbortController();

  void run(args, handlers, controller.signal).catch((err: unknown) => {
    // An abort is a deliberate stop, not a failure to report.
    if (controller.signal.aborted) return;
    handlers.onError?.(readableError(err));
  });

  return () => controller.abort();
}

async function run(
  args: { symbol: string; exchange: string; message: string; history: ChatHistoryItem[] },
  handlers: ChatStreamHandlers,
  signal: AbortSignal,
): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/signals/chat/stream`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify(args),
    signal,
  });

  if (!res.ok || !res.body) {
    // The server answered before streaming, so this is an ordinary error with a
    // status — a rate limit, an expired session — and deserves its real message.
    const written = await serverMessage(res);
    throw new ApiError(written || humanMessage(res.status), res.status, Boolean(written));
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result: StreamedTurn | null = null;
  let turnId: string | undefined;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      // A chunk has nothing to do with an event boundary: it may hold three
      // events, or a third of one. Keep the trailing partial for the next read.
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";

      for (const raw of parts) {
        const event = parseFrame(raw);
        if (!event) continue;

        if (event.kind === "turn_started") {
          // Captured immediately: if the connection dies later, this id is the
          // only way to find out whether the turn we already paid for finished.
          turnId = (event.detail as { turn_id?: string })?.turn_id;
          handlers.onEvent?.(event);
        } else if (event.kind === "result") {
          result = event.detail as unknown as StreamedTurn;
        } else if (event.kind === "recorded") {
          turnId = (event.detail as { turnId?: string })?.turnId;
        } else if (event.kind === "error") {
          handlers.onError?.(event.label || "The analysis could not be completed.");
          return;
        } else {
          handlers.onEvent?.(event);
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  if (!result) {
    // The stream ended without an answer — a dropped connection, or a server
    // that died mid-turn. The turn may still have completed and been recorded
    // on the way past, so ask before declaring it lost: re-running costs a
    // whole turn, and the user has already paid for this one.
    const recovered = await recoverTurn(turnId);
    if (recovered) {
      handlers.onResult(recovered);
      return;
    }
    throw new ApiError("The analysis ended before it finished.", 0);
  }
  handlers.onResult({ ...result, turnId: turnId ?? result.turnId ?? result.turn_id });
}

/**
 * The stored turn behind an id, if the server managed to record it.
 *
 * Returns null rather than throwing: this is a best-effort recovery, and its
 * failure must surface as the original "the stream broke", not as a confusing
 * second error about a lookup the user never asked for.
 */
async function recoverTurn(turnId: string | undefined): Promise<StreamedTurn | null> {
  if (!turnId) return null;
  try {
    const turn = await getChatTurn(turnId);
    if (!turn?.answer) return null;
    return {
      turnId: turn.turnId,
      message: turn.answer,
      drawings: [],          // already applied, or never produced
      results: {},
    };
  } catch {
    return null;
  }
}

function parseFrame(raw: string): AgentEvent | null {
  const payload = raw
    .split("\n")
    .filter((l) => l.startsWith("data:"))
    .map((l) => l.slice("data:".length).trim())
    .join("\n");
  if (!payload) return null;
  try {
    return JSON.parse(payload) as AgentEvent;
  } catch {
    // One unreadable line must not end a turn that is otherwise fine.
    return null;
  }
}

async function serverMessage(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { message?: string | string[] };
    const msg = Array.isArray(body?.message) ? body.message[0] : body?.message;
    if (typeof msg === "string" && msg.trim()) return msg;
  } catch {
    /* fall through to the status-based sentence */
  }
  return "";
}

function readableError(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return "Lost the connection to the analysis service. Please try again.";
}
