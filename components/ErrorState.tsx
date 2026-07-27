"use client";

/**
 * The one way this app reports that a fetch failed.
 *
 * Three states have to stay distinguishable — loading, empty, and broken. They
 * were collapsed into two almost everywhere, so a server outage rendered as
 * "No paper account yet" and a failed quote rendered the stock at ₹0.00 in
 * green. For a product about money, a confidently wrong number is worse than an
 * error, and an error with no way forward is a dead end.
 *
 * So: say what happened, in the sentence the API actually wrote, and always
 * offer the way back.
 */
export function ErrorState({
  message,
  onRetry,
  compact = false,
}: {
  message: string;
  onRetry?: () => void;
  compact?: boolean;
}) {
  return (
    <div
      role="alert"
      className={`border border-border bg-card ${compact ? "px-4 py-3" : "p-8"} text-center`}
      style={{ borderColor: "color-mix(in oklch, var(--sell) 35%, var(--border))" }}
    >
      <div className={`flex items-center justify-center gap-2 ${compact ? "" : "mb-1"}`}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--sell)"
             strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span className={`font-semibold ${compact ? "text-xs" : "text-sm"}`}>
          Couldn&apos;t load this
        </span>
      </div>
      <p className={`text-muted-foreground ${compact ? "text-[11px] mt-1" : "text-xs"}`}>{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 px-3 py-1.5 text-xs font-semibold border border-border hover:border-foreground/40 hover:text-foreground text-muted-foreground transition-colors"
        >
          Try again
        </button>
      )}
    </div>
  );
}
