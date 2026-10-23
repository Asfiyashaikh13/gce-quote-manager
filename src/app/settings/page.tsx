"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Settings state
  const [roundStep, setRoundStep] = useState("76.2");
  const [glassDeduction, setGlassDeduction] = useState("7");
  const [gstRate, setGstRate] = useState("18");
  const [homeState, setHomeState] = useState("Karnataka");
  const [validityDays, setValidityDays] = useState("57");
  const [companyName, setCompanyName] = useState("GLASS CARE ENTERPRISES");
  const [companyAddress, setCompanyAddress] = useState("Near Nagwara, Manyata Tech Park");
  const [companyPhone, setCompanyPhone] = useState("7411415842");
  const [bankName, setBankName] = useState("State Bank of India");
  const [bankBranch, setBankBranch] = useState("Masque Road, Richards Town, Bangalore 560005");
  const [bankAccount, setBankAccount] = useState("42443380892");
  const [bankIfsc, setBankIfsc] = useState("SBIN0002263");
  const [bankUpi, setBankUpi] = useState("9945988552@upi");
  const [terms, setTerms] = useState(
    `1] Order once confirmed\n2] Any complaint related to processing quality should be informed at time of unloading duly remarked on DC\n3] All disputes shall be subject to Bangalore jurisdiction only\n4] Initial payment 70% of gross price to be paid at the time of ordering\n5] Interim payment 20% of gross price on delivery pallet glass & material of the goods to be used for the work\n6] Final payment 10% of gross price on completion of works.`
  );

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    let ignore = false;
    async function loadSettings() {
      try {
        const res = await fetch("/api/settings");
        const json = await res.json();
        if (!ignore && json.success && json.settings) {
          const s = json.settings;
          if (s.roundStep) setRoundStep(s.roundStep);
          if (s.glassDeduction) setGlassDeduction(s.glassDeduction);
          if (s.gstRate) setGstRate(s.gstRate);
          if (s.homeState) setHomeState(s.homeState);
          if (s.validityDays) setValidityDays(s.validityDays);
          if (s.companyName) setCompanyName(s.companyName);
          if (s.companyAddress) setCompanyAddress(s.companyAddress);
          if (s.companyPhone) setCompanyPhone(s.companyPhone);
          if (s.bankName) setBankName(s.bankName);
          if (s.bankBranch) setBankBranch(s.bankBranch);
          if (s.bankAccount) setBankAccount(s.bankAccount);
          if (s.bankIfsc) setBankIfsc(s.bankIfsc);
          if (s.bankUpi) setBankUpi(s.bankUpi);
          if (s.terms) setTerms(s.terms);
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    loadSettings();
    return () => {
      ignore = true;
    };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: {
            roundStep,
            glassDeduction,
            gstRate,
            homeState,
            validityDays,
            companyName,
            companyAddress,
            companyPhone,
            bankName,
            bankBranch,
            bankAccount,
            bankIfsc,
            bankUpi,
            terms,
          },
        }),
      });

      const json = await res.json();
      if (json.success) {
        showToast("System settings saved successfully!");
      } else {
        showToast(json.error || "Failed to save settings");
      }
    } catch (err) {
      console.error(err);
      showToast("Error saving settings");
    } finally {
      setSaving(false);
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
                <h1 className="text-base font-bold text-slate-900 leading-tight">System Settings</h1>
                <p className="text-xs text-slate-500">Calc Engine Rules • Bank Details • Quotation Terms</p>
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
              <Link href="/settings" className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-md transition">
                Settings
              </Link>
              <Link
                href="/admin/users"
                className="px-3 py-1.5 text-slate-600 hover:text-slate-900 rounded-md hover:bg-slate-100 transition"
              >
                Users
              </Link>
              <Link
                href="/admin/backup"
                className="px-3 py-1.5 text-slate-600 hover:text-slate-900 rounded-md hover:bg-slate-100 transition"
              >
                Backup
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Form */}
      <main className="max-w-4xl mx-auto px-4 mt-6">
        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">
            <div className="animate-spin text-2xl mb-2">⚙️</div>
            <p className="font-medium text-sm">Loading Configuration...</p>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            {/* Section 1: Calc Engine Parameters */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
              <h2 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
                <span>📐</span>
                <span>Calculation Engine Defaults</span>
              </h2>
              <p className="text-xs text-slate-500 mb-4">
                Controls rounding steps, glass deduction, tax rates and home state for GST calculations.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Rounding Step (mm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={roundStep}
                    onChange={(e) => setRoundStep(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                    required
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">Default: 76.2 mm (3 inches)</span>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Glass Cut Deduction (mm)
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={glassDeduction}
                    onChange={(e) => setGlassDeduction(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                    required
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">Default: 7 mm (Frame - 7mm)</span>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Default GST Rate (%)
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={gstRate}
                    onChange={(e) => setGstRate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                    required
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">Default: 18% (9% CGST + 9% SGST)</span>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Home State
                  </label>
                  <input
                    type="text"
                    value={homeState}
                    onChange={(e) => setHomeState(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    required
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">Default: Karnataka</span>
                </div>
              </div>
            </div>

            {/* Section 2: Quotation Defaults */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
              <h2 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
                <span>📄</span>
                <span>Quotation Defaults & Terms</span>
              </h2>
              <p className="text-xs text-slate-500 mb-4">
                Default validity period and terms & conditions printed on quotations.
              </p>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Default Validity (Days)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={validityDays}
                    onChange={(e) => setValidityDays(e.target.value)}
                    className="w-40 px-3 py-2 border border-slate-300 rounded-lg font-mono"
                    required
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">Default: 57 days</span>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Standard Terms & Conditions
                  </label>
                  <textarea
                    rows={6}
                    value={terms}
                    onChange={(e) => setTerms(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-xs leading-relaxed"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Company & Bank Details */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
              <h2 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
                <span>🏦</span>
                <span>Company & Banking Information</span>
              </h2>
              <p className="text-xs text-slate-500 mb-4">
                Details printed on PDF invoices, receipts, and used for UPI QR code payments.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Company Name</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={companyPhone}
                    onChange={(e) => setCompanyPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Company Address</label>
                  <input
                    type="text"
                    value={companyAddress}
                    onChange={(e) => setCompanyAddress(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Bank Name</label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Account Number</label>
                  <input
                    type="text"
                    value={bankAccount}
                    onChange={(e) => setBankAccount(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">IFSC Code</label>
                  <input
                    type="text"
                    value={bankIfsc}
                    onChange={(e) => setBankIfsc(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">UPI ID (for QR Code)</label>
                  <input
                    type="text"
                    value={bankUpi}
                    onChange={(e) => setBankUpi(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-blue-700 font-bold"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Bank Branch Address</label>
                  <input
                    type="text"
                    value={bankBranch}
                    onChange={(e) => setBankBranch(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end gap-4">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xs transition disabled:opacity-50 text-sm"
              >
                {saving ? "Saving Changes..." : "Save System Settings"}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
