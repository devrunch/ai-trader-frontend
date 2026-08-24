/** Subsequence-based fuzzy matching, the same approach behind VS Code's and
 *  Sublime's command palettes -- query characters must all appear in
 *  `target`, in order, but not necessarily contiguous ("gchn" matches
 *  "G-Channel"), which plain substring matching (the picker's old
 *  `.includes()`) can't do at all, and typo-tolerant enough to survive one
 *  transposed or skipped character in an otherwise-contiguous run. */

/** Higher is a better match. `null` means `query` doesn't fuzzy-match
 *  `target` at all -- callers should drop the entry, not sort it last. */
export function fuzzyScore(query: string, target: string): number | null {
  const q = query.trim().toLowerCase();
  if (!q) return 0; // empty query matches everything, ranked equally
  const t = target.toLowerCase();

  let score = 0;
  let ti = 0;
  let run = 0; // consecutive matched characters right now -- rewards contiguous runs over scattered hits

  for (let qi = 0; qi < q.length; qi++) {
    const ch = q[qi];
    const found = t.indexOf(ch, ti);
    if (found === -1) return null;

    if (found === ti) {
      run += 1;
    } else {
      run = 1;
    }
    // Quadratic, not linear: three isolated word-initial hits (each run=1)
    // must not outscore one real 3-character contiguous run -- a literal
    // substring match is a stronger signal than acronym-style initials and
    // should win even against several boundary bonuses stacked up.
    score += run * run;

    // A match right after a natural word boundary (start of string, or
    // preceded by a space/hyphen/underscore) reads as more "intentional"
    // than the same letter landing mid-word -- e.g. querying "sma" should
    // rank "Simple Moving Average" (three word-initial letters) above some
    // indicator that merely happens to contain "sma" mid-token.
    if (found === 0 || /[\s\-_]/.test(t[found - 1])) score += 2;

    ti = found + 1;
  }

  // Shorter targets rank slightly higher for an equally strong match --
  // "SMA" beating "SMA Crossover Strategy Bundle" for the query "sma".
  score -= t.length * 0.01;
  return score;
}

/** Filters + ranks `items` by the best fuzzy match across `keys`, best
 *  first. An item with no match on any key is dropped entirely -- this is
 *  the picker's whole search behavior in one call, not just the scoring
 *  primitive above. */
export function fuzzyFilter<T>(items: T[], query: string, keys: (item: T) => string[]): T[] {
  const q = query.trim();
  if (!q) return items;

  const scored = items
    .map((item) => {
      const best = Math.max(...keys(item).map((k) => fuzzyScore(q, k) ?? -Infinity));
      return { item, best };
    })
    .filter(({ best }) => best > -Infinity);

  scored.sort((a, b) => b.best - a.best);
  return scored.map(({ item }) => item);
}
