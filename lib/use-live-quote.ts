"use client";

import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { getQuote, type Quote } from "@/lib/api";
import { API_BASE_URL } from "@/lib/api/client";

/**
 * One module-level singleton socket, shared by every component instance
 * that calls this hook — created on first use, reused for the app's whole
 * lifetime, never disconnected on unmount. Delivers live-quote data for
 * whatever symbol/exchange is currently passed in — used unconditionally,
 * for every exchange. Which vendor actually answers is a Python-side
 * decision this hook has no reason to know about.
 */
let sharedSocket: Socket | null = null;

function getSocket(): Socket {
  if (!sharedSocket) {
    sharedSocket = io(API_BASE_URL, { withCredentials: true });
  }
  return sharedSocket;
}

/** A tick for a symbol/exchange other than the currently active one must never be accepted. */
export function shouldAcceptTick(
  payload: { symbol: string; exchange: string },
  current: { symbol: string; exchange: string },
): boolean {
  return payload.symbol === current.symbol && payload.exchange === current.exchange;
}

export function useLiveQuote(symbol: string, exchange: string): { quote: Quote | null; connected: boolean } {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [connected, setConnected] = useState(() => sharedSocket?.connected ?? false);
  const currentRef = useRef({ symbol, exchange });
  // eslint-disable-next-line react-hooks/refs
  currentRef.current = { symbol, exchange };

  // Reset during render, not in an effect: switching symbols must never
  // show the old symbol's price under the new label, not even for a frame.
  const key = `${symbol}:${exchange}`;
  const [resetKey, setResetKey] = useState(key);
  if (key !== resetKey) {
    setResetKey(key);
    setQuote(null);
  }

  useEffect(() => {
    const socket = getSocket();

    const subscribeCurrent = () => {
      const { symbol: s, exchange: e } = currentRef.current;
      socket.emit("subscribe_symbol", { symbol: s, exchange: e });
    };

    const onConnect = () => { setConnected(true); subscribeCurrent(); };
    const onDisconnect = () => setConnected(false);

    const onTick = (payload: Quote) => {
      if (shouldAcceptTick(payload, currentRef.current)) {
        setQuote(payload);
      }
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onDisconnect);
    socket.on("tick", onTick);
    if (socket.connected) { setConnected(true); subscribeCurrent(); }

    // Immediate snapshot so NSE/BSE (ticks only flow during market hours)
    // still show a price outside trading hours; live ticks supersede it.
    getQuote(symbol, exchange)
      .then((data) => {
        if (shouldAcceptTick({ symbol, exchange }, currentRef.current)) {
          setQuote({ ...data, exchange });
        }
      })
      .catch(() => {});

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onDisconnect);
      socket.off("tick", onTick);
      socket.emit("unsubscribe_symbol", { symbol, exchange });
    };
  }, [symbol, exchange]);

  return { quote, connected };
}
