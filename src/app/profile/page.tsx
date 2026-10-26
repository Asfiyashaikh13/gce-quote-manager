"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SevenTabsNav } from "@/components/SevenTabsNav";

interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  role: string;
  createdAt: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/auth/profile");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setName(data.user.name || "");
      } else {
        // Fallback to /api/auth/me
        const meRes = await fetch("/api/auth/me");
        const meData = await meRes.json();
        if (meData.user) {
          setUser(meData.user);
          setName(meData.user.name || "");
        } else {
          router.push("/login?redirect=/profile");
        }
      }
    } catch {
      setStatusMsg({ type: "error", text: "Failed to load profile details" });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);

    if (newPassword && newPassword !== confirmPassword) {
      setStatusMsg({ type: "error", text: "New password and confirmation do not match" });
      return;
    }

    if (newPassword && newPassword.length < 6) {
      setStatusMsg({ type: "error", text: "New password must be at least 6 characters" });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          currentPassword: currentPassword || undefined,
          newPassword: newPassword || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setStatusMsg({ type: "error", text: data.error || "Failed to update profile" });
      } else {
        setStatusMsg({ type: "success", text: "Profile updated successfully!" });
        setUser(data.user);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch {
      setStatusMsg({ type: "error", text: "Network error updating profile" });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/logout");
      router.refresh();
    } catch {
      router.push("/login");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-sm font-semibold text-slate-500 animate-pulse">Loading account profile...</div>
      </div>
    );
  }

  const roleLabel =
    user?.role === "ADMIN"
      ? "👑 Owner / Executive Admin"
      : user?.role === "MANAGER"
      ? "🤝 Business Partner / Manager"
      : user?.role === "STAFF"
      ? "📐 Estimator / Staff"
      : "👁️ Client / Viewer";

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "GC";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      <SevenTabsNav />

      <main className="max-w-4xl mx-auto w-full p-6 flex-1 space-y-6">
        {/* Top Header Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Account Profile</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage your personal credentials, partner role, and security settings
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="px-3.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition shadow-2xs"
            >
              ← Back to Master Sheet
            </Link>
            <button
              onClick={handleLogout}
              className="px-3.5 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
            >
              <span>🚪</span>
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Status Alerts */}
        {statusMsg && (
          <div
            className={`p-4 rounded-xl text-xs font-semibold border flex items-center justify-between ${
              statusMsg.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-red-50 border-red-200 text-red-800"
            }`}
          >
            <span>{statusMsg.text}</span>
            <button onClick={() => setStatusMsg(null)} className="font-bold opacity-60 hover:opacity-100">
              ×
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Column: User Summary Card */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs text-center space-y-4">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-2xl mx-auto shadow-md">
                {initials}
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">{user?.name || "User"}</h2>
                <p className="text-xs font-mono text-slate-500 mt-0.5">{user?.email}</p>
              </div>
              <div className="pt-2 border-t border-slate-100">
                <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
                  {roleLabel}
                </span>
              </div>
              <div className="text-[11px] text-slate-400">
                Member of <strong>Glass Care Enterprises</strong>
              </div>
            </div>

            {/* Quick Access Links */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Navigation Shortcuts</h3>
              <Link
                href="/quotes"
                className="flex items-center justify-between p-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                <span>📄 Client Quotations</span>
                <span className="text-slate-400">→</span>
              </Link>
              <Link
                href="/profit"
                className="flex items-center justify-between p-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                <span>💰 30/70 Profit &amp; Payout</span>
                <span className="text-slate-400">→</span>
              </Link>
              <Link
                href="/expenses"
                className="flex items-center justify-between p-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                <span>🧾 Expenses &amp; Reimbursement</span>
                <span className="text-slate-400">→</span>
              </Link>
              <Link
                href="/settings"
                className="flex items-center justify-between p-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                <span>⚙️ System Settings</span>
                <span className="text-slate-400">→</span>
              </Link>
            </div>
          </div>

          {/* Right Column: Edit Profile & Password Form */}
          <div className="md:col-span-2 space-y-6">
            <form onSubmit={handleUpdateProfile} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
              {/* Account Details */}
              <div>
                <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
                  Personal Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your Full Name"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      value={user?.email || ""}
                      disabled
                      className="w-full px-3 py-2 text-xs border border-slate-200 bg-slate-50 rounded-lg text-slate-500 font-mono cursor-not-allowed"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Managed by organization administrator</p>
                  </div>
                </div>
              </div>

              {/* Security & Password */}
              <div>
                <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
                  Change Password
                </h3>
                <p className="text-xs text-slate-500 mt-1 mb-4">
                  Leave these fields blank if you do not wish to change your password.
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Current Password</label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">New Password</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm New Password</label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter new password"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <span className="text-[11px] text-slate-400">
                  Last updated: {user?.createdAt ? new Date().toLocaleDateString() : ""}
                </span>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-xs transition cursor-pointer"
                >
                  {saving ? "Saving Changes..." : "Save Profile Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
