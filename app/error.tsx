"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Root error boundary. Without one, an uncaught render error blanked the page —
 * a white screen with no explanation and no way back.
 *
 * It deliberately does NOT print `error.message`. A React render error is an
 * internal detail (component names, property paths, sometimes a stack), and
 * showing it to a user is the developer-leakage problem this codebase has been
 * removing everywhere else. The digest is shown instead: it means nothing to
 * the user but lets support correlate the report with the server log.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Client-side crashes are otherwise invisible to us entirely.
    console.error("Unhandled UI error", error);
  }, [error]);

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <h1 className="font-heading text-xl font-semibold mb-2">Something broke</h1>
        <p className="text-muted-foreground text-sm mb-1">
          This screen hit an error and stopped. Nothing you did caused it, and no
          orders were affected.
        </p>
        {error.digest && (
          <p className="text-muted-foreground text-[11px] font-mono mb-5">
            Reference: {error.digest}
          </p>
        )}
        <div className="flex items-center justify-center gap-3 mt-4">
          <button
            onClick={reset}
            className="px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground"
          >
            Try again
          </button>
          <Link
            href="/dashboard"
            className="px-4 py-2 text-sm font-semibold border border-border text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
