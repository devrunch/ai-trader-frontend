export interface Holding {
  symbol: string;
  name: string;
  qty: number;
  avgPrice: number;
  exchange: string;
  type: "Delivery" | "Intraday";
  purchasedAt: string;
}

const KEY = "ait-holdings";

export function getHoldings(): Holding[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function addHolding(h: Omit<Holding, "purchasedAt">): void {
  const holdings = getHoldings();
  const idx = holdings.findIndex(
    (x) => x.symbol === h.symbol && x.type === h.type
  );
  if (idx >= 0) {
    const e = holdings[idx];
    const totalQty = e.qty + h.qty;
    holdings[idx] = {
      ...e,
      avgPrice: (e.avgPrice * e.qty + h.avgPrice * h.qty) / totalQty,
      qty: totalQty,
    };
  } else {
    holdings.push({ ...h, purchasedAt: new Date().toISOString() });
  }
  localStorage.setItem(KEY, JSON.stringify(holdings));
}

export function clearHoldings(): void {
  localStorage.removeItem(KEY);
}
