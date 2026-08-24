"use client";

import { useEffect, useState } from "react";

const QUERY = "(max-width: 1023px)";

/** null until the first client-side check runs -- guessing a default here
 *  (e.g. `false`) risks mounting the desktop layout's real chart + chat
 *  session on a phone, only to tear both down a moment later once the real
 *  viewport is known. Rendering nothing for that one frame is cheaper than
 *  guessing wrong. */
export function useIsMobile(): boolean | null {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    setIsMobile(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}
