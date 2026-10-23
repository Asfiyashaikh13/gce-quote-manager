"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { formatIndianCurrency } from "@/lib/calc";
import { formatPaymentReminderWhatsApp } from "@/lib/payments/milestones";

interface PaymentRecord {
  id: string;
  receiptNumber: string;
  quoteId: string;
  quoteNumber: string;
  customerName: string;
  customerLocation: string;
  milestone: string;
  amount: number;
  mode: string;
  reference: string;
  paymentDate: string;
  notes: string;
  quoteTotal: number;
  quoteStatus: string;
}

interface QuoteReceivable {
  id: string;
  quoteNumber: string;
  customerName: string;
  customerPhone?: string;
  building?: string;
  flat?: string;
  status: string;
  displayTotal: number;
  totalPaid: number;
  outstandingBalance: number;
  dueDateStr?: string;
  isOverdue: boolean;
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [receivables, setReceivables] = useState<QuoteReceivable[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"transactions" | "receivables">("transactions");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Record Payment Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedQuoteId, setSelectedQuoteId] = useState("");
  const [amount, setAmount] = useState("");
  const [milestone, setMilestone] = useState("Initial payment (70% on ordering)");
  const [paymentMode, setPaymentMode] = useState("BANK");
  const [reference, setReference] = useState("");
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    let ignore = false;
    async function loadData() {
      try {
        const [payRes, quotesRes] = await Promise.all([
          fetch("/api/payments"),
          fetch("/api/quotes"),
        ]);

        const payJson = await payRes.json();
        const quotesJson = await quotesRes.json();

        if (ignore) return;

        if (payJson.success) {
          setPayments(payJson.payments || []);
        }

        if (quotesJson.success) {
          interface QuoteApiItem {
            id: string;
            quoteNumber: string;
            customerName: string;
            customerPhone?: string;
            customerBuilding?: string;
            customerFlat?: string;
            status: string;
            displayTotal: number;
          }
          interface PaymentApiItem {
            quoteId: string;
            amount: number;
          }

          const quotesList: QuoteApiItem[] = quotesJson.quotes || [];
          const paymentsList: PaymentApiItem[] = payJson.payments || [];

          const recList: QuoteReceivable[] = quotesList.map((q) => {
            const paidForQuote = paymentsList
              .filter((p) => p.quoteId === q.id)
              .reduce((sum, p) => sum + p.amount, 0);

            const balance = Math.max(0, q.displayTotal - paidForQuote);
            return {
              id: q.id,
              quoteNumber: q.quoteNumber,
              customerName: q.customerName,
              customerPhone: q.customerPhone,
              building: q.customerBuilding,
              flat: q.customerFlat,
              status: q.status,
              displayTotal: q.displayTotal,
              totalPaid: paidForQuote,
              outstandingBalance: balance,
              isOverdue: balance > 0 && ["APPROVED", "IN_PRODUCTION", "DELIVERED"].includes(q.status),
            };
          });

          setReceivables(recList);
          if (recList.length > 0 && !selectedQuoteId) {
            setSelectedQuoteId(recList[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to load payment data:", err);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    loadData();
    return () => {
      ignore = true;
    };
  }, [refreshTrigger, selectedQuoteId]);

  const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalOutstanding = receivables.reduce((sum, r) => sum + r.outstandingBalance, 0);
  const overdueQuotes = receivables.filter((r) => r.isOverdue);
  const totalOverdue = overdueQuotes.reduce((sum, r) => sum + r.outstandingBalance, 0);

  const handleOpenPaymentModal = (quoteId?: string) => {
    if (quoteId) setSelectedQuoteId(quoteId);
    setIsModalOpen(true);
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuoteId || !amount || parseFloat(amount) <= 0) {
      showToast("Please select a quote and valid amount");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteId: selectedQuoteId,
          amount: parseFloat(amount),
          milestone,
          mode: paymentMode,
          reference,
          paymentDate,
          notes,
        }),
      });

      const json = await res.json();
      if (json.success) {
        showToast(`Payment recorded! Receipt: ${json.payment.receiptNumber}`);
        setIsModalOpen(false);
        setAmount("");
        setReference("");
        setNotes("");
        setRefreshTrigger((prev) => prev + 1);
      } else {
        showToast(json.error || "Failed to record payment");
      }
    } catch (err) {
      console.error(err);
      showToast("Error recording payment");
    } finally {
      setSubmitting(false);
    }
  };

  // WhatsApp payment reminder
  const handleSendReminder = (r: QuoteReceivable) => {
    const text = formatPaymentReminderWhatsApp({
      customerName: r.customerName,
      quoteNumber: r.quoteNumber,
      outstandingBalance: r.outstandingBalance,
      bankDetails: {
        upi: "9945988552@upi",
        account: "42443380892",
        ifsc: "SBIN0002263",
        bank: "State Bank of India",
      },
    });

    const phone = (r.customerPhone || "7411415842").replace(/[^0-9]/g, "");
    const waUrl = `https://wa.me/${phone.startsWith("91") ? phone : `91${phone}`}?text=${encodeURIComponent(
      text
    )}`;
    window.open(waUrl, "_blank");
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
                <h1 className="text-base font-bold text-slate-900 leading-tight">Payments & Milestones</h1>
                <p className="text-xs text-slate-500">70/20/10 Schedule • Official Receipts • WhatsApp Reminders</p>
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
              <Link href="/payments" className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-md transition">
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
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleOpenPaymentModal()}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition flex items-center gap-1.5"
            >
              <span>+</span>
              <span>Record Payment</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[98%] mx-auto px-4 mt-4">
        {/* KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Total Collected</span>
            <div className="text-2xl font-black text-emerald-600 mt-1">
              {formatIndianCurrency(totalCollected)}
            </div>
            <span className="text-xs text-slate-400">{payments.length} transactions recorded</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Total Outstanding</span>
            <div className="text-2xl font-black text-slate-800 mt-1">
              {formatIndianCurrency(totalOutstanding)}
            </div>
            <span className="text-xs text-slate-400">Across all quotations</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Overdue Receivables</span>
            <div className="text-2xl font-black text-amber-600 mt-1">
              {formatIndianCurrency(totalOverdue)}
            </div>
            <span className="text-xs text-amber-700 font-semibold">{overdueQuotes.length} pending orders</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Payment Schedule Rule</span>
            <div className="text-base font-bold text-blue-700 mt-1">70% - 20% - 10%</div>
            <span className="text-xs text-slate-400">Advance • Delivery • Completion</span>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="bg-white rounded-xl border border-slate-200 p-3 mb-4 shadow-xs flex items-center justify-between">
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs font-semibold">
            <button
              onClick={() => setActiveTab("transactions")}
              className={`px-3 py-1.5 rounded-md transition ${
                activeTab === "transactions" ? "bg-white text-blue-600 shadow-xs" : "text-slate-600"
              }`}
            >
              💳 Payment Transactions ({payments.length})
            </button>
            <button
              onClick={() => setActiveTab("receivables")}
              className={`px-3 py-1.5 rounded-md transition ${
                activeTab === "receivables" ? "bg-white text-blue-600 shadow-xs" : "text-slate-600"
              }`}
            >
              ⏳ Outstanding Receivables ({receivables.filter((r) => r.outstandingBalance > 0).length})
            </button>
          </div>
        </div>

        {/* Tab 1: Transactions Table */}
        {activeTab === "transactions" && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px]">
                    <th className="py-3 px-4">Receipt #</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Quote #</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Milestone</th>
                    <th className="py-3 px-4 text-center">Mode</th>
                    <th className="py-3 px-4">Reference / UTR</th>
                    <th className="py-3 px-4 text-right">Amount Paid</th>
                    <th className="py-3 px-4 text-center">Receipt PDF</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        Loading payments...
                      </td>
                    </tr>
                  ) : payments.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        No payments recorded yet. Click &quot;+ Record Payment&quot; to begin.
                      </td>
                    </tr>
                  ) : (
                    payments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/75">
                        <td className="py-3 px-4 font-mono font-bold text-blue-600">{p.receiptNumber}</td>
                        <td className="py-3 px-4 text-slate-500">
                          {new Date(p.paymentDate).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-800">
                          <Link href={`/quotes/${p.quoteId}`} className="hover:underline text-blue-600">
                            {p.quoteNumber}
                          </Link>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-900">
                          {p.customerName}
                          {p.customerLocation ? (
                            <span className="block text-[10px] text-slate-400">{p.customerLocation}</span>
                          ) : null}
                        </td>
                        <td className="py-3 px-4 text-slate-700">{p.milestone}</td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 text-slate-700 border">
                            {p.mode}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-500">{p.reference || "-"}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600 text-sm">
                          {formatIndianCurrency(p.amount)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <a
                            href={`/api/payments/${p.id}/receipt`}
                            download
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition"
                          >
                            📄 PDF
                          </a>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Outstanding Receivables */}
        {activeTab === "receivables" && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px]">
                    <th className="py-3 px-4">Quote #</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Total Quoted</th>
                    <th className="py-3 px-4 text-right">Total Paid</th>
                    <th className="py-3 px-4 text-right">Outstanding</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {receivables.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/75">
                      <td className="py-3 px-4 font-mono font-bold text-blue-600">
                        <Link href={`/quotes/${r.id}`} className="hover:underline">
                          {r.quoteNumber}
                        </Link>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900">
                        {r.customerName}
                        {[r.building, r.flat ? `Fl.${r.flat}` : ""].filter(Boolean).length > 0 && (
                          <span className="block text-[10px] text-slate-400">
                            {[r.building, r.flat ? `Fl.${r.flat}` : ""].filter(Boolean).join(" - ")}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 text-slate-700 border">
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-slate-700">
                        {formatIndianCurrency(r.displayTotal)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-600 font-semibold">
                        {formatIndianCurrency(r.totalPaid)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-sm text-red-600">
                        {formatIndianCurrency(r.outstandingBalance)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOpenPaymentModal(r.id)}
                            className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded border border-emerald-200 transition"
                          >
                            + Pay
                          </button>
                          {r.outstandingBalance > 0 && (
                            <button
                              onClick={() => handleSendReminder(r)}
                              className="px-2.5 py-1 text-[11px] font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 rounded border border-blue-200 transition flex items-center gap-1"
                            >
                              <span>💬</span>
                              <span>WhatsApp</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Record Payment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b mb-4">
              <h3 className="text-base font-bold text-slate-900">Record Customer Payment</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitPayment} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Quotation</label>
                <select
                  value={selectedQuoteId}
                  onChange={(e) => setSelectedQuoteId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-xs font-medium"
                  required
                >
                  <option value="" disabled>
                    Choose Quote...
                  </option>
                  {receivables.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.quoteNumber} — {r.customerName} (Bal: {formatIndianCurrency(r.outstandingBalance)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 17743"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Date</label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Milestone</label>
                  <select
                    value={milestone}
                    onChange={(e) => setMilestone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-xs"
                  >
                    <option value="Initial payment (70% on ordering)">70% Advance (Ordering)</option>
                    <option value="Interim payment (20% on delivery)">20% Interim (Delivery)</option>
                    <option value="Final payment (10% on completion)">10% Final (Completion)</option>
                    <option value="Custom / Part Payment">Custom / Part Payment</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Mode</label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-xs font-semibold"
                  >
                    <option value="UPI">UPI</option>
                    <option value="BANK">Bank Transfer (NEFT/RTGS/IMPS)</option>
                    <option value="CASH">Cash</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Transaction Ref / UTR / Cheque #</label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="e.g. UTR1234567890 or Cheque #0045"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Remarks / Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional internal remarks..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-xs transition disabled:opacity-50"
                >
                  {submitting ? "Recording..." : "Save Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
