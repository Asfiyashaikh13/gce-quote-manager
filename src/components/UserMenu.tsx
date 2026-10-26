"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface UserInfo {
  id: string;
  name: string | null;
  email: string;
  role: "ADMIN" | "MANAGER" | "STAFF" | "VIEWER";
}

interface UserMenuProps {
  variant?: "dark" | "light";
}

export function UserMenu({ variant = "dark" }: UserMenuProps) {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) {
          setUser(data.user);
        }
      })
      .catch(() => {});

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      setIsOpen(false);
      router.push("/logout");
      router.refresh();
    } catch {
      router.push("/login");
    }
  };

  const isDark = variant === "dark";

  if (!user) {
    return (
      <Link
        href="/login"
        className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-2xs ${
          isDark
            ? "bg-white/10 hover:bg-white/20 text-white border border-white/20"
            : "bg-white hover:bg-slate-100 text-blue-700 border border-blue-300"
        }`}
      >
        <span>👤</span>
        <span>Sign In</span>
      </Link>
    );
  }

  const roleLabel =
    user.role === "ADMIN"
      ? "Owner"
      : user.role === "MANAGER"
      ? "Partner"
      : user.role === "STAFF"
      ? "Staff"
      : "Client";

  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "GC";

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-2 py-1 rounded-lg transition cursor-pointer border ${
          isDark
            ? "hover:bg-white/10 border-transparent hover:border-white/15 text-white"
            : "hover:bg-slate-100 border-transparent hover:border-slate-200 text-slate-800"
        }`}
        title="Account Profile & Settings"
      >
        <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs ring-1 ring-white/25 shrink-0">
          {initials}
        </div>
        <div className="hidden sm:block text-left text-xs leading-tight">
          <div className={`font-bold truncate max-w-[110px] ${isDark ? "text-white" : "text-slate-900"}`}>
            {user.name || "User"}
          </div>
          <div className={`text-[10px] font-medium capitalize ${isDark ? "text-emerald-300" : "text-slate-500"}`}>
            {roleLabel}
          </div>
        </div>
        <span className={`text-[10px] ${isDark ? "text-slate-300" : "text-slate-400"}`}>▼</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-64 rounded-xl bg-white shadow-xl border border-slate-200 z-50 py-2 divide-y divide-slate-100 text-slate-800 animate-in fade-in zoom-in-95 duration-100">
          {/* User info card */}
          <div className="px-4 py-3 bg-slate-50/70">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-slate-900 truncate">{user.name || "User"}</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-blue-50 text-blue-800 border-blue-200">
                {roleLabel}
              </span>
            </div>
            <div className="text-[11px] font-mono text-slate-500 truncate mt-0.5">{user.email}</div>
          </div>

          {/* Links */}
          <div className="py-1">
            <Link
              href="/profile"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition"
            >
              <span>👤</span>
              <span>Account Profile</span>
            </Link>

            <Link
              href="/change-password"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition"
            >
              <span>🔑</span>
              <span>Change Password</span>
            </Link>

            <Link
              href="/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition"
            >
              <span>⚙️</span>
              <span>System Settings</span>
            </Link>
          </div>

          {/* Sign Out */}
          <div className="py-1">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 transition cursor-pointer text-left"
            >
              <span>🚪</span>
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
