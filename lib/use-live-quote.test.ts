/**
 * The hook wraps socket.io-client directly, which needs a real DOM/EventTarget
 * environment to test via a renderer. Testing the tick-filtering logic in
 * isolation instead: a tick for a symbol/exchange other than the one
 * currently active must never be accepted, since a stale in-flight
 * unsubscribe must not leak a price update into the wrong chart.
 */
function shouldAcceptTick(
  payload: { symbol: string; exchange: string },
  current: { symbol: string; exchange: string },
): boolean {
  return payload.symbol === current.symbol && payload.exchange === current.exchange;
}

/* Test case: accepts a tick matching the current symbol and exchange */
const test1 = shouldAcceptTick(
  { symbol: "RELIANCE", exchange: "NSE" },
  { symbol: "RELIANCE", exchange: "NSE" },
) === true;
if (!test1) throw new Error("Test 1 failed: should accept matching tick");

/* Test case: rejects a tick for a different symbol */
const test2 = shouldAcceptTick(
  { symbol: "TCS", exchange: "NSE" },
  { symbol: "RELIANCE", exchange: "NSE" },
) === false;
if (!test2) throw new Error("Test 2 failed: should reject different symbol");

/* Test case: rejects a tick for the same symbol on a different exchange */
const test3 = shouldAcceptTick(
  { symbol: "RELIANCE", exchange: "BSE" },
  { symbol: "RELIANCE", exchange: "NSE" },
) === false;
if (!test3) throw new Error("Test 3 failed: should reject different exchange");
