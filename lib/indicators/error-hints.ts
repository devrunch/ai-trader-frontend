/** Known-unsupported constructs, matched against the SOURCE text rather than
 *  the raw error message -- PineTS's own errors are plain JS runtime errors
 *  (ReferenceError/TypeError) with no Pine-source line number attached
 *  (confirmed: neither a syntax error nor a runtime error carries position
 *  info in what the sandbox returns), so there's no line/column to point at.
 *  This is the honest substitute: recognize the specific gaps this sandbox
 *  actually has and say so in plain language, rather than just the bare JS
 *  error text. First match wins -- checked in the order a script is most
 *  likely to hit them. */
const KNOWN_LIMITATIONS: { pattern: RegExp; hint: string }[] = [
  { pattern: /\brequest\.security\w*\s*\(/, hint: "request.security() needs a live multi-symbol/multi-timeframe data feed, which this sandbox doesn't provide." },
  { pattern: /\bstrategy\.\w+\s*\(/, hint: "strategy.*() functions need strategy mode -- this editor only runs scripts as indicators." },
  { pattern: /\bbgcolor\s*\(/, hint: "bgcolor() isn't supported yet -- background shading has no renderer on this chart." },
];

/** A plain-language hint for a script that failed to run, if it uses a
 *  construct known not to work in this sandbox -- null when nothing
 *  recognized matched, in which case the raw error message is all there is. */
export function findErrorHint(source: string): string | null {
  return KNOWN_LIMITATIONS.find((k) => k.pattern.test(source))?.hint ?? null;
}
