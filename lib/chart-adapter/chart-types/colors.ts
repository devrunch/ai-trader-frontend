/** The app's own up/down palette -- the exact values every chart type here
 *  already used before this file existed (candles.ts's own comment records
 *  where they first came from). Shared so a retune is one edit, not a
 *  grep-and-replace across every renderer file that needs an up/down color
 *  at all; each file still picks its own alpha suffix locally where one is
 *  needed (a fill wants far less opacity than a line/wick), since that's a
 *  real per-use styling choice, not incidental duplication. */
export const UP_COLOR = "#16c784";
export const DOWN_COLOR = "#f0525d";
