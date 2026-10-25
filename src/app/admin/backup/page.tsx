"use client";

import React, { useState } from "react";
import Link from "next/link";

export default function BackupPage() {
  const [restoring, setRestoring] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const confirmed = window.confirm(
      "Are you sure you want to restore the database from this backup? Existing settings, products, and factories will be merged or updated."
    );
    if (!confirmed) {
      e.target.value = "";
      return;
    }

    setRestoring(true);
    try {
      const text = await file.text();
      const payload = JSON.parse(text);

      const res = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        showToast("Database successfully restored from JSON backup!");
      } else {
        showToast(json.error || "Failed to restore backup");
      }
    } catch (err) {
      console.error(err);
      showToast("Error parsing backup JSON file");
    } finally {
      setRestoring(false);
      e.target.value = "";
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 pb-20">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-lg shadow-xl text-sm font-medium flex items-center gap-2">
          <span>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-[98%] mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                GCE
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-900 leading-tight">Database Backup & Disaster Recovery</h1>
                <p className="text-xs text-slate-500">JSON Data Export • Snapshot Restoration • CLI Backup Tool</p>
              </div>
            </div>

            {/* Navigation links */}
            <nav className="hidden xl:flex items-center gap-1 text-xs font-semibold">
              <Link
                href="/"
                className="px-3 py-1.5 text-slate-600 hover:text-slate-900 rounded-md hover:bg-slate-100 transition"
              >
                Master Sheet
              </Link>
              <Link
                href="/quotes"
                className="px-3 py-1.5 text-slate-600 hover:text-slate-900 rounded-md hover:bg-slate-100 transition"
              >
                Quotes
              </Link>
              <Link
                href="/factory"
                className="px-3 py-1.5 text-slate-600 hover:text-slate-900 rounded-md hover:bg-slate-100 transition"
              >
                Factory Sheet
              </Link>
              <Link
                href="/payments"
                className="px-3 py-1.5 text-slate-600 hover:text-slate-900 rounded-md hover:bg-slate-100 transition"
              >
                Payments
              </Link>
              <Link
                href="/dashboard"
                className="px-3 py-1.5 text-slate-600 hover:text-slate-900 rounded-md hover:bg-slate-100 transition"
              >
                Dashboard
              </Link>
              <Link
                href="/customers"
                className="px-3 py-1.5 text-slate-600 hover:text-slate-900 rounded-md hover:bg-slate-100 transition"
              >
                Customers
              </Link>
              <Link
                href="/settings"
                className="px-3 py-1.5 text-slate-600 hover:text-slate-900 rounded-md hover:bg-slate-100 transition"
              >
                Settings
              </Link>
              <Link
                href="/admin/users"
                className="px-3 py-1.5 text-slate-600 hover:text-slate-900 rounded-md hover:bg-slate-100 transition"
              >
                Users
              </Link>
              <Link href="/admin/backup" className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-md transition">
                Backup
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 mt-8 space-y-6">
        {/* Card 1: JSON Export & Import */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center gap-3 border-b pb-4 mb-5">
            <span className="text-2xl">📦</span>
            <div>
              <h2 className="text-base font-bold text-slate-900">Full JSON Backup & Restore</h2>
              <p className="text-xs text-slate-500">
                Exports all quotations, sheet rows, audit logs, settings, and customer entities as a portable JSON document.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Download Backup */}
            <div className="p-5 bg-blue-50/60 rounded-xl border border-blue-100 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-blue-900 mb-1">Download Database Backup</h3>
                <p className="text-xs text-blue-700 mb-4">
                  Generates an encrypted/verified JSON snapshot of all system tables.
                </p>
              </div>
              <a
                href="/api/backup"
                download
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition"
              >
                <span>⬇️</span>
                <span>Download JSON Backup</span>
              </a>
            </div>

            {/* Restore Backup */}
            <div className="p-5 bg-amber-50/60 rounded-xl border border-amber-100 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-amber-900 mb-1">Restore from Backup</h3>
                <p className="text-xs text-amber-700 mb-4">
                  Upload a previously exported JSON backup file to restore records.
                </p>
              </div>
              <label className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer transition">
                <span>⬆️</span>
                <span>{restoring ? "Restoring Data..." : "Upload JSON to Restore"}</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleRestoreFile}
                  disabled={restoring}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Card 2: CLI Automated Snapshot Tool */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center gap-3 border-b pb-4 mb-4">
            <span className="text-2xl">⚡</span>
            <div>
              <h2 className="text-base font-bold text-slate-900">CLI Automated Backup Script</h2>
              <p className="text-xs text-slate-500">
                Create exact byte-for-byte SQLite snapshots with timestamps on the host server.
              </p>
            </div>
          </div>

          <div className="bg-slate-900 text-slate-200 p-4 rounded-xl font-mono text-xs space-y-2 mb-4">
            <p className="text-slate-400"># Run automated SQLite backup from terminal:</p>
            <p className="text-emerald-400 font-bold">$ npm run backup</p>
            <p className="text-slate-400 mt-2"># Output:</p>
            <p className="text-slate-300">✓ SQLite backup created successfully!</p>
            <p className="text-slate-300">  File: /gce-quote-manager/backups/dev_20261024_023126.db</p>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Snapshots are stored permanently in the <code className="bg-slate-100 px-1 py-0.5 rounded font-mono font-bold">./backups</code> directory. You can set up a crontab entry (e.g. <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">0 2 * * * cd /path/to/app && npm run backup</code>) for automated nightly database archives.
          </p>
        </div>
      </main>
    </div>
  );
}

