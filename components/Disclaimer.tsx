import Link from "next/link";

/**
 * The qualification that must appear on every surface showing a trade suggestion.
 *
 * The wording follows the Morning Brief's server-supplied disclaimer
 * (ai-trader-signals/app/signals/brief.py), which is the one place in the
 * product that got this right. The Signals page, the terminal's signal panel
 * and the chat results carried nothing at all.
 */
export const DISCLAIMER_TEXT =
  "Analysis, not investment advice, and not a promise of returns. Levels must be " +
  "revalidated against the live market before acting — treat them as reference, " +
  "not as orders. Costs and slippage are not modelled. All trading here is " +
  "simulated with paper money.";

/** Compact one-liner for dense panels (terminal, chat). */
export const DISCLAIMER_SHORT =
  "Analysis, not investment advice. Paper trading only — revalidate any level against the live market.";

export function Disclaimer({
  variant = "full",
  showTrackRecord = true,
  className = "",
}: {
  variant?: "full" | "short";
  showTrackRecord?: boolean;
  className?: string;
}) {
  return (
    <div className={`text-[11px] text-muted-foreground leading-relaxed ${className}`}>
      <p>{variant === "short" ? DISCLAIMER_SHORT : DISCLAIMER_TEXT}</p>
      {showTrackRecord && (
        // The measured hit rate is one click away — a user should never have to
        // discover the real number somewhere else.
        <Link href="/dashboard/signals" className="text-link hover:underline mt-1 inline-block">
          See our measured track record →
        </Link>
      )}
    </div>
  );
}
