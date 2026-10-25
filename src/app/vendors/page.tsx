"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { SevenTabsNav } from "@/components/SevenTabsNav";
import { formatIndianCurrency } from "@/lib/calc";

interface VendorItem {
  id: string;
  name: string;
  mobile: string;
  workType: string;
  rate: string;
  balanceDue: number;
  status: string;
  notes: string;
  expensesCount: number;
}

interface Summary {
  totalVendors: number;
  totalBalanceDue: number;
  pendingCount: number;
  followUpCount: number;
  receivedCount: number;
}

export default function VendorsPage() {
  const [vendors, setVendors] = useState<VendorItem[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formMobile, setFormMobile] = useState("");
  const [formWork, setFormWork] = useState("");
  const [formRate, setFormRate] = useState("");
  const [formBalance, setFormBalance] = useState("0");
  const [formStatus, setFormStatus] = useState("PENDING");
  const [formNotes, setFormNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const fetchVendors = async () => {
    try {
      const res = await fetch("/api/vendors");
      const data = await res.json();
      if (data.success) {
        setVendors(data.vendors);
        setSummary(data.summary);
      }
    } catch (err) {
      console.error("Failed to load vendors:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch("/api/vendors");
        const data = await res.json();
        if (ignore) return;
        if (data.success) {
          setVendors(data.vendors);
          setSummary(data.summary);
        }
      } catch (err) {
        console.error("Failed to load vendors:", err);
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
    setFormName("");
    setFormMobile("");
    setFormWork("Glass & Fabrication");
    setFormRate("");
    setFormBalance("0");
    setFormStatus("PENDING");
    setFormNotes("");
    setModalOpen(true);
  };

  const openEditModal = (v: VendorItem) => {
    setEditingId(v.id);
    setFormName(v.name);
    setFormMobile(v.mobile);
    setFormWork(v.workType);
    setFormRate(v.rate);
    setFormBalance(v.balanceDue.toString());
    setFormStatus(v.status);
    setFormNotes(v.notes);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    try {
      setIsSaving(true);
      const payload = {
        id: editingId,
        name: formName.trim(),
        mobile: formMobile.trim(),
        workType: formWork.trim(),
        rate: formRate.trim(),
        balanceDue: parseFloat(formBalance) || 0,
        status: formStatus,
        notes: formNotes.trim(),
      };

      const res = await fetch("/api/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setModalOpen(false);
        fetchVendors();
      }
    } catch (err) {
      console.error("Error saving vendor:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const filtered = vendors.filter((v) => {
    const matchesSearch =
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.workType.toLowerCase().includes(search.toLowerCase()) ||
      v.mobile.includes(search);
    const matchesStatus = statusFilter === "ALL" || v.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      <SevenTabsNav currentTab="vendors" />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Header & KPI Summary */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-xs font-bold rounded">
                TAB 4
              </span>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Vendor List &bull; Payment Dena Hai
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Vendor details, agreed unit rates, payment dues, and status tracking (Red/Yellow/Green)
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
              className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>+ Add New Vendor</span>
            </button>
          </div>
        </div>

        {/* 3 KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Total Vendors
              </p>
              <p className="text-2xl font-black text-slate-900 mt-1">
                {summary?.totalVendors || 0}
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-lg">
              🏢
            </div>
          </div>

          <div className="p-4 bg-white rounded-xl border border-rose-200 shadow-xs flex items-center justify-between bg-rose-50/30">
            <div>
              <p className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">
                Payment Dena Hai (Total Payable)
              </p>
              <p className="text-2xl font-black text-rose-700 mt-1">
                {summary ? formatIndianCurrency(summary.totalBalanceDue) : "₹0.00"}
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-lg">
              ₹
            </div>
          </div>

          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Status Breakdown
              </p>
              <div className="flex items-center gap-2 mt-1.5 text-xs font-bold">
                <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full">
                  {summary?.pendingCount || 0} Pending
                </span>
                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full">
                  {summary?.followUpCount || 0} Follow Up
                </span>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">
                  {summary?.receivedCount || 0} Settled
                </span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-lg">
              ✓
            </div>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="p-3 bg-white rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <span className="text-slate-400">🔍</span>
            <input
              type="text"
              placeholder="Search vendor name, work type, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent border-none focus:outline-none text-slate-800 placeholder-slate-400 font-medium"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-semibold">Filter Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-slate-50 font-semibold text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending (Red)</option>
              <option value="FOLLOW_UP">Follow Up (Yellow)</option>
              <option value="RECEIVED">Settled / Received (Green)</option>
            </select>
          </div>
        </div>

        {/* Vendors Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Vendor Name</th>
                  <th className="py-3 px-4">Mobile &amp; WhatsApp</th>
                  <th className="py-3 px-4">Kaam (Specialty)</th>
                  <th className="py-3 px-4">Rate</th>
                  <th className="py-3 px-4 text-right">Payment Dena Hai</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4">Notes</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-slate-400 font-medium">
                      Loading vendors...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-slate-400">
                      No vendors found matching your filter.
                    </td>
                  </tr>
                ) : (
                  filtered.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-bold text-slate-900 text-sm">
                        {v.name}
                      </td>
                      <td className="py-3 px-4 font-mono">
                        {v.mobile ? (
                          <div className="flex items-center gap-2">
                            <span>{v.mobile}</span>
                            <a
                              href={`https://wa.me/91${v.mobile.replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] px-1.5 py-0.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded border border-emerald-300 font-bold"
                            >
                              WA
                            </a>
                            <a
                              href={`tel:${v.mobile}`}
                              className="text-[10px] px-1.5 py-0.5 bg-sky-50 text-sky-700 hover:bg-sky-100 rounded border border-sky-300 font-bold"
                            >
                              Call
                            </a>
                          </div>
                        ) : (
                          <span className="text-slate-400">&mdash;</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-700">
                        {v.workType}
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                        {v.rate || "—"}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-rose-700 text-sm">
                        {formatIndianCurrency(v.balanceDue)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {v.status === "PENDING" && (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-100 text-red-700 border border-red-300 inline-block">
                            Pending
                          </span>
                        )}
                        {v.status === "FOLLOW_UP" && (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300 inline-block">
                            Follow Up
                          </span>
                        )}
                        {v.status === "RECEIVED" && (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-300 inline-block">
                            Settled / Received
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs truncate text-[11px]">
                        {v.notes || "—"}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => openEditModal(v)}
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

      {/* Add / Edit Vendor Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-black text-slate-900 text-lg">
                {editingId ? "Edit Vendor Details" : "Add New Vendor"}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Vendor / Supplier Name *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Veera Glass, Royal Marble Works"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mobile / WhatsApp</label>
                  <input
                    type="text"
                    value={formMobile}
                    onChange={(e) => setFormMobile(e.target.value)}
                    placeholder="e.g. 9845012345"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kaam / Work Type</label>
                  <input
                    type="text"
                    value={formWork}
                    onChange={(e) => setFormWork(e.target.value)}
                    placeholder="e.g. Toughening, Profiles"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Agreed Rate</label>
                  <input
                    type="text"
                    value={formRate}
                    onChange={(e) => setFormRate(e.target.value)}
                    placeholder="e.g. ₹135/sqft"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-rose-700 mb-1">Payment Dena Hai (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formBalance}
                    onChange={(e) => setFormBalance(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-rose-300 rounded-lg text-xs font-mono font-bold text-rose-700 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Payment Status</label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white font-semibold focus:outline-none"
                >
                  <option value="PENDING">Pending (Red)</option>
                  <option value="FOLLOW_UP">Follow Up (Yellow)</option>
                  <option value="RECEIVED">Settled / Received (Green)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="e.g. Subcontractor for Ravi Sir marble+glass work"
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
                  className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-lg font-bold shadow-xs transition cursor-pointer"
                >
                  {isSaving ? "Saving..." : editingId ? "Save Changes" : "Create Vendor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
