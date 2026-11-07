"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { formatIndianCurrency, calculateQuote } from "@/lib/calc";
import { ALLOWED_STATUS_TRANSITIONS } from "@/lib/quotes/status";
import { generateWhatsAppShareUrl } from "@/lib/quotes/whatsapp";
import { QuoteStatus } from "@prisma/client";
import { SevenTabsNav } from "@/components/SevenTabsNav";

interface QuoteListItem {
  id: string;
  quoteNumber: string;
  version: number;
  status: QuoteStatus;
  customerName: string;
  customerPhone?: string;
  customerBuilding: string;
  customerFlat: string;
  destinationState: string;
  workSummary?: string;
  itemCount: number;
  revisionCount: number;
  subTotal: number;
  gstTotal: number;
  grandTotal: number;
  displayTotal: number;
  displayTotalWords?: string | null;
  createdAt: string;
  validUntil: string | null;
}

interface NewQuoteLineItem {
  id: string;
  description: string;
  frameHeightMm: number;
  frameWidthMm: number;
  quantity: number;
  rate: number;
}

const STANDARD_PRESETS = [
  { name: "Al Shutters 565", rate: 565 },
  { name: "Al Shutters 430", rate: 430 },
  { name: "8mm plain glass", rate: 135 },
  { name: "5mm mirror polished", rate: 145 },
  { name: "Custom Marble Inlay + 12mm Toughened", rate: 850 },
  { name: "Beveled Edge Glass with Brass Trim", rate: 975 },
];

export default function QuotesListPage() {
  const [quotes, setQuotes] = useState<QuoteListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [error, setError] = useState("");
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // New Quote Modal State
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newBuilding, setNewBuilding] = useState("");
  const [newFlat, setNewFlat] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newFactory, setNewFactory] = useState("Veera Glass");
  const [factories, setFactories] = useState<Array<{ id: string; name: string }>>([
    { id: "f1", name: "Veera Glass" },
    { id: "f2", name: "Vendor Sachin" },
  ]);
  const [isCustomFactory, setIsCustomFactory] = useState(false);
  const [customFactoryName, setCustomFactoryName] = useState("");
  const [isSavingNewFactory, setIsSavingNewFactory] = useState(false);
  const [newState, setNewState] = useState("Karnataka");
  const [newFreight, setNewFreight] = useState(0);
  const [newDiscountType, setNewDiscountType] = useState<"NONE" | "PERCENT" | "FLAT">("NONE");
  const [newDiscountVal, setNewDiscountVal] = useState(0);
  const [newItems, setNewItems] = useState<NewQuoteLineItem[]>([
    {
      id: "item-1",
      description: "Al Shutters 565",
      frameHeightMm: 1000,
      frameWidthMm: 500,
      quantity: 1,
      rate: 565,
    },
  ]);
  const [submitting, setSubmitting] = useState(false);

  // Glass Care Sync Modal State
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [syncInput, setSyncInput] = useState("");
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  const handleSyncData = async (payload: unknown) => {
    setSyncLoading(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/integrations/glass-care", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || `Synced ${data.processedCount} quotes from Glass Care!`);
        setSyncResult(`✓ ${data.message || "Successfully synced documents into all 7 tabs!"}`);
        setSyncInput("");
        loadQuotes();
        setTimeout(() => setSyncModalOpen(false), 2200);
      } else {
        setSyncResult(`❌ ${data.error || "Failed to sync"}`);
      }
    } catch (e) {
      setSyncResult(`❌ Network error syncing to Quotation Tracker: ${String(e)}`);
    } finally {
      setSyncLoading(false);
    }
  };

  const handleJsonFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        handleSyncData(parsed);
      } catch {
        setSyncResult("❌ Invalid JSON file. Please upload a valid Glass Care backup JSON.");
      }
    };
    reader.readAsText(file);
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const loadFactories = async () => {
    try {
      const res = await fetch("/api/factories");
      if (res.ok) {
        const data = await res.json();
        if (data.factories && Array.isArray(data.factories) && data.factories.length > 0) {
          setFactories(data.factories);
        }
      }
    } catch (err) {
      console.warn("Failed to load factories:", err);
    }
  };

  const handleQuickSaveFactory = async () => {
    if (!customFactoryName.trim()) return;
    setIsSavingNewFactory(true);
    try {
      const res = await fetch("/api/factories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: customFactoryName.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.factory) {
        setFactories((prev) => {
          if (prev.some((f) => f.name.toLowerCase() === data.factory.name.toLowerCase())) {
            return prev;
          }
          return [...prev, data.factory].sort((a, b) => a.name.localeCompare(b.name));
        });
        setNewFactory(data.factory.name);
        setIsCustomFactory(false);
        setCustomFactoryName("");
        showToast(`Vendor "${data.factory.name}" saved!`);
      } else {
        alert(data.error || "Failed to save vendor");
      }
    } catch {
      alert("Failed to save vendor");
    } finally {
      setIsSavingNewFactory(false);
    }
  };

  const loadQuotes = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (search) params.set("search", search);

      const res = await fetch(`/api/quotes?${params.toString()}`);
      if (!res.ok) {
        if (res.status === 401) {
          setError("Session expired. Please log in again.");
        } else {
          setError("Failed to fetch quotes from server");
        }
        setLoading(false);
        return;
      }
      const data = await res.json();
      setQuotes(data.quotes || []);
      setError("");
      setLoading(false);
    } catch {
      setError("Error connecting to server");
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuotes();
    loadFactories();
    // Auto-poll every 3 seconds so live webhooks from Glass Care reflect on-screen automatically
    const interval = setInterval(loadQuotes, 3000);
    return () => clearInterval(interval);
  }, [statusFilter, search]);

  const handleStatusChange = async (id: string, newStatus: QuoteStatus) => {
    try {
      const res = await fetch(`/api/quotes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setQuotes((prev) => prev.map((q) => (q.id === id ? { ...q, status: newStatus } : q)));
        showToast(`Quote status updated to ${newStatus.replace("_", " ")}`);
      } else {
        const d = await res.json();
        alert(d.error || "Cannot transition status");
      }
    } catch {
      alert("Failed to update status");
    }
  };

  const handleDeleteQuote = async (id: string, quoteNumber: string) => {
    if (!window.confirm(`Are you sure you want to delete quotation ${quoteNumber}?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/quotes/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setQuotes((prev) => prev.filter((q) => q.id !== id));
        showToast(`Quotation ${quoteNumber} deleted`);
      } else {
        const d = await res.json();
        alert(d.error || "Failed to delete quote");
      }
    } catch {
      alert("Failed to delete quote");
    }
  };

  // Live calculation for new quote modal
  const newQuoteCalc = useMemo(() => {
    if (newItems.length === 0) return { subTotal: 0, gstTotal: 0, grandTotal: 0 };
    try {
      const calc = calculateQuote({
        items: newItems.map((it) => ({
          frameHeight: it.frameHeightMm || 0,
          frameWidth: it.frameWidthMm || 0,
          quantity: it.quantity || 1,
          rate: it.rate || 0,
          description: it.description,
        })),
        freight: newFreight || 0,
        discount: newDiscountType !== "NONE" ? { type: newDiscountType, value: newDiscountVal || 0 } : undefined,
        state: newState || "Karnataka",
      });
      return {
        subTotal: calc.totals.subTotal.toNumber(),
        gstTotal: calc.totals.gstTotal.toNumber(),
        grandTotal: calc.totals.grandTotal.toNumber(),
      };
    } catch {
      return { subTotal: 0, gstTotal: 0, grandTotal: 0 };
    }
  }, [newItems, newFreight, newDiscountType, newDiscountVal, newState]);

  const handleAddItemToNewQuote = () => {
    setNewItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}`,
        description: "8mm plain glass",
        frameHeightMm: 1000,
        frameWidthMm: 500,
        quantity: 1,
        rate: 135,
      },
    ]);
  };

  const handleRemoveItemFromNewQuote = (id: string) => {
    if (newItems.length <= 1) return;
    setNewItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleCreateNewQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName.trim()) {
      alert("Please enter customer name");
      return;
    }
    setSubmitting(true);
    try {
      const chosenFactory = isCustomFactory && customFactoryName.trim()
        ? customFactoryName.trim()
        : newFactory;

      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: newCustomerName.trim(),
          customerBuilding: newBuilding.trim(),
          customerFlat: newFlat.trim(),
          customerPhone: newPhone.trim(),
          factoryName: chosenFactory,
          destinationState: newState,
          freight: Number(newFreight) || 0,
          discountType: newDiscountType,
          discountValue: Number(newDiscountVal) || 0,
          items: newItems.map((it) => ({
            description: it.description,
            frameHeightMm: Number(it.frameHeightMm) || 0,
            frameWidthMm: Number(it.frameWidthMm) || 0,
            quantity: Number(it.quantity) || 1,
            rate: Number(it.rate) || 0,
          })),
        }),
      });

      const data = await res.json();
      if (res.ok && data.quote) {
        showToast(`Quotation ${data.quote.quoteNumber} created successfully!`);
        setNewModalOpen(false);
        setIsCustomFactory(false);
        setCustomFactoryName("");
        loadFactories();
        // Reset form
        setNewCustomerName("");
        setNewBuilding("");
        setNewFlat("");
        setNewPhone("");
        setNewItems([
          {
            id: "item-1",
            description: "Al Shutters 565",
            frameHeightMm: 1000,
            frameWidthMm: 500,
            quantity: 1,
            rate: 565,
          },
        ]);
        loadQuotes();
      } else {
        alert(data.error || "Failed to create quote");
      }
    } catch {
      alert("Network error creating quote");
    } finally {
      setSubmitting(false);
    }
  };

  // KPI Calculations
  const totalValue = quotes.reduce((sum, q) => sum + q.displayTotal, 0);
  const activeQuotes = quotes.filter((q) => ["APPROVED", "IN_PRODUCTION"].includes(q.status));
  const activeValue = activeQuotes.reduce((sum, q) => sum + q.displayTotal, 0);
  const pendingQuotes = quotes.filter((q) => ["DRAFT", "SENT"].includes(q.status));
  const pendingValue = pendingQuotes.reduce((sum, q) => sum + q.displayTotal, 0);
  const paidQuotes = quotes.filter((q) => ["DELIVERED", "PAID"].includes(q.status));
  const paidValue = paidQuotes.reduce((sum, q) => sum + q.displayTotal, 0);

  const getStatusBadge = (status: QuoteStatus) => {
    const map: Record<QuoteStatus, string> = {
      DRAFT: "bg-red-50 text-red-700 border-red-300 font-bold",
      SENT: "bg-red-50 text-red-700 border-red-300 font-bold",
      APPROVED: "bg-amber-50 text-amber-800 border-amber-300 font-bold",
      IN_PRODUCTION: "bg-amber-50 text-amber-800 border-amber-300 font-bold",
      DELIVERED: "bg-emerald-50 text-emerald-800 border-emerald-300 font-bold",
      PAID: "bg-green-100 text-green-900 border-green-400 font-extrabold",
      CANCELLED: "bg-slate-100 text-slate-600 border-slate-300",
    };
    return map[status] || "bg-slate-100 text-slate-700";
  };

  return (
    <div className="min-h-screen bg-slate-100 pb-16 font-sans">
      {/* 7 Tabs Horizontal Header */}
      <SevenTabsNav currentTab="quotes" />

      {/* Quotation Tracker Subheader */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-black text-sm shadow-sm">
              TAB 1
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-900">Quotation Tracker</h1>
                <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-800 rounded-full border border-emerald-200">
                  {quotes.length} Quotes
                </span>
              </div>
              <p className="text-xs text-slate-500">Date • Client • Location • Amounts • Status &amp; PDF/Excel/WhatsApp</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setSyncModalOpen(true)}
              className="px-3.5 py-2 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              title="Sync documents from asfiyashaikh13.github.io/glass-care"
            >
              <span>🌐</span>
              <span>Glass Care Sync</span>
            </button>
            <button
              onClick={() => {
                loadFactories();
                setNewModalOpen(true);
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>+</span>
              <span>New Quotation</span>
            </button>
            <button
              onClick={loadQuotes}
              className="p-2 bg-white hover:bg-slate-50 text-slate-600 border border-slate-300 rounded-lg text-xs font-medium transition cursor-pointer"
              title="Refresh list"
            >
              🔄
            </button>
          </div>
        </div>
      </header>

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-lg shadow-xl font-medium animate-bounce flex items-center gap-2">
          <span>✓</span>
          <span>{toastMsg}</span>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-5">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-5">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Total Quotations</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-lg font-bold text-slate-900">{formatIndianCurrency(totalValue)}</span>
              <span className="text-xs font-semibold text-slate-600 font-mono">{quotes.length} quotes</span>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-wide">Draft &amp; Pending</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-lg font-bold text-blue-900">{formatIndianCurrency(pendingValue)}</span>
              <span className="text-xs font-semibold text-blue-700 font-mono">{pendingQuotes.length} quotes</span>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-semibold text-amber-600 uppercase tracking-wide">Approved &amp; In Production</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-lg font-bold text-amber-900">{formatIndianCurrency(activeValue)}</span>
              <span className="text-xs font-semibold text-amber-700 font-mono">{activeQuotes.length} quotes</span>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wide">Delivered &amp; Paid</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-lg font-bold text-emerald-900">{formatIndianCurrency(paidValue)}</span>
              <span className="text-xs font-semibold text-emerald-700 font-mono">{paidQuotes.length} quotes</span>
            </div>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 mb-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-[260px]">
            <div className="relative w-full max-w-md">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by quote #, customer, building, flat..."
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <span className="absolute left-2.5 top-1.5 text-slate-400 text-xs">🔍</span>
            </div>
            {search && (
              <button
                onClick={() => setSearch("")}
                className="text-xs text-slate-500 hover:text-slate-800 px-2 py-1 rounded"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-semibold">Filter Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-medium cursor-pointer"
            >
              <option value="ALL">All Statuses ({quotes.length})</option>
              <option value="DRAFT">Draft</option>
              <option value="SENT">Sent</option>
              <option value="APPROVED">Approved</option>
              <option value="IN_PRODUCTION">In Production</option>
              <option value="DELIVERED">Delivered</option>
              <option value="PAID">Paid</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg font-medium">
            {error}
          </div>
        )}

        {/* Quotes Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-3 text-center w-10">#</th>
                  <th className="py-3 px-3">Date &amp; Quote #</th>
                  <th className="py-3 px-3">Customer &amp; Mobile</th>
                  <th className="py-3 px-3">Work / Items</th>
                  <th className="py-3 px-3">Location / Flat</th>
                  <th className="py-3 px-2 text-center">Items</th>
                  <th className="py-3 px-3 text-right">Sub Total</th>
                  <th className="py-3 px-3 text-right">GST (18%)</th>
                  <th className="py-3 px-3 text-right">Grand Total</th>
                  <th className="py-3 px-3 text-center">Status &amp; Move</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-slate-400 font-medium">
                      Loading quotations...
                    </td>
                  </tr>
                ) : quotes.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-slate-400">
                      <p className="text-sm font-semibold text-slate-600">No quotations found</p>
                      <p className="text-xs text-slate-400 mt-1">Click &quot;+ New Quotation&quot; to create your first quote.</p>
                    </td>
                  </tr>
                ) : (
                  quotes.map((q, idx) => {
                    const allowedTransitions = ALLOWED_STATUS_TRANSITIONS[q.status] || [];
                    const createdDateFormatted = q.createdAt
                      ? new Date(q.createdAt).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })
                      : "—";

                    const waShareUrl = generateWhatsAppShareUrl({
                      quoteNumber: q.quoteNumber,
                      customerName: q.customerName,
                      displayTotal: q.displayTotal,
                      itemCount: q.itemCount,
                    });

                    return (
                      <tr key={q.id} className="hover:bg-slate-50/80 transition">
                        {/* # Index */}
                        <td className="py-3 px-3 text-center font-mono text-slate-400 text-[11px]">
                          {idx + 1}
                        </td>

                        {/* Quote Number & Date */}
                        <td className="py-3 px-3 font-mono">
                          <Link href={`/quotes/${q.id}`} className="font-bold text-blue-600 hover:underline">
                            {q.quoteNumber}
                          </Link>
                          {q.version > 1 && (
                            <span className="ml-1 text-[10px] bg-slate-100 text-slate-600 px-1 py-0.2 rounded font-normal">
                              v{q.version}
                            </span>
                          )}
                          <div className="text-[10px] text-slate-400 font-normal">{createdDateFormatted}</div>
                        </td>

                        {/* Customer & Mobile */}
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-900">{q.customerName}</div>
                          {q.customerPhone ? (
                            <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                              <span>📱</span>
                              <span>{q.customerPhone}</span>
                            </div>
                          ) : (
                            <div className="text-[10px] text-slate-400">Direct Client</div>
                          )}
                        </td>

                        {/* Work / Items */}
                        <td className="py-3 px-3 text-slate-700 max-w-[170px]" title={q.workSummary}>
                          <div className="truncate font-medium text-[11px] text-slate-800">
                            {q.workSummary || "Glass & Aluminium Work"}
                          </div>
                        </td>

                        {/* Location */}
                        <td className="py-3 px-3 text-slate-600">
                          {[q.customerBuilding, q.customerFlat ? `Flat ${q.customerFlat}` : ""].filter(Boolean).join(" - ") || "—"}
                        </td>

                        {/* Items */}
                        <td className="py-3 px-2 text-center font-mono font-medium text-slate-700">
                          {q.itemCount}
                        </td>

                        {/* Sub Total */}
                        <td className="py-3 px-3 text-right font-mono text-slate-600">
                          {formatIndianCurrency(q.subTotal)}
                        </td>

                        {/* GST */}
                        <td className="py-3 px-3 text-right font-mono text-slate-500">
                          {formatIndianCurrency(q.gstTotal)}
                        </td>

                        {/* Grand Total */}
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 text-[13px]">
                          {formatIndianCurrency(q.displayTotal)}
                        </td>

                        {/* Status & Move */}
                        <td className="py-3 px-3 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase ${getStatusBadge(
                                q.status
                              )}`}
                            >
                              {q.status.replace("_", " ")}
                            </span>
                            {allowedTransitions.length > 0 && (
                              <select
                                defaultValue=""
                                onChange={(e) => {
                                  if (e.target.value) {
                                    handleStatusChange(q.id, e.target.value as QuoteStatus);
                                    e.target.value = "";
                                  }
                                }}
                                className="px-1.5 py-0.5 text-[10px] border border-slate-200 rounded bg-white text-slate-600 cursor-pointer"
                                title="Advance quotation status"
                              >
                                <option value="" disabled>
                                  Advance to...
                                </option>
                                {allowedTransitions.map((t) => (
                                  <option key={t} value={t}>
                                    {t.replace("_", " ")}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {/* View / Edit */}
                            <Link
                              href={`/quotes/${q.id}`}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold transition"
                              title="View & Edit Quotation Details"
                            >
                              👁️ View
                            </Link>

                            {/* PDF */}
                            <a
                              href={`/api/quotes/${q.id}/pdf`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded text-[11px] font-semibold transition"
                              title="View / Print Official Quotation PDF"
                            >
                              📄 PDF
                            </a>

                            {/* Excel */}
                            <a
                              href={`/api/quotes/${q.id}/excel`}
                              className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded text-[11px] font-semibold transition"
                              title="Download Quotation Excel"
                            >
                              📊 XLS
                            </a>

                            {/* WhatsApp */}
                            <a
                              href={waShareUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2 py-1 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 rounded text-[11px] font-semibold transition"
                              title="Share on WhatsApp"
                            >
                              💬 WA
                            </a>

                            {/* Delete */}
                            <button
                              onClick={() => handleDeleteQuote(q.id, q.quoteNumber)}
                              className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 transition cursor-pointer"
                              title="Delete Quote"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* ============================================================== */}
      {/* QUICK NEW QUOTATION MODAL (No Marksheet Spreadsheet Required)   */}
      {/* ============================================================== */}
      {newModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Create New Quotation</h3>
                <p className="text-xs text-slate-500">Fast quote generator — auto-calculates areas, GST &amp; totals</p>
              </div>
              <button
                onClick={() => setNewModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNewQuote} className="space-y-4 text-xs">
              {/* Customer Info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block font-semibold text-slate-700 mb-1">Customer Name *</label>
                  <input
                    type="text"
                    required
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    placeholder="e.g. Mr. Fayaz / Royal Villa"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block font-semibold text-slate-700 mb-1">Building / Project</label>
                  <input
                    type="text"
                    value={newBuilding}
                    onChange={(e) => setNewBuilding(e.target.value)}
                    placeholder="e.g. MAIN BUILDING"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Flat / Unit No</label>
                  <input
                    type="text"
                    value={newFlat}
                    onChange={(e) => setNewFlat(e.target.value)}
                    placeholder="e.g. Flat 27"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone (Optional)</label>
                  <input
                    type="tel"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="e.g. 7411415842"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-semibold text-slate-700">Assigned Factory (WIP)</label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomFactory(!isCustomFactory);
                        setCustomFactoryName("");
                      }}
                      className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      {isCustomFactory ? "← Choose from saved list" : "➕ Type New Vendor"}
                    </button>
                  </div>

                  {isCustomFactory ? (
                    <div className="space-y-1.5">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={customFactoryName}
                          onChange={(e) => setCustomFactoryName(e.target.value)}
                          placeholder="Type new vendor name (e.g. Vendor Sachin, Sri Balaji Glass)..."
                          className="flex-1 px-3 py-2 border border-emerald-400 bg-emerald-50/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-800 text-sm"
                          autoFocus
                        />
                        <button
                          type="button"
                          disabled={!customFactoryName.trim() || isSavingNewFactory}
                          onClick={handleQuickSaveFactory}
                          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
                        >
                          {isSavingNewFactory ? "Saving..." : "Save Vendor"}
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        💡 You can insert any vendor name. It saves permanently across all tabs (Tab 1 Quotes, Tab 2 WIP &amp; Tab 4 Vendors).
                      </p>
                    </div>
                  ) : (
                    <select
                      value={newFactory}
                      onChange={(e) => {
                        if (e.target.value === "__NEW__") {
                          setIsCustomFactory(true);
                          setCustomFactoryName("");
                        } else {
                          setNewFactory(e.target.value);
                        }
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white font-medium text-slate-800 text-sm"
                    >
                      {factories.map((f) => (
                        <option key={f.id} value={f.name}>
                          {f.name}
                        </option>
                      ))}
                      <option value="__NEW__" className="text-emerald-700 font-semibold">
                        ➕ + Add / Type New Vendor...
                      </option>
                    </select>
                  )}
                </div>
              </div>

              {/* Items Section */}
              <div className="pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <label className="font-bold text-slate-800">Quotation Line Items ({newItems.length})</label>
                  <button
                    type="button"
                    onClick={handleAddItemToNewQuote}
                    className="px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md hover:bg-emerald-100 transition cursor-pointer"
                  >
                    + Add Item
                  </button>
                </div>

                <div className="space-y-3">
                  {newItems.map((item, i) => (
                    <div key={item.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-700 text-[11px]">Item #{i + 1}</span>
                        {newItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItemFromNewQuote(item.id)}
                            className="text-red-500 hover:text-red-700 text-xs font-bold cursor-pointer"
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-6 gap-2">
                        {/* Description */}
                        <div className="col-span-3">
                          <label className="block text-[10px] text-slate-500 font-medium mb-0.5">Description / Glass</label>
                          <input
                            type="text"
                            list="presets"
                            required
                            value={item.description}
                            onChange={(e) => {
                              const val = e.target.value;
                              const matched = STANDARD_PRESETS.find((p) => p.name.toLowerCase() === val.toLowerCase());
                              setNewItems((prev) =>
                                prev.map((it) =>
                                  it.id === item.id
                                    ? { ...it, description: val, rate: matched ? matched.rate : it.rate }
                                    : it
                                )
                              );
                            }}
                            className="w-full px-2 py-1.5 text-xs bg-white border border-slate-300 rounded font-medium"
                          />
                        </div>

                        {/* Height (mm) */}
                        <div className="col-span-1">
                          <label className="block text-[10px] text-slate-500 font-medium mb-0.5">Height (mm)</label>
                          <input
                            type="number"
                            min="50"
                            value={item.frameHeightMm}
                            onChange={(e) => {
                              const v = Number(e.target.value);
                              setNewItems((prev) =>
                                prev.map((it) => (it.id === item.id ? { ...it, frameHeightMm: v } : it))
                              );
                            }}
                            className="w-full px-2 py-1.5 text-xs bg-white border border-slate-300 rounded font-mono"
                          />
                        </div>

                        {/* Width (mm) */}
                        <div className="col-span-1">
                          <label className="block text-[10px] text-slate-500 font-medium mb-0.5">Width (mm)</label>
                          <input
                            type="number"
                            min="50"
                            value={item.frameWidthMm}
                            onChange={(e) => {
                              const v = Number(e.target.value);
                              setNewItems((prev) =>
                                prev.map((it) => (it.id === item.id ? { ...it, frameWidthMm: v } : it))
                              );
                            }}
                            className="w-full px-2 py-1.5 text-xs bg-white border border-slate-300 rounded font-mono"
                          />
                        </div>

                        {/* Qty & Rate */}
                        <div className="col-span-1">
                          <label className="block text-[10px] text-slate-500 font-medium mb-0.5">Qty</label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => {
                              const v = Number(e.target.value);
                              setNewItems((prev) =>
                                prev.map((it) => (it.id === item.id ? { ...it, quantity: v } : it))
                              );
                            }}
                            className="w-full px-2 py-1.5 text-xs bg-white border border-slate-300 rounded font-mono text-center"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1 text-[11px] text-slate-600">
                        <div className="flex items-center gap-2">
                          <span>Rate (₹/sqft):</span>
                          <input
                            type="number"
                            min="1"
                            value={item.rate}
                            onChange={(e) => {
                              const v = Number(e.target.value);
                              setNewItems((prev) =>
                                prev.map((it) => (it.id === item.id ? { ...it, rate: v } : it))
                              );
                            }}
                            className="w-24 px-2 py-1 text-xs bg-white border border-slate-300 rounded font-mono font-bold"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <datalist id="presets">
                  {STANDARD_PRESETS.map((p) => (
                    <option key={p.name} value={p.name} />
                  ))}
                </datalist>
              </div>

              {/* Live Quotation Summary */}
              <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-1.5">
                <div className="flex justify-between text-slate-600 font-medium">
                  <span>Sub Total:</span>
                  <span className="font-mono">{formatIndianCurrency(newQuoteCalc.subTotal)}</span>
                </div>
                <div className="flex justify-between text-slate-600 font-medium">
                  <span>GST (18%):</span>
                  <span className="font-mono">{formatIndianCurrency(newQuoteCalc.gstTotal)}</span>
                </div>
                <div className="flex justify-between text-base font-bold text-emerald-950 pt-1 border-t border-emerald-200">
                  <span>Grand Total:</span>
                  <span className="font-mono">{formatIndianCurrency(newQuoteCalc.grandTotal)}</span>
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setNewModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-lg shadow-sm transition cursor-pointer"
                >
                  {submitting ? "Creating..." : "Save & Create Quotation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* GLASS CARE INTEGRATION & SYNC MODAL                            */}
      {/* ============================================================== */}
      {syncModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-sky-50 text-sky-700 rounded-lg text-lg">🌐</span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Glass Care Website Sync</h3>
                  <p className="text-xs text-slate-500">Live webhook &amp; backup sync from asfiyashaikh13.github.io/glass-care</p>
                </div>
              </div>
              <button
                onClick={() => setSyncModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Live Webhook Status */}
            <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl mb-4 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-emerald-900">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Live Webhook Active</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const url = `${window.location.origin}/api/integrations/glass-care`;
                    navigator.clipboard.writeText(url);
                    showToast("Webhook URL copied to clipboard!");
                  }}
                  className="px-2 py-0.5 bg-white border border-emerald-300 text-emerald-800 rounded font-semibold text-[11px] hover:bg-emerald-100 transition cursor-pointer"
                >
                  📋 Copy Webhook URL
                </button>
              </div>
              <p className="text-slate-600 text-[11px]">
                Every Bill, Invoice, or Estimate generated on your website automatically pushes straight to Tab 1 and the other 6 tabs in real-time.
              </p>
            </div>

            {/* Sync options */}
            <div className="space-y-4 text-xs">
              {/* Option A: Upload backup JSON */}
              <div className="p-4 border-2 border-dashed border-slate-200 rounded-xl text-center hover:border-sky-400 transition bg-slate-50/50">
                <p className="font-bold text-slate-800 mb-1">Upload Glass Care Backup (.json)</p>
                <p className="text-[11px] text-slate-500 mb-3">
                  Exported using the <code>💾 Backup All Data (JSON)</code> button on the website.
                </p>
                <label className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 hover:border-slate-400 font-semibold text-slate-700 rounded-lg cursor-pointer shadow-2xs">
                  <span>📁 Choose Backup JSON</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleJsonFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Option B: Paste raw JSON */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Or Paste Document / Backup JSON:</label>
                <textarea
                  rows={4}
                  value={syncInput}
                  onChange={(e) => setSyncInput(e.target.value)}
                  placeholder='Paste {"document": { ... }} or [{"type": "Bill", ...}]'
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-[11px] focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              {syncResult && (
                <div className={`p-3 rounded-lg text-xs font-semibold ${syncResult.startsWith("✓") ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
                  {syncResult}
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                <a
                  href="https://asfiyashaikh13.github.io/glass-care/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sky-600 hover:underline font-semibold flex items-center gap-1"
                >
                  <span>Open Website ↗</span>
                </a>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSyncModalOpen(false)}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    disabled={syncLoading || !syncInput.trim()}
                    onClick={() => {
                      try {
                        const parsed = JSON.parse(syncInput);
                        handleSyncData(parsed);
                      } catch {
                        setSyncResult("❌ Invalid JSON text. Please check syntax.");
                      }
                    }}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-bold rounded-lg shadow-sm transition cursor-pointer"
                  >
                    {syncLoading ? "Syncing..." : "Sync Document"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
