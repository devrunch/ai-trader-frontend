"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Reopen the tab the user last picked this session, or Home. */
export default function DashboardLanding() {
  const router = useRouter();

  useEffect(() => {
    router.replace(sessionStorage.getItem("lastDashboardTab") ?? "/dashboard/brief");
  }, [router]);

  return (
    <div className="h-full flex items-center justify-center">
      <div className="w-7 h-7 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
    </div>
  );
}
