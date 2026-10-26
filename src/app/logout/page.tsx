"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    // Ensure session is cleared on server
    fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-2xl mx-auto shadow-xs">
          ✓
        </div>

        <div>
          <h1 className="text-xl font-bold text-slate-900">Signed Out Successfully</h1>
          <p className="text-xs text-slate-500 mt-1">
            Your session has been securely ended on this device.
          </p>
        </div>

        <div className="pt-2 flex flex-col gap-2.5">
          <Link
            href="/login"
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs transition"
          >
            Sign In Again
          </Link>
          <Link
            href="/"
            className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
          >
            Return to Master Sheet
          </Link>
        </div>

        <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-100">
          Glass Care Enterprises &bull; Quote &amp; Expense Manager
        </div>
      </div>
    </div>
  );
}
