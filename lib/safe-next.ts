/** Where sign-in should send someone back to.
 *
 *  A shared link to the terminal carries the symbol in its query string, so
 *  losing it on the way through /login lands the visitor on the default
 *  symbol instead of the one they were sent. The destination rides through
 *  the flow as ?next=, which means it arrives from the URL bar and cannot be
 *  trusted: anything that is not a plain same-origin path is dropped rather
 *  than followed, or the sign-in page becomes an open redirect that sends
 *  people to an attacker's site wearing this app's referrer.
 *
 *  Rejected: absolute URLs ("https://evil.com"), scheme-relative ones
 *  ("//evil.com", which a browser resolves as a different host), anything
 *  not starting with "/", and backslash variants that some parsers treat as
 *  a slash.
 */
export function safeNextPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const value = raw.trim();
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//") || value.startsWith("/\\")) return null;
  // A control character or a newline here can split a header or smuggle a
  // second URL past a naive parser.
  if (/[\u0000-\u001f\u007f]/.test(value)) return null;
  return value;
}
