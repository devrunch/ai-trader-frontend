"use client";

import { useCallback, useSyncExternalStore } from "react";

/** Shared backdrop/sizing chrome for every modal dialog in the app.
 *  Centered card >=640px (today's existing look, unchanged); full-screen
 *  below it -- a modal on a narrow desktop window gets the same treatment
 *  a phone does, since this checks viewport width, not device type. */
export function ResponsiveModal({ open, onClose, ariaLabel, maxWidthClass, maxHeightClass, children }: {
  open: boolean;
  onClose: () => void;
  ariaLabel: string;
  maxWidthClass: string;
  maxHeightClass: string;
  children: React.ReactNode;
}) {
  const isNarrow = useNarrowViewport();

  if (!open) return null;

  const cardClass = isNarrow
    ? "w-full h-full flex flex-col"
    : `bg-card border border-border w-full ${maxWidthClass} ${maxHeightClass} flex flex-col`;
  const backdropClass = isNarrow
    ? "fixed inset-0 z-50 flex bg-card"
    : "fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm p-4 pt-[8vh]";

  return (
    <div role="dialog" aria-modal="true" aria-label={ariaLabel} className={backdropClass} onClick={onClose}>
      <div className={cardClass} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function useNarrowViewport(): boolean {
  // Deliberately separate from useIsMobile (lib/use-is-mobile.ts): that hook
  // answers "is this the mobile TERMINAL LAYOUT" (1023px), this answers
  // "should THIS MODAL go full-screen" (639px) -- same mechanism, different,
  // independent cutoff.
  return useMatchMedia("(max-width: 639px)");
}

function useMatchMedia(query: string): boolean {
  // useSyncExternalStore, not useState+useEffect: matchMedia IS an external
  // store, and reading it in an effect meant a render with the wrong answer
  // before the correction. `false` is the server snapshot, so SSR renders the
  // non-mobile branch and hydration corrects it in one pass.
  const subscribe = useCallback((onChange: () => void) => {
    const mql = window.matchMedia(query);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false);
}
