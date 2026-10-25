"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { SevenTabsNav } from "@/components/SevenTabsNav";
import { formatIndianCurrency } from "@/lib/calc";

interface MonthProfitRecord {
  id: string;
  monthYear: string;
  salesAmount: number;
  purchaseAmount: number;
  expenseAmount: number;
  profitAmount: number;
  partnerPercent: number;
  partnerAmount: number;
  ownerAmount: number;
  status: string;
  notes: string;
}

interface LiveSummary {
  totalSales: number;
  totalPurchases: number;
  totalExpenses: number;
  totalCosts?: number;
  netProfit: number;
  partner30Percent: number;
  owner70Percent: number;
  ownerSpent?: number;
  partnerSpent?: number;
  partnerFinalPayout?: number;
  ownerFinalPayout?: number;
  settlementNote?: string;
  partnerRule: string;
  formula: string;
}

export default function ProfitPage() {
  const [records, setRecords] = useState<MonthProfitRecord[]>([]);
  const [liveSummary, setLiveSummary] = useState<LiveSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal for new / edit month
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formMonth, setFormMonth] = useState("10/2026");
  const [formSales, setFormSales] = useState("0");
  const [formPurchase, setFormPurchase] = useState("0");
  const [formExpense, setFormExpense] = useState("0");
  const [formPartnerPercent, setFormPartnerPercent] = useState("30");
  const [formStatus, setFormStatus] = useState("RECEIVED");
  const [formNotes, setFormNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const fetchProfit = async () => {
    try {
      const res = await fetch("/api/profit");
      const data = await res.json();
      if (data.success) {
        setRecords(data.months);
        setLiveSummary(data.liveSummary);
      }
    } catch (err) {
      console.error("Failed to load profit records:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch("/api/profit");
        const data = await res.json();
        if (ignore) return;
        if (data.success) {
          setRecords(data.months);
          setLiveSummary(data.liveSummary);
        }
      } catch (err) {
        console.error("Failed to load profit records:", err);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, []);

  const openAddModal = () => {
    setEditingId(null);
    const date = new Date();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yyyy = date.getFullYear();
    setFormMonth(`${mm}/${yyyy}`);
    // Auto-prefill from live if available
    if (liveSummary) {
      setFormSales(liveSummary.totalSales.toString());
      setFormPurchase(liveSummary.totalPurchases.toString());
      setFormExpense(liveSummary.totalExpenses.toString());
    } else {
      setFormSales("0");
      setFormPurchase("0");
      setFormExpense("0");
    }
    setFormPartnerPercent("30");
    setFormStatus("RECEIVED");
    setFormNotes("Auto calculated from Quotes and Purchase records");
    setModalOpen(true);
  };

  const openEditModal = (r: MonthProfitRecord) => {
    setEditingId(r.id);
    setFormMonth(r.monthYear);
    setFormSales(r.salesAmount.toString());
    setFormPurchase(r.purchaseAmount.toString());
    setFormExpense(r.expenseAmount.toString());
    setFormPartnerPercent(r.partnerPercent.toString());
    setFormStatus(r.status);
    setFormNotes(r.notes);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      const payload = {
        id: editingId,
        monthYear: formMonth.trim(),
        salesAmount: parseFloat(formSales) || 0,
        purchaseAmount: parseFloat(formPurchase) || 0,
        expenseAmount: parseFloat(formExpense) || 0,
        partnerPercent: parseFloat(formPartnerPercent) || 30,
        status: formStatus,
        notes: formNotes.trim(),
      };

      const res = await fetch("/api/profit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setModalOpen(false);
        fetchProfit();
      }
    } catch (err) {
      console.error("Failed to save profit record:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // Live computed preview in modal
  const computedModalProfit =
    (parseFloat(formSales) || 0) -
    (parseFloat(formPurchase) || 0) -
    (parseFloat(formExpense) || 0);
  const computedModalPartner = Math.round(
    computedModalProfit * ((parseFloat(formPartnerPercent) || 30) / 100)
  );
  const computedModalOwner = computedModalProfit - computedModalPartner;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      <SevenTabsNav currentTab="profit" />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-teal-100 text-teal-800 text-xs font-bold rounded">
                TAB 6
              </span>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Monthly Profit &bull; Partner 30% / Owner 70% Profit Split
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Net Profit formula = Sale &minus; Purchase &minus; Expense &bull; Automated 30/70 profit distribution
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="px-3 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition"
            >
              ← Back to Master Sheet
            </Link>
            <button
              onClick={openAddModal}
              className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>+ Add / Sync Month Entry</span>
            </button>
          </div>
        </div>

        {/* Infographic Banner: Rules & Permissions */}
        <div className="p-4 bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-900 text-white rounded-2xl shadow-lg border border-teal-800/40 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">🌙</span>
              <div>
                <span className="font-extrabold text-amber-300 text-xs uppercase tracking-wide">
                  Daily Business Routine
                </span>
                <p className="text-sm font-bold text-white">
                  Daily evening 10-minute reconciliation &bull; 9:00 PM closing
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <span className="px-2.5 py-1 bg-white/10 rounded-lg font-mono font-bold text-emerald-300 border border-emerald-400/30">
                Partner: VIEW ONLY
              </span>
              <span className="px-2.5 py-1 bg-teal-500 text-slate-950 rounded-lg font-mono font-black shadow-xs">
                Owner: EDIT
              </span>
              <span className="text-slate-300 hidden sm:inline text-[11px]">
                &bull; Automated Partner Email/WhatsApp Notification
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-teal-800/40 flex flex-wrap items-center justify-between text-xs text-slate-300 gap-2">
            <div>
              <span className="text-amber-400 font-bold">Auto Formula:</span>{" "}
              <code className="font-mono text-emerald-300 font-bold">
                Profit = Sale &minus; Purchase &minus; Expense &rarr; Partner 30% Auto &bull; Owner 70% Auto
              </code>
            </div>
            <div className="text-right font-extrabold text-emerald-400">
              Real-Time Profit &amp; Distribution Ledger
            </div>
          </div>
        </div>

        {/* Live Aggregation Summary Cards */}
        {liveSummary && (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Total Sales Revenue
              </p>
              <p className="text-2xl font-black text-slate-900 mt-1">
                {formatIndianCurrency(liveSummary.totalSales)}
              </p>
              <p className="text-[10px] text-slate-500 mt-1">From all live quotes</p>
            </div>

            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Total Raw Purchases
              </p>
              <p className="text-2xl font-black text-rose-700 mt-1">
                {formatIndianCurrency(liveSummary.totalPurchases)}
              </p>
              <p className="text-[10px] text-slate-500 mt-1">Glass, profiles, hardware</p>
            </div>

            <div className="p-4 bg-teal-50/70 border border-teal-300 rounded-xl shadow-xs">
              <p className="text-[11px] font-bold text-teal-800 uppercase tracking-wider">
                Partner Share (30%)
              </p>
              <p className="text-2xl font-black text-teal-900 mt-1 font-mono">
                {formatIndianCurrency(liveSummary.partner30Percent)}
              </p>
              <span className="inline-block px-1.5 py-0.2 bg-teal-200 text-teal-900 text-[10px] rounded font-bold mt-1">
                Auto 30% Split
              </span>
            </div>

            <div className="p-4 bg-emerald-50/70 border border-emerald-300 rounded-xl shadow-xs">
              <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                Owner Share (70%)
              </p>
              <p className="text-2xl font-black text-emerald-900 mt-1 font-mono">
                {formatIndianCurrency(liveSummary.owner70Percent)}
              </p>
              <span className="inline-block px-1.5 py-0.2 bg-emerald-200 text-emerald-900 text-[10px] rounded font-bold mt-1">
                Owner 70% Share
              </span>
            </div>
          </div>
        )}

        {/* Two-Party Project Expense Reconciliation Card (Zero Confusion) */}
        {liveSummary && (
          <div className="p-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl border border-slate-700 shadow-md space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-700">
              <div className="flex items-center gap-2">
                <span className="text-lg">⚖️</span>
                <h3 className="text-sm font-bold text-white">
                  Shared Project Expense &amp; Payout Reconciliation (No Confusion)
                </h3>
              </div>
              <span className="text-[11px] text-slate-300">
                Both parties get 100% of out-of-pocket costs reimbursed first, then net profit split 30% / 70%
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Owner Account Payout Box */}
              <div className="p-3.5 bg-blue-950/60 rounded-xl border border-blue-500/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-300 text-xs flex items-center gap-1.5">
                    <span>👤</span>
                    <span>Owner Account Payout</span>
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded font-bold">
                    70% Profit + Reimbursed Costs
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-slate-300">
                    <span>Out-of-Pocket Expenses Paid:</span>
                    <span className="font-mono font-bold text-blue-200">
                      {formatIndianCurrency(liveSummary.ownerSpent || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Owner Profit Share (70%):</span>
                    <span className="font-mono font-bold text-emerald-400">
                      +{formatIndianCurrency(liveSummary.owner70Percent || 0)}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-blue-800/60 flex justify-between items-center">
                    <span className="font-bold text-white">Owner Total Take-Home:</span>
                    <span className="font-mono font-black text-base text-blue-300">
                      {formatIndianCurrency((liveSummary.ownerSpent || 0) + (liveSummary.owner70Percent || 0))}
                    </span>
                  </div>
                </div>
              </div>

              {/* Partner Account Payout Box */}
              <div className="p-3.5 bg-teal-950/60 rounded-xl border border-teal-500/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-teal-300 text-xs flex items-center gap-1.5">
                    <span>🤝</span>
                    <span>Partner Account Payout</span>
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-teal-500/20 text-teal-300 rounded font-bold">
                    30% Profit + Reimbursed Costs
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-slate-300">
                    <span>Out-of-Pocket Expenses Paid:</span>
                    <span className="font-mono font-bold text-teal-200">
                      {formatIndianCurrency(liveSummary.partnerSpent || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Partner Profit Share (30%):</span>
                    <span className="font-mono font-bold text-emerald-400">
                      +{formatIndianCurrency(liveSummary.partner30Percent || 0)}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-teal-800/60 flex justify-between items-center">
                    <span className="font-bold text-white">Partner Total Take-Home:</span>
                    <span className="font-mono font-black text-base text-teal-300">
                      {formatIndianCurrency((liveSummary.partnerSpent || 0) + (liveSummary.partner30Percent || 0))}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Profit Months Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Month</th>
                  <th className="py-3 px-4 text-right">Sale (₹)</th>
                  <th className="py-3 px-4 text-right">Purchase (₹)</th>
                  <th className="py-3 px-4 text-right">Expense (₹)</th>
                  <th className="py-3 px-4 text-right text-emerald-800 bg-emerald-50/50">
                    Net Profit (₹)
                  </th>
                  <th className="py-3 px-4 text-right text-teal-800 bg-teal-50/50">
                    Partner 30%
                  </th>
                  <th className="py-3 px-4 text-right text-emerald-900 bg-emerald-100/50">
                    Owner 70%
                  </th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4">Notes</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="text-center py-10 text-slate-400 font-medium">
                      Loading profit ledger...
                    </td>
                  </tr>
                ) : records.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-10 text-slate-400">
                      No profit records entered yet. Click &quot;Add / Sync Month Entry&quot; to begin.
                    </td>
                  </tr>
                ) : (
                  records.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-black font-mono text-slate-900 text-sm">
                        {r.monthYear}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">
                        {formatIndianCurrency(r.salesAmount)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-medium text-rose-700">
                        {formatIndianCurrency(r.purchaseAmount)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-medium text-amber-700">
                        {formatIndianCurrency(r.expenseAmount)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-emerald-800 bg-emerald-50/30 text-sm">
                        {formatIndianCurrency(r.profitAmount)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-teal-800 bg-teal-50/30 text-sm">
                        {formatIndianCurrency(r.partnerAmount)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-emerald-950 bg-emerald-100/30 text-sm">
                        {formatIndianCurrency(r.ownerAmount)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {r.status === "PENDING" && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-300">
                            Pending
                          </span>
                        )}
                        {r.status === "FOLLOW_UP" && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            Follow Up
                          </span>
                        )}
                        {r.status === "RECEIVED" && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-300">
                            Settled / Received
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600 text-[11px] max-w-xs truncate">
                        {r.notes || "—"}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => openEditModal(r)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded text-xs transition cursor-pointer"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Add / Edit Profit Month Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-black text-slate-900 text-lg">
                {editingId ? "Edit Month Profit Ledger" : "Add Monthly Profit Entry"}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Month / Year *
                  </label>
                  <input
                    type="text"
                    required
                    value={formMonth}
                    onChange={(e) => setFormMonth(e.target.value)}
                    placeholder="e.g. 10/2026 or Oct-2026"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Partner Split %
                  </label>
                  <input
                    type="number"
                    value={formPartnerPercent}
                    onChange={(e) => setFormPartnerPercent(e.target.value)}
                    placeholder="30"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-emerald-800 mb-1">
                    Sale (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formSales}
                    onChange={(e) => setFormSales(e.target.value)}
                    className="w-full px-3 py-2 border border-emerald-300 rounded-lg text-xs font-mono font-bold text-emerald-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-rose-800 mb-1">
                    Purchase (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formPurchase}
                    onChange={(e) => setFormPurchase(e.target.value)}
                    className="w-full px-3 py-2 border border-rose-300 rounded-lg text-xs font-mono font-bold text-rose-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-amber-800 mb-1">
                    Expense (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formExpense}
                    onChange={(e) => setFormExpense(e.target.value)}
                    className="w-full px-3 py-2 border border-amber-300 rounded-lg text-xs font-mono font-bold text-amber-900 focus:outline-none"
                  />
                </div>
              </div>

              {/* Real-time Calculation Preview Card */}
              <div className="p-3 bg-teal-50/70 border border-teal-200 rounded-xl space-y-2">
                <p className="font-bold text-teal-900 text-xs">
                  ⚡ Auto Calculation Preview:
                </p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 bg-white rounded border border-teal-200">
                    <p className="text-[10px] text-slate-500 font-semibold">Net Profit</p>
                    <p className="font-black font-mono text-emerald-800 text-sm mt-0.5">
                      {formatIndianCurrency(computedModalProfit)}
                    </p>
                  </div>
                  <div className="p-2 bg-white rounded border border-teal-200">
                    <p className="text-[10px] text-teal-700 font-semibold">Partner 30%</p>
                    <p className="font-black font-mono text-teal-800 text-sm mt-0.5">
                      {formatIndianCurrency(computedModalPartner)}
                    </p>
                  </div>
                  <div className="p-2 bg-white rounded border border-teal-200">
                    <p className="text-[10px] text-emerald-700 font-semibold">Owner 70%</p>
                    <p className="font-black font-mono text-emerald-900 text-sm mt-0.5">
                      {formatIndianCurrency(computedModalOwner)}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Status</label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white font-semibold focus:outline-none"
                >
                  <option value="RECEIVED">Settled / Received (Green)</option>
                  <option value="FOLLOW_UP">Follow Up (Yellow)</option>
                  <option value="PENDING">Pending (Red)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="e.g. October month settlement including Ravi Sir Bhartiya City project"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-bold shadow-xs transition cursor-pointer"
                >
                  {isSaving ? "Saving..." : editingId ? "Save Changes" : "Save Month Entry"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
