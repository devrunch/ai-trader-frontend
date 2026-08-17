"use client";

import { useState } from "react";
import Link from "next/link";
import { API_BASE_URL } from "@/lib/api/client";

export default function RegisterPage() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [success,  setSuccess]  = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) { setError("Passwords do not match"); return; }
    if (password.length < 8)  { setError("Password must be at least 8 characters"); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message ?? "Registration failed");
      }
      setSuccess(true);
      setTimeout(() => { window.location.href = "/dashboard/terminal"; }, 700);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
      setLoading(false);
    }
  }

  function handleGoogle() {
    window.location.href = `${API_BASE_URL}/api/auth/google`;
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-primary/10 rounded-full blur-3xl float-animation pointer-events-none" />

      <div className="w-full max-w-sm relative">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-9 h-9 bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">AI</div>
            <span className="text-2xl font-semibold tracking-tight">AI<span className="text-link">Trader</span></span>
          </Link>
          <h1 className="font-heading text-2xl font-semibold mt-6 mb-1 tracking-tight">Create your account</h1>
          <p className="text-muted-foreground text-sm">Start paper trading in under a minute — no card required</p>
        </div>

        <div className="bg-card border border-border p-8">
          <button
            type="button"
            onClick={handleGoogle}
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-border text-sm font-medium hover:bg-secondary transition-colors mb-5"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-border" />
            <span className="text-muted-foreground text-xs">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="px-3.5 py-2.5 text-xs" style={{ background: "color-mix(in oklch, var(--sell) 12%, transparent)", border: "1px solid color-mix(in oklch, var(--sell) 40%, transparent)", color: "var(--sell)" }}>
                {error}
              </div>
            )}
            <div>
              <label className="block text-xs font-medium mb-1.5">Email address</label>
              <input
                type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3.5 py-2.5 bg-secondary border border-border text-sm placeholder-muted-foreground focus:border-primary focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5">Password</label>
              <input
                type="password" required value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Min 8 characters"
                className="w-full px-3.5 py-2.5 bg-secondary border border-border text-sm placeholder-muted-foreground focus:border-primary focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5">Confirm password</label>
              <input
                type="password" required value={confirm} onChange={e => setConfirm(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 bg-secondary border border-border text-sm placeholder-muted-foreground focus:border-primary focus:outline-none transition-colors"
              />
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full py-2.5 bg-primary text-primary-foreground font-semibold text-sm hover:brightness-110 transition-all mt-1 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>

          <p className="text-center text-muted-foreground text-xs mt-5">
            Already have an account?{" "}
            <Link href="/login" className="text-link font-medium hover:underline">Sign in</Link>
          </p>
        </div>

        <p className="text-center text-muted-foreground text-xs mt-5">
          By signing up you agree to our <a href="#" className="hover:text-foreground">Terms</a> and <a href="#" className="hover:text-foreground">Privacy Policy</a>.
        </p>
      </div>

      {success && (
        <div className="fixed bottom-6 right-6 z-50 bg-card border p-4 flex items-center gap-3 min-w-64" style={{ borderColor: "var(--buy)" }}>
          <div className="w-10 h-10 flex items-center justify-center shrink-0" style={{ background: "color-mix(in oklch, var(--buy) 20%, transparent)" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--buy)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div>
            <div className="font-bold text-sm">Account created</div>
            <div className="text-muted-foreground text-xs mt-0.5">Taking you to your terminal…</div>
          </div>
        </div>
      )}
    </div>
  );
}
