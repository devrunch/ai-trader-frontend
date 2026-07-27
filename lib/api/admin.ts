import { req } from "./client";

/**
 * Admin-only visibility into the agent's token spend, and the one lever over
 * it: a per-user daily cap.
 *
 * Every call here 403s for a non-admin — enforced server-side by `RolesGuard`,
 * which is the real protection. Nothing on the client decides who can reach
 * this data; it can only choose whether to render a link to it.
 */

export interface AdminUserUsage {
  userId: string;
  email: string;
  role: string;
  plan: string;
  tokensToday: number;
  turnsToday: number;
  cap: number;
  /** Null when this user is on the platform default, not a per-user override. */
  capOverride: number | null;
  remaining: number;
  lastActiveAt: string | null;
}

export interface AdminUsageSummary {
  users: AdminUserUsage[];
  totals: {
    tokensToday: number;
    turnsToday: number;
    activeUsersToday: number;
    userCount: number;
    defaultCap: number;
  };
}

export interface AdminTurnSummary {
  turnId: string;
  symbol: string;
  message: string;
  tokens: number;
  stopReason: string | null;
  createdAt: string;
}

export const getAdminUsage = () => req<AdminUsageSummary>("/api/admin/usage");

export const getAdminUserTurns = (userId: string, limit = 20) =>
  req<AdminTurnSummary[]>(`/api/admin/usage/${encodeURIComponent(userId)}/turns?limit=${limit}`);

/** `cap: null` clears the override and returns the user to the platform default. */
export const setAdminUserCap = (userId: string, cap: number | null) =>
  req<AdminUserUsage>(`/api/admin/users/${encodeURIComponent(userId)}/cap`, {
    method: "PATCH",
    body: JSON.stringify({ cap }),
  });
