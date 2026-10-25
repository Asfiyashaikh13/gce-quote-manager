"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { formatIndianCurrency } from "@/lib/calc";

interface CustomerItem {
  id: string;
  name: string;
  phone: string;
  building: string;
  flat: string;
  state: string;
  quotesCount: number;
  sheetRowsCount: number;
  totalQuoted: number;
  totalPaid: number;
  outstandingBalance: number;
  lastActivityDate: string;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let ignore = false;
    async function loadCustomers() {
      try {
        const res = await fetch("/api/customers");
        const json = await res.json();
        if (!ignore && json.success) {
          setCustomers(json.customers || []);
        }
      } catch (err) {
        console.error("Failed to load customers:", err);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    loadCustomers();
    return () => {
      ignore = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return customers;
    const q = search.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.building.toLowerCase().includes(q) ||
        c.flat.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q)
    );
  }, [customers, search]);

  const totalClients = customers.length;
  const totalQuoted = customers.reduce((sum, c) => sum + c.totalQuoted, 0);
  const totalPaid = customers.reduce((sum, c) => sum + c.totalPaid, 0);
  const totalOutstanding = customers.reduce((sum, c) => sum + c.outstandingBalance, 0);

  const openWhatsApp = (phone: string, name: string) => {
    const cleanPhone = phone.replace(/[^0-9]/g, "") || "7411415842";
    const intlPhone = cleanPhone.startsWith("91") ? cleanPhone : `91${cleanPhone}`;
    const text = encodeURIComponent(`Hello ${name}, greetings from Glass Care Enterprises.`);
    window.open(`https://wa.me/${intlPhone}?text=${text}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 pb-20">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-[98%] mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                GCE
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-900 leading-tight">Customer Directory</h1>
                <p className="text-xs text-slate-500">Auto-built from Sheet & Quotes • Accounts & Receivables</p>
              </div>
            </div>

            {/* Navigation links */}
            <nav className="hidden md:flex items-center gap-1 text-xs font-semibold">
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
              <Link href="/customers" className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-md transition">
                Customers
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-[98%] mx-auto px-4 mt-4">
        {/* KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Total Clients</span>
            <div className="text-2xl font-black text-slate-900 mt-1">{totalClients}</div>
            <span className="text-xs text-slate-400">Unique customers</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Total Value Quoted</span>
            <div className="text-2xl font-black text-blue-600 mt-1">{formatIndianCurrency(totalQuoted)}</div>
            <span className="text-xs text-slate-400">Across all orders</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Total Payments</span>
            <div className="text-2xl font-black text-emerald-600 mt-1">{formatIndianCurrency(totalPaid)}</div>
            <span className="text-xs text-slate-400">Total collected</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Outstanding Balance</span>
            <div className="text-2xl font-black text-red-600 mt-1">{formatIndianCurrency(totalOutstanding)}</div>
            <span className="text-xs text-amber-700 font-semibold">Pending realization</span>
          </div>
        </div>

        {/* Search Toolbar */}
        <div className="bg-white rounded-xl border border-slate-200 p-3 mb-4 shadow-xs flex items-center justify-between">
          <div className="relative w-full max-w-md">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customer by name, building, flat..."
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <span className="absolute left-2.5 top-2 text-slate-400 text-xs">🔍</span>
          </div>
          <span className="text-xs text-slate-400 font-medium">{filtered.length} customers found</span>
        </div>

        {/* Customers Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px]">
                  <th className="py-3 px-4">Customer Name</th>
                  <th className="py-3 px-4">Location / Site</th>
                  <th className="py-3 px-4">State</th>
                  <th className="py-3 px-4 text-center">Sheet Rows</th>
                  <th className="py-3 px-4 text-center">Quotations</th>
                  <th className="py-3 px-4 text-right">Total Quoted</th>
                  <th className="py-3 px-4 text-right">Total Paid</th>
                  <th className="py-3 px-4 text-right">Outstanding Balance</th>
                  <th className="py-3 px-4 text-center">Contact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      Loading customers...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      No customer records found matching &quot;{search}&quot;.
                    </td>
                  </tr>
                ) : (
                  filtered.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/75 transition">
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {c.name}
                        {c.phone && <span className="block text-[10px] text-slate-400 font-mono">{c.phone}</span>}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {[c.building, c.flat ? `Flat ${c.flat}` : ""].filter(Boolean).join(" - ") || "-"}
                      </td>
                      <td className="py-3 px-4 text-slate-500">{c.state}</td>
                      <td className="py-3 px-4 text-center font-mono font-semibold text-slate-700">
                        {c.sheetRowsCount}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-semibold text-blue-600">
                        {c.quotesCount}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-slate-800">
                        {formatIndianCurrency(c.totalQuoted)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-600 font-semibold">
                        {formatIndianCurrency(c.totalPaid)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-sm">
                        <span className={c.outstandingBalance > 0 ? "text-red-600" : "text-emerald-600"}>
                          {formatIndianCurrency(c.outstandingBalance)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => openWhatsApp(c.phone, c.name)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-md border border-emerald-200 transition"
                        >
                          <span>💬</span>
                          <span>WhatsApp</span>
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
    </div>
  );
}

