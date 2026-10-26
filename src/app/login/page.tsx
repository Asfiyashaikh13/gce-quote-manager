"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/";

  const [email, setEmail] = useState("admin@gce.local");
  const [password, setPassword] = useState("Admin@123");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed");
        setLoading(false);
        return;
      }

      if (data.mustChangePassword) {
        router.push("/change-password");
      } else {
        router.push(redirectUrl);
      }
      router.refresh();
    } catch {
      setError("Network or server error during login");
      setLoading(false);
    }
  };

  const setCredentials = (userEmail: string, userPass: string) => {
    setEmail(userEmail);
    setPassword(userPass);
    setError("");
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-md p-8">
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-700 text-white flex items-center justify-center font-black text-2xl shadow-sm mb-3">
            GC
          </div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Sign in to GCE Quote Manager</h1>
          <p className="text-xs text-slate-500 mt-1">Glass Care Enterprises &bull; Account Login</p>
        </div>

        {/* Quick Role Switcher Chips */}
        <div className="mb-5 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            Quick One-Click Sign In:
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setCredentials("admin@gce.local", "Admin@123")}
              className={`p-2 rounded-lg border text-left transition cursor-pointer ${
                email === "admin@gce.local"
                  ? "bg-blue-50 border-blue-400 text-blue-900 ring-1 ring-blue-300"
                  : "bg-white border-slate-200 hover:bg-slate-100 text-slate-700"
              }`}
            >
              <div className="font-bold text-xs">👑 Owner</div>
              <div className="text-[10px] text-slate-500 truncate">admin@gce.local</div>
            </button>

            <button
              type="button"
              onClick={() => setCredentials("partner@gce.local", "Partner@123")}
              className={`p-2 rounded-lg border text-left transition cursor-pointer ${
                email === "partner@gce.local"
                  ? "bg-teal-50 border-teal-400 text-teal-900 ring-1 ring-teal-300"
                  : "bg-white border-slate-200 hover:bg-slate-100 text-slate-700"
              }`}
            >
              <div className="font-bold text-xs">🤝 Partner</div>
              <div className="text-[10px] text-slate-500 truncate">partner@gce.local</div>
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg font-medium flex items-center justify-between">
            <span>{error}</span>
            <button type="button" onClick={() => setError("")} className="font-bold">
              ×
            </button>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. admin@gce.local"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700">Password</label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[11px] text-blue-600 hover:text-blue-800"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            <input
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-xs transition mt-2 cursor-pointer"
          >
            {loading ? "Signing in..." : "Sign In to Account"}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <Link href="/" className="hover:text-blue-600 font-medium">
            ← Return to Master Sheet
          </Link>
          <Link href="/change-password" className="text-blue-600 hover:underline font-medium">
            Forgot Password?
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
          <div className="text-sm font-semibold text-slate-500 animate-pulse">Loading sign in...</div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
