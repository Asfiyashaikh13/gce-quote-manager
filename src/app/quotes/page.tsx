"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { formatIndianCurrency } from "@/lib/calc";
import { ALLOWED_STATUS_TRANSITIONS } from "@/lib/quotes/status";
import { QuoteStatus } from "@prisma/client";

interface QuoteListItem {
  id: string;
  quoteNumber: string;
  version: number;
  status: QuoteStatus;
  customerName: string;
  customerBuilding: string;
  customerFlat: string;
  destinationState: string;
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

export default function QuotesListPage() {
  const [quotes, setQuotes] = useState<QuoteListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const params = new URLSearchParams();
        if (statusFilter !== "ALL") params.set("status", statusFilter);
        if (search) params.set("search", search);

        const res = await fetch(`/api/quotes?${params.toString()}`);
        if (ignore) return;
        if (!res.ok) {
          setError("Failed to fetch quotes");
          setLoading(false);
          return;
        }
        const data = await res.json();
        if (!ignore) {
          setQuotes(data.quotes || []);
          setLoading(false);
        }
      } catch {
        if (!ignore) {
          setError("Error connecting to server");
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      ignore = true;
    };
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
      } else {
        const d = await res.json();
        alert(d.error || "Cannot transition status");
      }
    } catch {
      alert("Failed to update status");
    }
  };

  const getStatusBadge = (status: QuoteStatus) => {
    const map: Record<QuoteStatus, string> = {
      DRAFT: "bg-slate-100 text-slate-700 border-slate-200",
      SENT: "bg-blue-50 text-blue-700 border-blue-200",
      APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
      IN_PRODUCTION: "bg-amber-50 text-amber-700 border-amber-200",
      DELIVERED: "bg-purple-50 text-purple-700 border-purple-200",
      PAID: "bg-green-50 text-green-700 border-green-200",
      CANCELLED: "bg-red-50 text-red-700 border-red-200",
    };
    return map[status] || "bg-slate-100 text-slate-700";
  };

  return (
    <div className="min-h-screen bg-slate-100 pb-16">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                GCE
              </div>
              <h1 className="text-base font-bold text-slate-900">Quotations Registry</h1>
              <span className="px-2.5 py-0.5 text-xs font-semibold bg-blue-50 text-blue-700 rounded-full border border-blue-200">
                {quotes.length} Total
              </span>
            </div>

            <nav className="hidden sm:flex items-center gap-1 text-xs font-semibold">
              <Link href="/" className="px-3 py-1.5 text-slate-600 hover:text-slate-900 rounded-md hover:bg-slate-100 transition">
                Master Sheet
              </Link>
              <Link href="/quotes" className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-md transition">
                Quotes
              </Link>
              <Link href="/factory" className="px-3 py-1.5 text-slate-600 hover:text-slate-900 rounded-md hover:bg-slate-100 transition">
                Factory & Optimizer
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
            >
              + Create from Sheet
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {/* Search & Filter Toolbar */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-[280px]">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by quote number, customer, building..."
              className="w-full max-w-md px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
            >
              <option value="ALL">All Statuses</option>
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
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Quote #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-3">Location / Flat</th>
                  <th className="py-3 px-3 text-center">Items</th>
                  <th className="py-3 px-3 text-right">Sub Total</th>
                  <th className="py-3 px-3 text-right">GST</th>
                  <th className="py-3 px-4 text-right">Grand Total</th>
                  <th className="py-3 px-4">Status & Allowed Transitions</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      Loading quotes...
                    </td>
                  </tr>
                ) : quotes.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      No quotations found.
                    </td>
                  </tr>
                ) : (
                  quotes.map((q) => {
                    const allowedTransitions = ALLOWED_STATUS_TRANSITIONS[q.status] || [];
                    return (
                      <tr key={q.id} className="hover:bg-slate-50/75 transition">
                        <td className="py-3 px-4 font-mono font-bold text-blue-600">
                          <Link href={`/quotes/${q.id}`} className="hover:underline">
                            {q.quoteNumber}
                          </Link>
                          {q.version > 1 && (
                            <span className="ml-1 text-[10px] text-slate-400 font-normal">v{q.version}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900">{q.customerName}</td>
                        <td className="py-3 px-3 text-slate-500">
                          {q.customerFlat ? `Flat ${q.customerFlat}` : ""}
                          {q.customerBuilding ? ` (${q.customerBuilding})` : ""}
                        </td>
                        <td className="py-3 px-3 text-center font-mono">{q.itemCount}</td>
                        <td className="py-3 px-3 text-right font-mono text-slate-700">
                          {formatIndianCurrency(q.subTotal)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-600">
                          {formatIndianCurrency(q.gstTotal)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 text-sm">
                          {formatIndianCurrency(q.displayTotal)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase ${getStatusBadge(
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
                                className="px-1.5 py-0.5 text-[10px] border border-slate-200 rounded bg-white text-slate-600"
                              >
                                <option value="" disabled>
                                  Move to...
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
                        <td className="py-3 px-4 text-center">
                          <Link
                            href={`/quotes/${q.id}`}
                            className="px-2.5 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-md transition"
                          >
                            View / Edit →
                          </Link>
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
    </div>
  );
}
