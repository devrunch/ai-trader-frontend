import Link from "next/link";

export const metadata = { title: "Page not found · AI Trader" };

/**
 * There was no 404 page, so a mistyped URL fell through to Next's default —
 * unstyled, unbranded, and with no route back into the product.
 */
export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <div className="font-mono text-5xl font-bold text-link mb-3">404</div>
        <h1 className="font-heading text-xl font-semibold mb-2">
          That page doesn&apos;t exist
        </h1>
        <p className="text-muted-foreground text-sm mb-6">
          The link may be out of date, or the address may have a typo.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground"
          >
            Go to dashboard
          </Link>
          <Link
            href="/"
            className="px-4 py-2 text-sm font-semibold border border-border text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
          >
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
