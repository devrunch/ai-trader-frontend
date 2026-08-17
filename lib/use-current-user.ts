"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/api/client";

export interface CurrentUser {
  id: string;
  email: string;
  plan: string;
  role: string;
}

/**
 * Who is logged in, for the two places that need to know without re-fetching
 * it themselves: the nav (to decide whether to show Admin) and the admin page
 * (to avoid flashing its table before the server's own 403 would land).
 *
 * Not the source of truth on access — `RolesGuard` on the API is. This is
 * purely "should I show a link", which is allowed to be wrong for a moment
 * without any consequence, unlike the guard.
 */
export function useCurrentUser(): { user: CurrentUser | null; loading: boolean } {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetch(`${API_BASE_URL}/api/auth/me`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (alive) setUser(data); })
      .catch(() => undefined)
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  return { user, loading };
}
