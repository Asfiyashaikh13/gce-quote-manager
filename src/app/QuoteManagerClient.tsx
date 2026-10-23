"use client";

import React, { useState, useMemo } from "react";
import { calculateQuote, formatIndianCurrency } from "@/lib/calc";
import { DiscountType } from "@/lib/calc/types";

interface ProductOption {
  id: string;
  name: string;
  code: string | null;
  rate: number;
}

interface FactoryOption {
  id: string;
  name: string;
}

interface LineItemState {
  id: string;
  productId: string;
  description: string;
  frameHeight: number;
  frameWidth: number;
  quantity: number;
  rate: number;
}

const DEFAULT_LINES: LineItemState[] = [
  { id: "1", productId: "AL-SHUTTER-565", description: "Al Shutters 565", frameHeight: 1850, frameWidth: 415, quantity: 1, rate: 565 },
  { id: "2", productId: "AL-SHUTTER-565", description: "Al Shutters 565", frameHeight: 290, frameWidth: 495, quantity: 1, rate: 565 },
  { id: "3", productId: "AL-SHUTTER-430", description: "Al Shutters 430", frameHeight: 295, frameWidth: 420, quantity: 2, rate: 430 },
  { id: "4", productId: "AL-SHUTTER-430", description: "Al Shutters 430", frameHeight: 295, frameWidth: 585, quantity: 2, rate: 430 },
  { id: "5", productId: "AL-SHUTTER-565", description: "Al Shutters 565", frameHeight: 1300, frameWidth: 473, quantity: 2, rate: 565 },
  { id: "6", productId: "GLASS-PLAIN-8MM", description: "8mm plain glass", frameHeight: 913, frameWidth: 530, quantity: 3, rate: 135 },
  { id: "7", productId: "MIRROR-POLISHED-5MM", description: "5mm mirror polished", frameHeight: 550, frameWidth: 550, quantity: 2, rate: 145 },
];

export function QuoteManagerClient({
  initialProducts,
  initialFactories,
}: {
  initialProducts: ProductOption[];
  initialFactories: FactoryOption[];
}) {
  const [customerName, setCustomerName] = useState("Mr. Fayaz, flat 27");
  const [state, setState] = useState("Karnataka");
  const [selectedFactory, setSelectedFactory] = useState(initialFactories[0]?.name || "Veera Glass");
  const [discountType, setDiscountType] = useState<DiscountType>("NONE");
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [freight, setFreight] = useState<number>(0);
  const [lines, setLines] = useState<LineItemState[]>(DEFAULT_LINES);

  // Compute live calculation using the calculation engine
  const calcResult = useMemo(() => {
    return calculateQuote({
      items: lines.map((l) => ({
        frameHeight: l.frameHeight || 0,
        frameWidth: l.frameWidth || 0,
        quantity: l.quantity || 1,
        rate: l.rate || 0,
        description: l.description,
      })),
      freight,
      discount: discountType !== "NONE" ? { type: discountType, value: discountValue } : undefined,
      state,
    });
  }, [lines, freight, discountType, discountValue, state]);

  const updateLine = (id: string, updates: Partial<LineItemState>) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;
        const updated = { ...l, ...updates };
        if (updates.productId) {
          const prod = initialProducts.find((p) => p.code === updates.productId || p.id === updates.productId);
          if (prod) {
            updated.description = prod.name;
            updated.rate = prod.rate;
          }
        }
        return updated;
      })
    );
  };

  const addLine = () => {
    const newId = String(Date.now());
    const defaultProd = initialProducts[0];
    setLines((prev) => [
      ...prev,
      {
        id: newId,
        productId: defaultProd?.code || "AL-SHUTTER-565",
        description: defaultProd?.name || "Al Shutters 565",
        frameHeight: 1000,
        frameWidth: 500,
        quantity: 1,
        rate: defaultProd?.rate || 565,
      },
    ]);
  };

  const removeLine = (id: string) => {
    if (lines.length <= 1) return;
    setLines((prev) => prev.filter((l) => l.id !== id));
  };

  const resetToSample = () => {
    setLines(DEFAULT_LINES);
    setCustomerName("Mr. Fayaz, flat 27");
    setState("Karnataka");
    setDiscountType("NONE");
    setDiscountValue(0);
    setFreight(0);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 pb-16">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
              GCE
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">Quote Manager</h1>
              <p className="text-xs text-slate-500">Aluminum & Glass Calculation Engine</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              SQLite Engine Active
            </span>
            <button
              onClick={resetToSample}
              className="px-3.5 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
            >
              Reset to Sample (7 Lines)
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {/* Quote Header / Meta Card */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Customer / Project</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. Mr. Fayaz, flat 27"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Tax State</label>
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="Karnataka">Karnataka (Intra-state: 9% CGST + 9% SGST)</option>
                <option value="Tamil Nadu">Tamil Nadu (Inter-state: 18% IGST)</option>
                <option value="Maharashtra">Maharashtra (Inter-state: 18% IGST)</option>
                <option value="Kerala">Kerala (Inter-state: 18% IGST)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Fabrication Factory</label>
              <select
                value={selectedFactory}
                onChange={(e) => setSelectedFactory(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {initialFactories.map((f) => (
                  <option key={f.id} value={f.name}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Quote Reference</label>
              <div className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-700">
                Q-2026-0001 (Rev 1)
              </div>
            </div>
          </div>
        </section>

        {/* Line Items Table Card */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Line Items & Dimension Calculations</h2>
            <button
              onClick={addLine}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
            >
              + Add Line Item
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-3">#</th>
                  <th className="py-3 px-3 min-w-[180px]">Product / Desc</th>
                  <th className="py-3 px-3">Frame H (mm)</th>
                  <th className="py-3 px-3">Frame W (mm)</th>
                  <th className="py-3 px-3">Glass Cut (-7mm)</th>
                  <th className="py-3 px-3">Rounded (76.2)</th>
                  <th className="py-3 px-3 text-center">Qty</th>
                  <th className="py-3 px-3 text-right">Sqft</th>
                  <th className="py-3 px-3 text-right">R.Ft</th>
                  <th className="py-3 px-3 text-right">Rate (₹)</th>
                  <th className="py-3 px-3 text-right">Net (₹)</th>
                  <th className="py-3 px-3 text-right">GST (₹)</th>
                  <th className="py-3 px-2 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lines.map((line, idx) => {
                  const calc = calcResult.items[idx];
                  return (
                    <tr key={line.id} className="hover:bg-slate-50/75 transition">
                      <td className="py-3 px-3 font-semibold text-slate-400">{idx + 1}</td>
                      <td className="py-3 px-3">
                        <select
                          value={line.productId}
                          onChange={(e) => updateLine(line.id, { productId: e.target.value })}
                          className="w-full px-2 py-1 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                        >
                          {initialProducts.map((p) => (
                            <option key={p.id} value={p.code || p.id}>
                              {p.name} (₹{p.rate})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 px-3">
                        <input
                          type="number"
                          value={line.frameHeight || ""}
                          onChange={(e) => updateLine(line.id, { frameHeight: parseFloat(e.target.value) || 0 })}
                          className="w-20 px-2 py-1 text-xs border border-slate-200 rounded-md text-right font-mono"
                        />
                      </td>
                      <td className="py-3 px-3">
                        <input
                          type="number"
                          value={line.frameWidth || ""}
                          onChange={(e) => updateLine(line.id, { frameWidth: parseFloat(e.target.value) || 0 })}
                          className="w-20 px-2 py-1 text-xs border border-slate-200 rounded-md text-right font-mono"
                        />
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-500 text-[11px]">
                        {calc ? `${calc.glassCutHeight} × ${calc.glassCutWidth}` : "-"}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-500 text-[11px]">
                        {calc ? `${calc.roundedHeight} × ${calc.roundedWidth}` : "-"}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <input
                          type="number"
                          min="1"
                          value={line.quantity || 1}
                          onChange={(e) => updateLine(line.id, { quantity: parseInt(e.target.value, 10) || 1 })}
                          className="w-12 px-1 py-1 text-xs border border-slate-200 rounded-md text-center font-mono"
                        />
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-medium text-slate-700">
                        {calc ? calc.sqft.toFixed(3) : "-"}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-500">
                        {calc ? calc.runningFeet.toFixed(2) : "-"}
                      </td>
                      <td className="py-3 px-3 text-right font-mono">
                        <input
                          type="number"
                          value={line.rate || ""}
                          onChange={(e) => updateLine(line.id, { rate: parseFloat(e.target.value) || 0 })}
                          className="w-16 px-1 py-1 text-xs border border-slate-200 rounded-md text-right font-mono"
                        />
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-semibold text-slate-900">
                        {calc ? formatIndianCurrency(calc.netAmount) : "-"}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-600">
                        {calc ? formatIndianCurrency(calc.gstAmount) : "-"}
                      </td>
                      <td className="py-3 px-2 text-center">
                        <button
                          onClick={() => removeLine(line.id)}
                          disabled={lines.length <= 1}
                          title="Remove item"
                          className="text-slate-300 hover:text-red-500 disabled:opacity-30 transition px-1"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Bottom Section: Adjustments & Totals */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Adjustments Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-4">Adjustments & Freight</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Quote Discount</label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={discountType}
                      onChange={(e) => setDiscountType(e.target.value as DiscountType)}
                      className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                    >
                      <option value="NONE">No Discount</option>
                      <option value="PERCENT">Percentage (%)</option>
                      <option value="FLAT">Flat Amount (₹)</option>
                    </select>
                    {discountType !== "NONE" && (
                      <input
                        type="number"
                        min="0"
                        value={discountValue || ""}
                        onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                        placeholder="Value"
                        className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg font-mono text-right"
                      />
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Freight / Delivery (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={freight || ""}
                    onChange={(e) => setFreight(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg font-mono text-right"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100">
              <div className="text-xs text-slate-500">
                <p className="font-semibold text-slate-700">Calculation Engine Rules:</p>
                <ul className="list-disc list-inside mt-1 space-y-0.5">
                  <li>Rounding step: 76.2 mm</li>
                  <li>Glass deduction: 7 mm</li>
                  <li>GST: {calcResult.isInterState ? "18% IGST" : "9% CGST + 9% SGST"}</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Totals Summary Card */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
            <h3 className="text-sm font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">
              Quote Summary & Final Payable
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column Breakdown */}
              <div className="space-y-2.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Items Net Total:</span>
                  <span className="font-mono font-medium text-slate-900">
                    {formatIndianCurrency(calcResult.totals.itemNetTotal)}
                  </span>
                </div>
                {calcResult.totals.quoteDiscountAmount.greaterThan(0) && (
                  <div className="flex justify-between text-amber-600">
                    <span>Quote Discount:</span>
                    <span className="font-mono">
                      -{formatIndianCurrency(calcResult.totals.quoteDiscountAmount)}
                    </span>
                  </div>
                )}
                {calcResult.totals.freight.greaterThan(0) && (
                  <div className="flex justify-between">
                    <span>Freight:</span>
                    <span className="font-mono">
                      +{formatIndianCurrency(calcResult.totals.freight)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-slate-900 pt-1 border-t border-slate-100">
                  <span>Sub Total:</span>
                  <span className="font-mono">{formatIndianCurrency(calcResult.totals.subTotal)}</span>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  {calcResult.isInterState ? (
                    <div className="flex justify-between">
                      <span>IGST (18%):</span>
                      <span className="font-mono">{formatIndianCurrency(calcResult.totals.igstTotal)}</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between">
                        <span>CGST (9%):</span>
                        <span className="font-mono">{formatIndianCurrency(calcResult.totals.cgstTotal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>SGST (9%):</span>
                        <span className="font-mono">{formatIndianCurrency(calcResult.totals.sgstTotal)}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between font-semibold text-slate-800 pt-1">
                    <span>Total GST:</span>
                    <span className="font-mono">{formatIndianCurrency(calcResult.totals.gstTotal)}</span>
                  </div>
                </div>

                <div className="flex justify-between text-slate-500 pt-2 border-t border-slate-100">
                  <span>Grand Total (Exact):</span>
                  <span className="font-mono">{formatIndianCurrency(calcResult.totals.grandTotal)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Round Off:</span>
                  <span className="font-mono">{formatIndianCurrency(calcResult.totals.roundOff)}</span>
                </div>
              </div>

              {/* Right Column Big Payable Card */}
              <div className="flex flex-col justify-between bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-5">
                <div>
                  <span className="text-xs font-semibold text-blue-800 uppercase tracking-wider">
                    Payable Amount
                  </span>
                  <div className="text-3xl font-extrabold text-blue-950 font-mono mt-1">
                    {calcResult.formattedDisplayTotal}
                  </div>
                  <div className="text-xs text-blue-700/90 italic mt-2.5 leading-relaxed bg-white/70 p-2.5 rounded-lg border border-blue-100">
                    &ldquo;{calcResult.displayTotalWords}&rdquo;
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-blue-200/60 flex items-center justify-between text-[11px] text-blue-800">
                  <span>Calculated via Pure TypeScript Engine</span>
                  <span className="font-bold">✓ Verified</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
