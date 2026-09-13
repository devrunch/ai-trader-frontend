"use client";

import { useCallback, useSyncExternalStore } from "react";

const QUERY = "(max-width: 1023px)";

/** null until the first client-side check runs -- guessing a default here
 *  (e.g. `false`) risks mounting the desktop layout's real chart + chat
 *  session on a phone, only to tear both down a moment later once the real
 *  viewport is known. Rendering nothing for that one frame is cheaper than
 *  guessing wrong. */
export function useIsMobile(): boolean | null {
  // useSyncExternalStore, not useState+useEffect: matchMedia IS an external
  // store. The server snapshot stays null, which preserves the "render nothing
  // until the real viewport is known" behaviour described above.
  const subscribe = useCallback((onChange: () => void) => {
    const mql = window.matchMedia(QUERY);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return useSyncExternalStore<boolean | null>(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => null,
  );
}
