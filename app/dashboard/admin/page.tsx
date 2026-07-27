"use client";

import { useEffect, useState } from "react";
import {
  errorMessage,
  getAdminUsage,
  getAdminUserTurns,
  setAdminUserCap,
  type AdminTurnSummary,
  type AdminUsageSummary,
  type AdminUserUsage,
} from "@/lib/api";
import { ErrorState } from "@/components/ErrorState";

const tok = (n: number) => n.toLocaleString("en-IN");

function relativeTime(iso: string | null): string {
  if (!iso) return "—";
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

/**
 * Admin: token usage.
 *
 * Every user's spend against the agent today, and the one control an admin
 * has over it — a per-user daily cap. This is not a second accounting: it
 * reads the same `chat_turns` totals `ChatBudgetService` already sums to
 * decide whether to allow the next turn, listed across every user instead of
 * checked for one.
 *
 * Protected server-side by `RolesGuard` — a non-admin hitting this URL gets a
 * 403 from the API on the first request, rendered here as the same
 * "You don't have access to that" every other 403 in the product uses.
 */
export default function AdminUsagePage() {
  const [data, setData] = useState<AdminUsageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    getAdminUsage()
      .then((d) => { if (alive) { setData(d); setError(""); } })
      .catch((e) => { if (alive) setError(errorMessage(e, "Couldn't load usage.")); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [attempt]);

  function retry() {
    setLoading(true);
    setError("");
    setAttempt((a) => a + 1);
  }

  function patchUser(updated: AdminUserUsage) {
    setData((d) => d && {
      ...d,
      users: d.users.map((u) => (u.userId === updated.userId ? updated : u)),
    });
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
      <header>
        <h1 className="text-lg font-bold">Token usage</h1>
        <p className="text-xs text-muted-foreground mt-1 max-w-2xl leading-relaxed">
          What every user has spent on AI analysis today, and the cap that controls
          it. Resets at midnight IST. Admin only.
        </p>
      </header>

      {loading && <SkeletonList />}
      {!loading && error && <ErrorState message={error} onRetry={retry} />}

      {!loading && !error && data && (
        <>
          <Totals summary={data} />
          <UserTable users={data.users} onCapChanged={patchUser} />
        </>
      )}
    </div>
  );
}

function Totals({ summary }: { summary: AdminUsageSummary }) {
  const { totals } = summary;
  const cells: { label: string; value: string }[] = [
    { label: "Tokens today", value: tok(totals.tokensToday) },
    { label: "Turns today", value: tok(totals.turnsToday) },
    { label: "Active users", value: `${totals.activeUsersToday} / ${totals.userCount}` },
    { label: "Default cap", value: `${tok(totals.defaultCap)} / user` },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {cells.map((c) => (
        <div key={c.label} className="border border-border bg-card p-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {c.label}
          </div>
          <div className="font-mono text-lg font-bold tabular-nums mt-0.5">{c.value}</div>
        </div>
      ))}
    </div>
  );
}

function UserTable({
  users, onCapChanged,
}: {
  users: AdminUserUsage[];
  onCapChanged: (u: AdminUserUsage) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (users.length === 0) {
    return <div className="border border-border bg-card p-8 text-center text-sm text-muted-foreground">No users yet.</div>;
  }

  return (
    <div className="border border-border bg-card overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-muted-foreground border-b border-border">
            <th className="font-normal py-2 pl-3 pr-3">User</th>
            <th className="font-normal py-2 pr-3 text-right">Tokens today</th>
            <th className="font-normal py-2 pr-3 text-right">Turns</th>
            <th className="font-normal py-2 pr-3">Usage</th>
            <th className="font-normal py-2 pr-3 text-right">Cap</th>
            <th className="font-normal py-2 pr-3">Last active</th>
            <th className="font-normal py-2 pr-3" />
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <UserRow
              key={u.userId}
              user={u}
              expanded={expanded === u.userId}
              onToggle={() => setExpanded((id) => (id === u.userId ? null : u.userId))}
              onCapChanged={onCapChanged}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function usageColour(u: AdminUserUsage): string {
  if (u.cap === 0) return "var(--sell)";
  const pct = u.cap > 0 ? u.tokensToday / u.cap : 0;
  if (pct >= 1) return "var(--sell)";
  if (pct >= 0.7) return "#e0ab4a";
  return "var(--buy)";
}

function UserRow({
  user, expanded, onToggle, onCapChanged,
}: {
  user: AdminUserUsage;
  expanded: boolean;
  onToggle: () => void;
  onCapChanged: (u: AdminUserUsage) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(user.cap));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const pct = user.cap > 0 ? Math.min(100, (user.tokensToday / user.cap) * 100) : user.tokensToday > 0 ? 100 : 0;
  const colour = usageColour(user);

  async function save(cap: number | null) {
    setSaving(true);
    setSaveError("");
    try {
      const updated = await setAdminUserCap(user.userId, cap);
      onCapChanged(updated);
      setEditing(false);
    } catch (e) {
      setSaveError(errorMessage(e, "Couldn't save that."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <tr className="border-b border-border last:border-0 align-top">
        <td className="py-2 pl-3 pr-3 min-w-0">
          <div className="font-medium text-foreground truncate">{user.email}</div>
          <div className="text-[10px] text-muted-foreground font-mono flex items-center gap-1.5">
            {user.role}
            {user.role === "admin" && (
              <span className="px-1 bg-primary/15 text-link">admin</span>
            )}
            · {user.plan}
          </div>
        </td>
        <td className="py-2 pr-3 text-right font-mono tabular-nums">{tok(user.tokensToday)}</td>
        <td className="py-2 pr-3 text-right font-mono tabular-nums">{user.turnsToday}</td>
        <td className="py-2 pr-3 w-32">
          <div className="h-1.5 bg-secondary overflow-hidden" title={`${tok(user.tokensToday)} / ${tok(user.cap)} tokens`}>
            <div className="h-full transition-all" style={{ width: `${pct}%`, background: colour }} />
          </div>
          {user.cap === 0 && (
            <div className="text-[10px] mt-0.5" style={{ color: "var(--sell)" }}>blocked</div>
          )}
        </td>
        <td className="py-2 pr-3 text-right">
          {editing ? (
            <div className="flex flex-col items-end gap-1">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                inputMode="numeric"
                autoFocus
                className="w-24 bg-secondary border border-border px-1.5 py-1 text-right font-mono text-xs focus:outline-none focus:border-primary"
              />
              <div className="flex gap-1.5">
                <button
                  disabled={saving}
                  onClick={() => {
                    const n = parseInt(draft, 10);
                    if (Number.isFinite(n) && n >= 0) void save(n);
                    else setSaveError("Enter a whole number, 0 or more.");
                  }}
                  className="text-[10px] text-link hover:underline disabled:opacity-40"
                >
                  Save
                </button>
                <button
                  disabled={saving}
                  onClick={() => { setEditing(false); setSaveError(""); setDraft(String(user.cap)); }}
                  className="text-[10px] text-muted-foreground hover:text-foreground disabled:opacity-40"
                >
                  Cancel
                </button>
              </div>
              {saveError && <div className="text-[10px]" style={{ color: "var(--sell)" }}>{saveError}</div>}
            </div>
          ) : (
            <button
              onClick={() => { setDraft(String(user.cap)); setEditing(true); }}
              className="font-mono tabular-nums hover:text-link transition-colors"
              title={user.capOverride !== null ? "Custom cap — click to change" : "Platform default — click to override"}
            >
              {tok(user.cap)}
              {user.capOverride !== null && <span className="text-link ml-1">·</span>}
            </button>
          )}
        </td>
        <td className="py-2 pr-3 text-muted-foreground whitespace-nowrap">
          {relativeTime(user.lastActiveAt)}
        </td>
        <td className="py-2 pr-3 text-right whitespace-nowrap">
          {!editing && user.cap !== 0 && (
            <button onClick={() => void save(0)} disabled={saving}
              className="text-[10px] text-muted-foreground hover:text-[var(--sell)] mr-2 disabled:opacity-40">
              Block
            </button>
          )}
          {user.capOverride !== null && !editing && (
            <button onClick={() => void save(null)} disabled={saving}
              className="text-[10px] text-muted-foreground hover:text-foreground mr-2 disabled:opacity-40">
              Reset
            </button>
          )}
          <button onClick={onToggle} className="text-[10px] text-link hover:underline">
            {expanded ? "Hide" : "Turns"}
          </button>
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-border">
          <td colSpan={7} className="bg-secondary/30 px-3 py-3">
            <RecentTurns userId={user.userId} />
          </td>
        </tr>
      )}
    </>
  );
}

function RecentTurns({ userId }: { userId: string }) {
  const [turns, setTurns] = useState<AdminTurnSummary[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    getAdminUserTurns(userId)
      .then((t) => { if (alive) setTurns(t); })
      .catch((e) => { if (alive) setError(errorMessage(e, "Couldn't load turns.")); });
    return () => { alive = false; };
  }, [userId]);

  if (error) return <p className="text-[11px]" style={{ color: "var(--sell)" }}>{error}</p>;
  if (!turns) return <p className="text-[11px] text-muted-foreground">Loading…</p>;
  if (turns.length === 0) return <p className="text-[11px] text-muted-foreground">No turns today.</p>;

  return (
    <ul className="space-y-1.5">
      {turns.map((t) => (
        <li key={t.turnId} className="flex items-baseline gap-3 text-[11px]">
          <span className="text-muted-foreground font-mono shrink-0 w-14">
            {new Date(t.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
          </span>
          <span className="font-mono shrink-0 w-20 text-muted-foreground">{t.symbol}</span>
          <span className="min-w-0 truncate flex-1">{t.message}</span>
          <span className="font-mono tabular-nums shrink-0">{tok(t.tokens)} tok</span>
          {t.stopReason && t.stopReason !== "answered_by_triage" && (
            <span className="shrink-0 text-[10px] px-1" style={{ color: "#e0ab4a" }}>{t.stopReason}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

function SkeletonList() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading token usage">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="border border-border bg-card p-3 h-14">
            <div className="h-2.5 w-16 bg-secondary animate-pulse motion-reduce:animate-none" />
          </div>
        ))}
      </div>
      <div className="border border-border bg-card px-4 py-5">
        <div className="h-3.5 w-40 bg-secondary animate-pulse motion-reduce:animate-none" />
        <div className="h-2.5 w-64 bg-secondary/70 mt-2.5 animate-pulse motion-reduce:animate-none" />
      </div>
    </div>
  );
}
