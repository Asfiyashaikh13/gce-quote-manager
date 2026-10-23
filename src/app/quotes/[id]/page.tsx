"use client";

import React, { useState, useEffect, use, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatIndianCurrency, numberToIndianWords } from "@/lib/calc";
import { generateWhatsAppShareUrl } from "@/lib/quotes/whatsapp";
import { computeQuoteDiff, QuoteDiffResult } from "@/lib/quotes/revisions";
import { QuoteStatus } from "@prisma/client";

interface QuoteItem {
  id: string;
  itemOrder: number;
  description: string;
  frameHeightMm: number;
  frameWidthMm: number;
  roundedHeightMm: number;
  roundedWidthMm: number;
  glassCutHeightMm: number;
  glassCutWidthMm: number;
  quantity: number;
  rate: number;
  sqft: number;
  runningFeet: number;
  netAmount: number;
  gstAmount: number;
  totalAmount: number;
}

interface QuoteDetail {
  id: string;
  quoteNumber: string;
  version: number;
  status: QuoteStatus;
  customerName: string;
  customerBuilding: string;
  customerFlat: string;
  customerPhone: string;
  customerAddress: string;
  destinationState: string;
  subTotal: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  gstTotal: number;
  grandTotal: number;
  roundOff: number;
  displayTotal: number;
  displayTotalWords: string;
  freight: number;
  discountType: "PERCENT" | "FLAT" | "NONE";
  discountValue: number;
  validUntil: string | null;
  createdAt: string;
  notes: string | null;
  items: QuoteItem[];
  revisions: Array<{
    id: string;
    version: number;
    status: QuoteStatus;
    grandTotal: number;
    createdAt: string;
  }>;
  parentQuote?: {
    id: string;
    version: number;
    grandTotal: number;
  } | null;
}

function QuoteDetailContent({ quoteId }: { quoteId: string }) {
  const router = useRouter();
  const [quote, setQuote] = useState<QuoteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Edit fields
  const [freight, setFreight] = useState<number>(0);
  const [discountType, setDiscountType] = useState<"PERCENT" | "FLAT" | "NONE">("NONE");
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [validUntil, setValidUntil] = useState<string>("");
  const [hideCuttingSizes, setHideCuttingSizes] = useState(false);

  // Revisions diff state
  const [diffResult, setDiffResult] = useState<QuoteDiffResult | null>(null);
  const [diffModalOpen, setDiffModalOpen] = useState(false);

  useEffect(() => {
    let ignore = false;
    async function loadQuote() {
      try {
        const res = await fetch(`/api/quotes/${quoteId}`);
        if (ignore) return;
        if (!res.ok) {
          setError("Failed to load quote details");
          setLoading(false);
          return;
        }
        const data = await res.json();
        if (!ignore) {
          setQuote(data.quote);
          setFreight(data.quote.freight);
          setDiscountType(data.quote.discountType);
          setDiscountValue(data.quote.discountValue);
          if (data.quote.validUntil) {
            setValidUntil(new Date(data.quote.validUntil).toISOString().split("T")[0]);
          }
          setLoading(false);
        }
      } catch {
        if (!ignore) {
          setError("Network error loading quote");
          setLoading(false);
        }
      }
    }

    loadQuote();
    return () => {
      ignore = true;
    };
  }, [quoteId]);

  const handleUpdate = async () => {
    if (!quote) return;
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`/api/quotes/${quote.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          freight,
          discountType,
          discountValue,
          validUntil: validUntil || undefined,
          items: quote.items,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to update quote");
        return;
      }

      if (data.revisionCreated) {
        setSuccess(`Created Revision v${data.quote.version}! Redirecting...`);
        setTimeout(() => {
          router.push(`/quotes/${data.quote.id}`);
        }, 1200);
      } else {
        setQuote(data.quote);
        setSuccess("Quote saved successfully.");
      }
    } catch {
      setError("Failed to save quote changes");
    }
  };

  const handleDuplicate = async () => {
    if (!quote) return;
    try {
      const res = await fetch(`/api/quotes/${quote.id}/duplicate`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        router.push(`/quotes/${data.quote.id}`);
      } else {
        alert(data.error || "Failed to duplicate quote");
      }
    } catch {
      alert("Error duplicating quote");
    }
  };

  const viewRevisionDiff = async (revId: string) => {
    if (!quote) return;
    try {
      const res = await fetch(`/api/quotes/${revId}`);
      if (!res.ok) return;
      const data = await res.json();
      const otherQuote = data.quote;

      const diff = computeQuoteDiff(
        otherQuote.items,
        quote.items,
        otherQuote.grandTotal,
        quote.grandTotal
      );
      setDiffResult(diff);
      setDiffModalOpen(true);
    } catch (e) {
      console.error("Diff error:", e);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-8">
        <div className="text-slate-500 font-medium animate-pulse">Loading Quote Details...</div>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-8">
        <div className="text-red-500 font-medium">Quote not found.</div>
      </div>
    );
  }

  const waLink = generateWhatsAppShareUrl({
    quoteNumber: `${quote.quoteNumber}-v${quote.version}`,
    customerName: quote.customerName,
    displayTotal: quote.displayTotal,
    itemCount: quote.items.length,
  });

  return (
    <div className="min-h-screen bg-slate-100 pb-20">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/quotes" className="text-slate-500 hover:text-slate-900 text-xs font-semibold">
              ← All Quotes
            </Link>
            <span className="text-slate-300">/</span>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900">{quote.quoteNumber}</h1>
              <span className="px-2 py-0.5 text-xs font-bold bg-blue-100 text-blue-800 rounded">
                v{quote.version}
              </span>
              <span className="px-2 py-0.5 text-xs font-bold uppercase rounded bg-slate-100 text-slate-700">
                {quote.status}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDuplicate}
              className="px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
            >
              ⧉ Duplicate
            </button>
            <a
              href={`/api/quotes/${quote.id}/excel`}
              download
              className="px-3 py-1.5 text-xs font-medium bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg transition"
            >
              📊 Export Excel
            </a>
            <a
              href={`/api/quotes/${quote.id}/pdf?hideCuttingSizes=${hideCuttingSizes}`}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 text-xs font-medium bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg transition"
            >
              📄 Download PDF
            </a>
            <a
              href={waLink}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 text-xs font-medium bg-green-600 hover:bg-green-700 text-white rounded-lg transition shadow-xs"
            >
              💬 WhatsApp
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 mt-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg font-medium">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-lg font-medium">
            {success}
          </div>
        )}

        {/* Customer & Quote Header Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
            <h2 className="text-xs font-bold uppercase text-slate-400 mb-2">Customer & Site</h2>
            <div className="text-base font-bold text-slate-900">{quote.customerName}</div>
            <div className="text-xs text-slate-600 mt-1">
              {quote.customerFlat ? `Flat ${quote.customerFlat}` : ""}
              {quote.customerBuilding ? `, ${quote.customerBuilding}` : ""}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">State: {quote.destinationState}</div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
            <h2 className="text-xs font-bold uppercase text-slate-400 mb-2">Quote Terms & Validity</h2>
            <div className="flex items-center gap-2 mb-2">
              <label className="text-xs text-slate-600">Valid Until:</label>
              <input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="px-2 py-1 text-xs border border-slate-200 rounded bg-white"
              />
            </div>
            <div className="flex items-center gap-2 mt-3">
              <input
                type="checkbox"
                id="hideCut"
                checked={hideCuttingSizes}
                onChange={(e) => setHideCuttingSizes(e.target.checked)}
                className="rounded text-blue-600"
              />
              <label htmlFor="hideCut" className="text-xs text-slate-700 font-medium">
                Hide Cutting Sizes for Customer Copy
              </label>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-5 flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider block">
                Total Payable (Display Total)
              </span>
              <div className="text-3xl font-extrabold text-blue-950 font-mono mt-1">
                {formatIndianCurrency(quote.displayTotal)}
              </div>
            </div>
            <div className="text-xs text-blue-800 italic mt-2 bg-white/70 p-2 rounded border border-blue-100">
              &ldquo;{quote.displayTotalWords || numberToIndianWords(quote.displayTotal)}&rdquo;
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Items Specification ({quote.items.length})</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Product / Desc</th>
                  <th className="py-2.5 px-3 text-right">Frame (mm)</th>
                  {!hideCuttingSizes && <th className="py-2.5 px-3 text-center">Glass Cut</th>}
                  <th className="py-2.5 px-3 text-center">Rounded</th>
                  <th className="py-2.5 px-3 text-center">Qty</th>
                  <th className="py-2.5 px-3 text-right">Sqft</th>
                  <th className="py-2.5 px-3 text-right">Rate</th>
                  <th className="py-2.5 px-3 text-right">Net</th>
                  <th className="py-2.5 px-3 text-right">GST</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {quote.items.map((it) => (
                  <tr key={it.id} className="hover:bg-slate-50/75 transition">
                    <td className="py-2.5 px-3 text-slate-400 font-mono">{it.itemOrder}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{it.description}</td>
                    <td className="py-2.5 px-3 text-right font-mono">{it.frameHeightMm}×{it.frameWidthMm}</td>
                    {!hideCuttingSizes && (
                      <td className="py-2.5 px-3 text-center font-mono text-slate-500">
                        {it.glassCutHeightMm}×{it.glassCutWidthMm}
                      </td>
                    )}
                    <td className="py-2.5 px-3 text-center font-mono text-slate-500">
                      {it.roundedHeightMm}×{it.roundedWidthMm}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono">{it.quantity}</td>
                    <td className="py-2.5 px-3 text-right font-mono">{it.sqft.toFixed(3)}</td>
                    <td className="py-2.5 px-3 text-right font-mono">{it.rate}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-medium">{formatIndianCurrency(it.netAmount)}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600">{formatIndianCurrency(it.gstAmount)}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">{formatIndianCurrency(it.totalAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Adjustments & Totals & Activity Timeline */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Adjustments */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Adjustments</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Quote Discount</label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as "PERCENT" | "FLAT" | "NONE")}
                    className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="NONE">No Discount</option>
                    <option value="PERCENT">Percentage (%)</option>
                    <option value="FLAT">Flat Amount (₹)</option>
                  </select>
                  {discountType !== "NONE" && (
                    <input
                      type="number"
                      value={discountValue}
                      onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                      className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg font-mono text-right"
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Freight (₹)</label>
                <input
                  type="number"
                  value={freight}
                  onChange={(e) => setFreight(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg font-mono text-right"
                />
              </div>

              <button
                onClick={handleUpdate}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition mt-2"
              >
                Save Changes (Creates Revision if Sent)
              </button>
            </div>
          </div>

          {/* Totals Breakdown */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-2 text-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Totals Breakdown</h3>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-600">Sub Total:</span>
              <span className="font-mono font-medium">{formatIndianCurrency(quote.subTotal)}</span>
            </div>
            {quote.cgstTotal > 0 && (
              <div className="flex justify-between py-1">
                <span className="text-slate-600">CGST (9%):</span>
                <span className="font-mono">{formatIndianCurrency(quote.cgstTotal)}</span>
              </div>
            )}
            {quote.sgstTotal > 0 && (
              <div className="flex justify-between py-1">
                <span className="text-slate-600">SGST (9%):</span>
                <span className="font-mono">{formatIndianCurrency(quote.sgstTotal)}</span>
              </div>
            )}
            {quote.igstTotal > 0 && (
              <div className="flex justify-between py-1">
                <span className="text-slate-600">IGST (18%):</span>
                <span className="font-mono">{formatIndianCurrency(quote.igstTotal)}</span>
              </div>
            )}
            <div className="flex justify-between py-1 border-t border-slate-100 font-semibold text-slate-800">
              <span>GST Total:</span>
              <span className="font-mono">{formatIndianCurrency(quote.gstTotal)}</span>
            </div>
            <div className="flex justify-between py-1 text-slate-500">
              <span>Grand Total (Exact):</span>
              <span className="font-mono">{formatIndianCurrency(quote.grandTotal)}</span>
            </div>
            <div className="flex justify-between py-1 text-slate-500">
              <span>Round Off:</span>
              <span className="font-mono">{formatIndianCurrency(quote.roundOff)}</span>
            </div>
            <div className="flex justify-between py-1 text-blue-900 font-bold border-t border-slate-200 text-sm">
              <span>Display Total:</span>
              <span className="font-mono">{formatIndianCurrency(quote.displayTotal)}</span>
            </div>
          </div>

          {/* Activity Timeline & Revisions History */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Revisions & Timeline</h3>
            <div className="space-y-3 text-xs">
              <div className="p-2.5 bg-blue-50/70 border border-blue-100 rounded-lg">
                <div className="font-bold text-blue-900">Current: v{quote.version}</div>
                <div className="text-slate-500 text-[11px]">
                  Created {new Date(quote.createdAt).toLocaleDateString()}
                </div>
              </div>

              {quote.parentQuote && (
                <div className="flex items-center justify-between p-2 border border-slate-100 rounded-lg">
                  <div>
                    <span className="font-semibold text-slate-700">Based on v{quote.parentQuote.version}</span>
                  </div>
                  <button
                    onClick={() => viewRevisionDiff(quote.parentQuote!.id)}
                    className="text-blue-600 hover:underline text-[11px]"
                  >
                    View Diff →
                  </button>
                </div>
              )}

              {quote.revisions.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-semibold text-slate-500 uppercase mt-2 mb-1.5">Previous Revisions</h4>
                  <div className="space-y-1.5">
                    {quote.revisions.map((rev) => (
                      <div key={rev.id} className="flex items-center justify-between p-2 bg-slate-50 rounded border border-slate-100">
                        <div>
                          <span className="font-medium text-slate-800">v{rev.version}</span>
                          <span className="text-slate-400 text-[10px] ml-2 font-mono">
                            {formatIndianCurrency(rev.grandTotal)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => viewRevisionDiff(rev.id)}
                            className="text-blue-600 hover:underline text-[11px]"
                          >
                            Compare
                          </button>
                          <Link href={`/quotes/${rev.id}`} className="text-slate-500 hover:text-slate-900 text-[11px]">
                            Open
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Diff Modal */}
        {diffModalOpen && diffResult && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <h3 className="text-sm font-bold text-slate-900">Revision Difference Comparison</h3>
                <button
                  onClick={() => setDiffModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4 text-xs max-h-[60vh] overflow-y-auto">
                <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-lg">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Base Total</span>
                    <span className="font-mono font-bold">{formatIndianCurrency(diffResult.oldTotal)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Current Total</span>
                    <span className="font-mono font-bold">{formatIndianCurrency(diffResult.newTotal)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Difference</span>
                    <span
                      className={`font-mono font-bold ${
                        diffResult.totalDifference >= 0 ? "text-emerald-600" : "text-red-600"
                      }`}
                    >
                      {diffResult.totalDifference >= 0 ? "+" : ""}
                      {formatIndianCurrency(diffResult.totalDifference)}
                    </span>
                  </div>
                </div>

                {diffResult.modifiedRows.length > 0 && (
                  <div>
                    <h4 className="font-bold text-slate-800 mb-1.5">Modified Rows:</h4>
                    <div className="space-y-1.5">
                      {diffResult.modifiedRows.map((m, idx) => (
                        <div key={idx} className="p-2 border border-slate-200 rounded">
                          <span className="font-semibold text-slate-900">{m.description}</span>: Rate changed from ₹
                          {m.oldRate} &rarr; ₹{m.newRate}, Qty from {m.oldQty} &rarr; {m.newQty} (Total: ₹
                          {m.oldTotal} &rarr; ₹{m.newTotal})
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {diffResult.addedRows.length > 0 && (
                  <div>
                    <h4 className="font-bold text-emerald-700 mb-1.5">Added Items ({diffResult.addedRows.length}):</h4>
                    <ul className="list-disc list-inside space-y-1 text-emerald-800">
                      {diffResult.addedRows.map((a, idx) => (
                        <li key={idx}>
                          {a.description} ({a.quantity}x @ ₹{a.rate}) = ₹{a.totalAmount}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {diffResult.removedRows.length > 0 && (
                  <div>
                    <h4 className="font-bold text-red-700 mb-1.5">Removed Items ({diffResult.removedRows.length}):</h4>
                    <ul className="list-disc list-inside space-y-1 text-red-800">
                      {diffResult.removedRows.map((r, idx) => (
                        <li key={idx}>
                          {r.description} ({r.quantity}x @ ₹{r.rate})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function QuoteDetailWrapper({ params }: { params: Promise<{ id: string }> }) {
  const resolved = use(params);
  return <QuoteDetailContent quoteId={resolved.id} />;
}

export default function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-8">
          <div className="text-slate-500 font-medium animate-pulse">Loading Quote Details...</div>
        </div>
      }
    >
      <QuoteDetailWrapper params={params} />
    </Suspense>
  );
}

