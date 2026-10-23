"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { formatIndianCurrency } from "@/lib/calc";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  Cell,
  PieChart,
  Pie,
} from "recharts";

interface DashboardData {
  kpis: {
    totalQuotes: number;
    totalQuotedValue: number;
    approvedCount: number;
    approvedValue: number;
    conversionRate: number;
    totalCollected: number;
    totalOutstanding: number;
    totalOverdue: number;
  };
  statusFunnel: Array<{ name: string; count: number; fill: string }>;
  monthlyTrend: Array<{ month: string; quoted: number; approved: number }>;
  topCustomers: Array<{ name: string; totalValue: number; quotesCount: number }>;
  topProducts: Array<{ name: string; quantity: number; revenue: number }>;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [period, setPeriod] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    async function fetchStats() {
      setLoading(true);
      try {
        const res = await fetch(`/api/dashboard/stats?period=${period}`);
        const json = await res.json();
        if (!ignore && json.success) {
          setData(json);
        }
      } catch (err) {
        console.error("Failed to load dashboard:", err);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    fetchStats();
    return () => {
      ignore = true;
    };
  }, [period]);

  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];

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
                <h1 className="text-base font-bold text-slate-900 leading-tight">Executive Dashboard</h1>
                <p className="text-xs text-slate-500">Analytics • Funnel Conversion • Revenue & Aging</p>
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
              <Link href="/dashboard" className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-md transition">
                Dashboard
              </Link>
              <Link
                href="/customers"
                className="px-3 py-1.5 text-slate-600 hover:text-slate-900 rounded-md hover:bg-slate-100 transition"
              >
                Customers
              </Link>
            </nav>
          </div>

          {/* Period Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-semibold">Period:</span>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All Time</option>
              <option value="this_month">This Month</option>
              <option value="last_30_days">Last 30 Days</option>
              <option value="this_quarter">This Quarter</option>
              <option value="this_year">This Year</option>
            </select>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[98%] mx-auto px-4 mt-4">
        {loading || !data ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">
            <div className="animate-spin text-2xl mb-2">📊</div>
            <p className="font-medium text-sm">Aggregating Business Metrics...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 6 Key KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Total Quotes</span>
                <div className="text-2xl font-black text-slate-900 mt-1">{data.kpis.totalQuotes}</div>
                <span className="text-[11px] text-slate-400">Created in scope</span>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Value Quoted</span>
                <div className="text-xl font-black text-blue-600 mt-1">
                  {formatIndianCurrency(data.kpis.totalQuotedValue)}
                </div>
                <span className="text-[11px] text-slate-400">Gross pipeline</span>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Approved Value</span>
                <div className="text-xl font-black text-emerald-600 mt-1">
                  {formatIndianCurrency(data.kpis.approvedValue)}
                </div>
                <span className="text-[11px] text-emerald-700 font-semibold">{data.kpis.approvedCount} orders won</span>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Win / Conversion Rate</span>
                <div className="text-2xl font-black text-purple-600 mt-1">{data.kpis.conversionRate}%</div>
                <span className="text-[11px] text-slate-400">Approved ratio</span>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Collected</span>
                <div className="text-xl font-black text-teal-600 mt-1">
                  {formatIndianCurrency(data.kpis.totalCollected)}
                </div>
                <span className="text-[11px] text-slate-400">Realized revenue</span>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Outstanding</span>
                <div className="text-xl font-black text-red-600 mt-1">
                  {formatIndianCurrency(data.kpis.totalOutstanding)}
                </div>
                <span className="text-[11px] text-amber-700 font-medium">
                  {formatIndianCurrency(data.kpis.totalOverdue)} overdue
                </span>
              </div>
            </div>

            {/* Charts Row 1: Monthly Trend & Status Funnel */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Monthly Quoted vs Approved Value */}
              <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
                <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-4">
                  Monthly Value Trend (Quoted vs Approved)
                </h2>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.monthlyTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                      />
                      <Tooltip
                        formatter={(val: unknown) => [formatIndianCurrency(Number(val) || 0), "Amount"]}
                      />
                      <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                      <Bar dataKey="quoted" name="Total Quoted" fill="#93c5fd" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="approved" name="Approved Value" fill="#2563eb" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Status Funnel */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
                <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-4">
                  Quotation Status Funnel
                </h2>
                <div className="space-y-3">
                  {data.statusFunnel.map((item) => (
                    <div key={item.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.fill }} />
                        <span className="font-semibold text-slate-700">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{item.count}</span>
                        <div className="w-24 bg-slate-100 rounded-full h-2">
                          <div
                            className="h-2 rounded-full"
                            style={{
                              backgroundColor: item.fill,
                              width: `${
                                data.kpis.totalQuotes > 0 ? (item.count / data.kpis.totalQuotes) * 100 : 0
                              }%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Charts Row 2: Top Customers & Top Products */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Top Customers */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
                <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-4">
                  Top 5 Clients by Quoted Value
                </h2>
                <div className="h-60 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.topCustomers}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 11 }}
                        tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                      />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                      <Tooltip
                        formatter={(val: unknown) => [formatIndianCurrency(Number(val) || 0), "Quoted Value"]}
                      />
                      <Bar dataKey="totalValue" fill="#0284c7" radius={[0, 4, 4, 0]}>
                        {data.topCustomers.map((_, idx) => (
                          <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Top Products */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
                <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-4">
                  Top Products by Revenue & Volume
                </h2>
                <div className="flex items-center gap-4">
                  <div className="h-60 w-1/2">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.topProducts}
                          dataKey="revenue"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={75}
                          label={false}
                        >
                          {data.topProducts.map((_, index) => (
                            <Cell key={`slice-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(val: unknown) => [formatIndianCurrency(Number(val) || 0), "Revenue"]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="w-1/2 space-y-2 text-xs">
                    {data.topProducts.map((p, idx) => (
                      <div key={p.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 truncate max-w-[120px]">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                          />
                          <span className="font-medium text-slate-700 truncate" title={p.name}>
                            {p.name}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-slate-900 block font-mono text-[11px]">
                            {formatIndianCurrency(p.revenue)}
                          </span>
                          <span className="text-[10px] text-slate-400">{p.quantity} pcs</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
