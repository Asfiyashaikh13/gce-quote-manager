"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { SevenTabsNav } from "@/components/SevenTabsNav";
import { formatIndianCurrency } from "@/lib/calc";

interface ExpenseItem {
  id: string;
  date: string;
  item: string;
  amount: number;
  vendorId: string | null;
  vendorName: string;
  vendorMobile: string;
  paymentMode: string;
  hasBill: boolean;
  category: string;
  status: string;
  notes: string;
}

interface Summary {
  totalRecords: number;
  totalAmount: number;
  purchaseAmount: number;
  siteExpenseAmount: number;
  cashTotal: number;
  upiTotal: number;
  billedCount: number;
  unbilledCount: number;
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modeFilter, setModeFilter] = useState("ALL");
  const [billFilter, setBillFilter] = useState("ALL");

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formDate, setFormDate] = useState("");
  const [formItem, setFormItem] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formVendor, setFormVendor] = useState("");
  const [formMode, setFormMode] = useState("UPI");
  const [formHasBill, setFormHasBill] = useState(true);
  const [formCategory, setFormCategory] = useState("PURCHASE");
  const [formStatus, setFormStatus] = useState("RECEIVED");
  const [formNotes, setFormNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const fetchExpenses = async () => {
    try {
      const res = await fetch("/api/expenses");
      const data = await res.json();
      if (data.success) {
        setExpenses(data.expenses);
        setSummary(data.summary);
      }
    } catch (err) {
      console.error("Failed to load expenses:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch("/api/expenses");
        const data = await res.json();
        if (ignore) return;
        if (data.success) {
          setExpenses(data.expenses);
          setSummary(data.summary);
        }
      } catch (err) {
        console.error("Failed to load expenses:", err);
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
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormItem("");
    setFormAmount("");
    setFormVendor("");
    setFormMode("UPI");
    setFormHasBill(true);
    setFormCategory("PURCHASE");
    setFormStatus("RECEIVED");
    setFormNotes("");
    setModalOpen(true);
  };

  const openEditModal = (e: ExpenseItem) => {
    setEditingId(e.id);
    setFormDate(e.date);
    setFormItem(e.item);
    setFormAmount(e.amount.toString());
    setFormVendor(e.vendorName);
    setFormMode(e.paymentMode);
    setFormHasBill(e.hasBill);
    setFormCategory(e.category);
    setFormStatus(e.status);
    setFormNotes(e.notes);
    setModalOpen(true);
  };

  const handleSave = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!formItem.trim() || !formAmount) return;

    try {
      setIsSaving(true);
      const payload = {
        id: editingId,
        date: formDate,
        item: formItem.trim(),
        amount: parseFloat(formAmount) || 0,
        vendorName: formVendor.trim(),
        paymentMode: formMode,
        hasBill: formHasBill,
        category: formCategory,
        status: formStatus,
        notes: formNotes.trim(),
      };

      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setModalOpen(false);
        fetchExpenses();
      }
    } catch (err) {
      console.error("Failed to save expense:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const filtered = expenses.filter((e) => {
    const matchesSearch =
      e.item.toLowerCase().includes(search.toLowerCase()) ||
      e.vendorName.toLowerCase().includes(search.toLowerCase());
    const matchesMode = modeFilter === "ALL" || e.paymentMode === modeFilter;
    const matchesBill =
      billFilter === "ALL" ||
      (billFilter === "YES" && e.hasBill) ||
      (billFilter === "NO" && !e.hasBill);
    return matchesSearch && matchesMode && matchesBill;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      <SevenTabsNav currentTab="expenses" />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-rose-100 text-rose-800 text-xs font-bold rounded">
                TAB 5
              </span>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Purchase &bull; Expense Tracker
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Material purchases, site conveyance, hardware expenses, Cash/UPI records, and GST Bill verification
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
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>+ Add Purchase / Expense</span>
            </button>
          </div>
        </div>

        {/* 4 Summary Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Total Expenses &amp; Purchases
              </p>
              <p className="text-2xl font-black text-slate-900 mt-1">
                {summary ? formatIndianCurrency(summary.totalAmount) : "₹0.00"}
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-lg">
              🛒
            </div>
          </div>

          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Raw Material Purchases
              </p>
              <p className="text-2xl font-black text-slate-900 mt-1">
                {summary ? formatIndianCurrency(summary.purchaseAmount) : "₹0.00"}
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center font-bold text-lg">
              🏗️
            </div>
          </div>

          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Cash vs UPI Split
              </p>
              <div className="flex items-center gap-2 mt-1.5 font-mono text-xs font-bold">
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded border border-emerald-200">
                  UPI: {summary ? formatIndianCurrency(summary.upiTotal) : "0"}
                </span>
                <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded border border-slate-300">
                  Cash: {summary ? formatIndianCurrency(summary.cashTotal) : "0"}
                </span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg">
              💳
            </div>
          </div>

          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                GST Invoice Status
              </p>
              <div className="flex items-center gap-2 mt-1.5 font-bold text-xs">
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
                  {summary?.billedCount || 0} Tax Invoice
                </span>
                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full">
                  {summary?.unbilledCount || 0} Slip / Voucher
                </span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-lg">
              📑
            </div>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="p-3 bg-white rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <span className="text-slate-400">🔍</span>
            <input
              type="text"
              placeholder="Search item, material, or vendor name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent border-none focus:outline-none text-slate-800 placeholder-slate-400 font-medium"
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-semibold">Mode:</span>
              <select
                value={modeFilter}
                onChange={(e) => setModeFilter(e.target.value)}
                className="px-2 py-1 border border-slate-300 rounded bg-slate-50 font-semibold text-slate-700 focus:outline-none"
              >
                <option value="ALL">All Modes</option>
                <option value="UPI">UPI</option>
                <option value="CASH">CASH</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-semibold">Invoice:</span>
              <select
                value={billFilter}
                onChange={(e) => setBillFilter(e.target.value)}
                className="px-2 py-1 border border-slate-300 rounded bg-slate-50 font-semibold text-slate-700 focus:outline-none"
              >
                <option value="ALL">All Records</option>
                <option value="YES">Tax Invoice (With GST)</option>
                <option value="NO">Voucher / Slip</option>
              </select>
            </div>
          </div>
        </div>

        {/* Expenses Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Item / Description</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4">Vendor</th>
                  <th className="py-3 px-4 text-center">Cash / UPI</th>
                  <th className="py-3 px-4 text-center">Tax Invoice?</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4">Notes</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="text-center py-10 text-slate-400 font-medium">
                      Loading purchases &amp; expenses...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-10 text-slate-400">
                      No expenses found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-mono font-medium text-slate-600">
                        {e.date}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {e.item}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-rose-700 text-sm">
                        {formatIndianCurrency(e.amount)}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-700">
                        {e.vendorName}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                            e.paymentMode === "UPI"
                              ? "bg-purple-100 text-purple-800 border border-purple-200"
                              : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          }`}
                        >
                          {e.paymentMode}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {e.hasBill ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            ✓ Yes Bill
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            ✗ No Bill
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {e.status === "PENDING" && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-300">
                            Pending
                          </span>
                        )}
                        {e.status === "FOLLOW_UP" && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            Follow Up
                          </span>
                        )}
                        {e.status === "RECEIVED" && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-300">
                            Received
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px] max-w-xs truncate">
                        {e.notes || "—"}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => openEditModal(e)}
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

      {/* Add / Edit Expense Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-black text-slate-900 text-lg">
                {editingId ? "Edit Expense Entry" : "Record Purchase / Expense"}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-rose-700 mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-rose-300 rounded-lg text-xs font-mono font-bold text-rose-700 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Item / Description *
                </label>
                <input
                  type="text"
                  required
                  value={formItem}
                  onChange={(e) => setFormItem(e.target.value)}
                  placeholder="e.g. 12mm Toughened Glass Float, Hardware Screws, Site Labor"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Vendor / Paid To</label>
                  <input
                    type="text"
                    value={formVendor}
                    onChange={(e) => setFormVendor(e.target.value)}
                    placeholder="e.g. Veera Glass, Sri Balaji"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white font-semibold focus:outline-none"
                  >
                    <option value="PURCHASE">Raw Material Purchase</option>
                    <option value="SITE_EXPENSE">Site Expense / Labor</option>
                    <option value="TRANSPORT">Transport / Unloading</option>
                    <option value="OTHER">Other Expense</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Payment Mode</label>
                  <select
                    value={formMode}
                    onChange={(e) => setFormMode(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white font-semibold focus:outline-none"
                  >
                    <option value="UPI">UPI (9945988552@upi)</option>
                    <option value="CASH">CASH</option>
                    <option value="BANK_TRANSFER">Bank Transfer (SBI)</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tax Invoice Available?</label>
                  <div className="flex items-center gap-4 mt-2">
                    <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-700">
                      <input
                        type="radio"
                        checked={formHasBill === true}
                        onChange={() => setFormHasBill(true)}
                      />
                      <span>Yes (Tax Invoice)</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-700">
                      <input
                        type="radio"
                        checked={formHasBill === false}
                        onChange={() => setFormHasBill(false)}
                      />
                      <span>No (Slip / Voucher)</span>
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="e.g. Paid via UPI reference #VG-942 for Ravi Sir Bhartiya City project"
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
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold shadow-xs transition cursor-pointer"
                >
                  {isSaving ? "Saving..." : editingId ? "Save Changes" : "Save Expense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
