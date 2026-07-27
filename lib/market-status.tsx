"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getMarketStatus, marketPhase, type ApiMarketStatus, type MarketPhase } from "@/lib/api";

interface MarketStatusValue {
  status: ApiMarketStatus | null;
  phase: MarketPhase | null;
  /** True only while the session is actually live — used to gate price polling. */
  isLive: boolean;
  /** The status fetch itself failed; the header must say so rather than show "—" forever. */
  failed: boolean;
  loading: boolean;
  refresh: () => void;
}

const MarketStatusContext = createContext<MarketStatusValue>({
  status: null, phase: null, isLive: false, failed: false, loading: true, refresh: () => {},
});

export function useMarketStatus() {
  return useContext(MarketStatusContext);
}

/**
 * One market-status poll for the whole dashboard. Everything that shows a price
 * needs to know whether the session is open, so fetching it per-page would mean
 * three copies of the same request and three chances to disagree.
 */
export function MarketStatusProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<ApiMarketStatus | null>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    /* Promise chain, not async/await: setState must not sit on an effect's
       synchronous path. */
    const load = () =>
      getMarketStatus()
        .then(s => { if (alive) { setStatus(s); setFailed(false); } })
        .catch(() => { if (alive) setFailed(true); })
        .finally(() => { if (alive) setLoading(false); });

    load();
    const id = setInterval(load, 60_000);
    return () => { alive = false; clearInterval(id); };
  }, [tick]);

  const phase = marketPhase(status);

  const value: MarketStatusValue = {
    status,
    phase,
    isLive: phase === "OPEN" || phase === "SQUARE_OFF",
    failed,
    loading,
    refresh: () => setTick(t => t + 1),
  };

  return <MarketStatusContext.Provider value={value}>{children}</MarketStatusContext.Provider>;
}

/** "reopens Tue 09:15" — only meaningful while the market is shut. */
export function nextOpenLabel(status: ApiMarketStatus | null): string | null {
  if (!status?.next_open) return null;
  const d = new Date(status.next_open);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString("en-IN", { weekday: "short", hour: "2-digit", minute: "2-digit" });
}
