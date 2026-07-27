"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Time-aware landing.
 *
 * The product's core loop is "open before the market, get the day's plan" — so
 * pre-market and post-close we land on the Brief. During market hours the user
 * is working, so we land on the Terminal. If they navigate away manually we
 * remember that for the session; a smart default should never fight the user.
 */
export default function DashboardLanding() {
  const router = useRouter();

  useEffect(() => {
    const remembered = sessionStorage.getItem("lastDashboardTab");
    if (remembered) {
      router.replace(remembered);
      return;
    }

    // Current time in IST regardless of the device's timezone
    const ist = new Date(Date.now() + (330 + new Date().getTimezoneOffset()) * 60_000);
    const mins = ist.getHours() * 60 + ist.getMinutes();
    const day = ist.getDay(); // 0 Sun … 6 Sat

    const marketOpen = day >= 1 && day <= 5 && mins >= 9 * 60 + 15 && mins <= 15 * 60 + 30;
    router.replace(marketOpen ? "/dashboard/terminal" : "/dashboard/brief");
  }, [router]);

  return (
    <div className="h-full flex items-center justify-center">
      <div className="w-7 h-7 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
    </div>
  );
}
