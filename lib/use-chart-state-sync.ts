"use client";

import { useEffect, useRef } from "react";
import { getSocket } from "./use-live-quote";
import type { AttachedIndicator } from "./api/charts";

/**
 * Pushes what's actually attached to the chart to the server, over the same
 * shared Socket.IO connection useLiveQuote already opens -- so the chat
 * agent's chart_indicators tools (ai-trader-signals/app/signals/agent/tools/
 * chart_indicators.py) see real, live data instead of nothing. The gateway
 * (ai-trader-api's SignalsGateway) stores it per authenticated user, keyed
 * off the verified JWT, never anything this hook sends.
 *
 * Fire-and-forget: there is no ack, no retry, no loading state. A dropped
 * event just means the agent's next `list_chart_indicators` call sees
 * slightly stale data until the next real change re-emits -- not a
 * correctness problem worth machinery for.
 */
export function useChartStateSync(indicators: AttachedIndicator[], interval: string): void {
  const latestRef = useRef({ indicators, interval });
  // eslint-disable-next-line react-hooks/refs
  latestRef.current = { indicators, interval };

  useEffect(() => {
    const socket = getSocket();
    const emit = () => {
      socket.emit("chart_state", {
        interval: latestRef.current.interval,
        indicators: latestRef.current.indicators,
      });
    };
    emit();
    // A reconnect (network blip, laptop sleep) starts the gateway's
    // in-memory state for this user fresh -- without re-sending here on
    // "connect", the agent would see nothing attached until the next real
    // indicator change, even though the chart itself never lost anything.
    socket.on("connect", emit);
    return () => {
      socket.off("connect", emit);
    };
  }, [indicators, interval]);
}
