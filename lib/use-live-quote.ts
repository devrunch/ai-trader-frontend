"use client";

import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type { Quote } from "@/lib/api";

/**
 * One shared socket connection per mount, live-quote data for whatever
 * symbol/exchange is currently passed in — used unconditionally, for
 * every exchange. Which vendor actually answers is a Python-side decision
 * this hook has no reason to know about.
 */
let sharedSocket: Socket | null = null;

function getSocket(): Socket {
  if (!sharedSocket) {
    sharedSocket = io({ withCredentials: true });
  }
  return sharedSocket;
}

export function useLiveQuote(symbol: string, exchange: string): Quote | null {
  const [quote, setQuote] = useState<Quote | null>(null);
  const currentRef = useRef({ symbol, exchange });
  // eslint-disable-next-line react-hooks/refs
  currentRef.current = { symbol, exchange };

  useEffect(() => {
    const socket = getSocket();

    const subscribeCurrent = () => {
      const { symbol: s, exchange: e } = currentRef.current;
      socket.emit("subscribe_symbol", { symbol: s, exchange: e });
    };

    const onTick = (payload: Quote) => {
      const { symbol: s, exchange: e } = currentRef.current;
      if (payload.symbol === s && payload.exchange === e) {
        setQuote(payload);
      }
    };

    socket.on("connect", subscribeCurrent);
    socket.on("tick", onTick);
    if (socket.connected) subscribeCurrent();

    return () => {
      socket.off("connect", subscribeCurrent);
      socket.off("tick", onTick);
      socket.emit("unsubscribe_symbol", { symbol, exchange });
    };
  }, [symbol, exchange]);

  return quote;
}
