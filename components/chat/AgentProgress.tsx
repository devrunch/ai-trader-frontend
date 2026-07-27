"use client";

import type { AgentEvent } from "@/lib/api";

/**
 * What the agent is doing, while it does it.
 *
 * This replaces a spinner labelled "Thinking… (up to 15s)" — wrong twice over,
 * since a turn's real budget is 55 seconds and the user learned nothing during
 * it. Every line here was written server-side: only the backend knows what a
 * tool did and with what arguments, so the label arrives ready to render.
 */

const DONE = new Set(["tool_finished"]);
const FAILED = new Set(["tool_failed"]);

/**
 * Steps worth showing: the things the agent actually *did*.
 *
 * `turn_started` is excluded even though it carries a label. The user pressed
 * send a moment ago — telling them the turn started is ceremony, and on a
 * message that needs no tools ("hi") it was the only line ever shown, so a
 * greeting looked like a full analysis. `thinking` fires between every round
 * and says nothing either.
 */
const HIDDEN = new Set(["turn_started", "thinking", "turn_finished", "message"]);

function isVisible(event: AgentEvent): boolean {
  return !HIDDEN.has(event.kind);
}

export function AgentProgress({ events }: { events: AgentEvent[] }) {
  const steps = events.filter(isVisible);

  return (
    <div
      className="flex flex-col gap-1.5 text-xs"
      /* The turn runs for tens of seconds with no visual change a screen reader
         can announce. Polite so it waits for a pause rather than interrupting
         every step. */
      aria-live="polite"
      aria-atomic="false"
    >
      {/* Before any tool has run there is genuinely nothing to report, and
          claiming otherwise made a one-line reply look like a full analysis. */}
      {steps.length === 0 && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Spinner />
          Thinking…
        </div>
      )}

      {steps.map((step, i) => {
        const finished = DONE.has(step.kind);
        const failed = FAILED.has(step.kind);
        const running = i === steps.length - 1 && !finished && !failed;

        return (
          <div key={`${step.kind}-${i}`} className="flex items-start gap-2 leading-relaxed">
            <span className="mt-[3px] shrink-0">
              {failed ? <Cross /> : finished ? <Tick /> : running ? <Spinner /> : <Dot />}
            </span>
            <span className={failed ? "text-[var(--sell)]" : finished ? "text-muted-foreground" : "text-foreground"}>
              {step.label}
              {typeof step.detail?.took_ms === "number" && step.detail.took_ms > 400 && (
                <span className="text-muted-foreground font-mono ml-1.5">
                  {(step.detail.took_ms / 1000).toFixed(1)}s
                </span>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function Spinner() {
  return (
    <span
      className="block w-3 h-3 rounded-full border-2 border-primary/30 border-t-primary animate-spin motion-reduce:animate-none"
      role="presentation"
    />
  );
}

function Tick() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--buy)"
         strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function Cross() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--sell)"
         strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function Dot() {
  return <span className="block w-3 h-3 flex items-center justify-center text-muted-foreground">·</span>;
}
