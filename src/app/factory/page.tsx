"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { FactoryGroup, FactoryCutItem } from "@/lib/factory/types";
import { formatFactoryWhatsAppText } from "@/lib/factory/grouping";
import { PieceToCut, StockSheet } from "@/lib/optimizer/guillotine";

interface OptimizedSheetResponse {
  sheetIndex: number;
  sheetWidth: number;
  sheetHeight: number;
  placedPieces: Array<{
    id: string;
    label: string;
    x: number;
    y: number;
    width: number;
    height: number;
    rotated: boolean;
    area: number;
  }>;
  usedAreaMm2: number;
  totalAreaMm2: number;
  wastagePercent: number;
  svg: string;
}

interface OptimizerResponse {
  stockSheet: StockSheet;
  sheets: OptimizedSheetResponse[];
  totalSheets: number;
  totalPiecesRequired: number;
  totalPiecesPlaced: number;
  totalGlassAreaMm2: number;
  totalStockAreaMm2: number;
  overallWastagePercent: number;
  unplacedPieces: Array<{ id: string; label: string; width: number; height: number }>;
}

export default function FactoryPage() {
  const [activeTab, setActiveTab] = useState<"orders" | "optimizer">("orders");
  const [factoryGroups, setFactoryGroups] = useState<FactoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFactoryFilter, setSelectedFactoryFilter] = useState<string>("ALL");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Optimizer state
  const [stockWidth, setStockWidth] = useState(2440);
  const [stockHeight, setStockHeight] = useState(1830);
  const [stockLabel, setStockLabel] = useState("Standard Float (2440x1830)");
  const [allowRotation, setAllowRotation] = useState(true);
  const [kerfMm, setKerfMm] = useState(0);
  const [selectedFactoryForOpt, setSelectedFactoryForOpt] = useState<string>("");
  const [selectedGlassTypeForOpt, setSelectedGlassTypeForOpt] = useState<string>("");
  const [optResult, setOptResult] = useState<OptimizerResponse | null>(null);
  const [optimizing, setOptimizing] = useState(false);
  const [activeSheetPreviewIndex, setActiveSheetPreviewIndex] = useState(0);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    let ignore = false;
    async function loadData() {
      try {
        const res = await fetch("/api/factory/data");
        const json = await res.json();
        if (!ignore && json.success) {
          setFactoryGroups(json.factoryGroups || []);
          if (json.factoryGroups.length > 0) {
            setSelectedFactoryForOpt(json.factoryGroups[0].factoryName);
            if (json.factoryGroups[0].glassTypes.length > 0) {
              setSelectedGlassTypeForOpt(json.factoryGroups[0].glassTypes[0].glassType);
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch factory data:", err);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    loadData();
    return () => {
      ignore = true;
    };
  }, []);

  // Filtered factories for Orders view
  const visibleFactories = useMemo(() => {
    if (selectedFactoryFilter === "ALL") return factoryGroups;
    return factoryGroups.filter((f) => f.factoryName === selectedFactoryFilter);
  }, [factoryGroups, selectedFactoryFilter]);

  // Copy for WhatsApp
  const handleCopyWhatsApp = (factory: FactoryGroup) => {
    const text = formatFactoryWhatsAppText(factory);
    navigator.clipboard.writeText(text);
    showToast(`WhatsApp text copied for ${factory.factoryName}!`);
  };

  // Switch to optimizer with preselected factory & glass type
  const handleOpenOptimizer = (factoryName: string, glassType: string) => {
    setSelectedFactoryForOpt(factoryName);
    setSelectedGlassTypeForOpt(glassType);
    setActiveTab("optimizer");
  };

  // Run cutting optimization
  const handleRunOptimizer = async () => {
    setOptimizing(true);
    try {
      // Gather items matching selected factory and glass type
      const targetFactory = factoryGroups.find((f) => f.factoryName === selectedFactoryForOpt);
      if (!targetFactory) {
        showToast("Select a factory first");
        setOptimizing(false);
        return;
      }

      let itemsToPack: FactoryCutItem[] = [];
      if (selectedGlassTypeForOpt === "ALL") {
        itemsToPack = targetFactory.glassTypes.flatMap((gt) => gt.items);
      } else {
        const gt = targetFactory.glassTypes.find((g) => g.glassType === selectedGlassTypeForOpt);
        if (gt) itemsToPack = gt.items;
      }

      if (itemsToPack.length === 0) {
        showToast("No items found to pack");
        setOptimizing(false);
        return;
      }

      const pieces: PieceToCut[] = itemsToPack.map((i, idx) => ({
        id: `p-${idx + 1}`,
        label: `${i.clientName} ${i.flat ? `Fl.${i.flat}` : ""}`.trim() || `Piece ${idx + 1}`,
        width: i.glassCutWidthMm,
        height: i.glassCutHeightMm,
        qty: i.quantity,
      }));

      const res = await fetch("/api/factory/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stockSheet: {
            width: stockWidth,
            height: stockHeight,
            label: stockLabel,
          },
          items: pieces,
          allowRotation,
          kerfMm,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setOptResult(json.result);
        setActiveSheetPreviewIndex(0);
        showToast("Cutting optimization completed!");
      } else {
        showToast(json.error || "Optimization failed");
      }
    } catch (err) {
      console.error(err);
      showToast("Error running optimizer");
    } finally {
      setOptimizing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 pb-20 print:bg-white print:p-0">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-lg shadow-xl text-sm font-medium flex items-center gap-2 animate-fade-in print:hidden">
          <span>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs print:hidden">
        <div className="max-w-[98%] mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                GCE
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-900 leading-tight">Factory Sheet & Optimizer</h1>
                <p className="text-xs text-slate-500">Cutting Indents • Guillotine Bin Packing • A4 Print & PDF</p>
              </div>
            </div>

            {/* Navigation links */}
            <nav className="hidden xl:flex items-center gap-1 text-xs font-semibold ml-4">
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
                className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-md transition"
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
              <Link
                href="/customers"
                className="px-3 py-1.5 text-slate-600 hover:text-slate-900 rounded-md hover:bg-slate-100 transition"
              >
                Customers
              </Link>
            </nav>
          </div>

          {/* Sub-tab switcher */}
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs font-semibold">
            <button
              onClick={() => setActiveTab("orders")}
              className={`px-3 py-1.5 rounded-md transition ${
                activeTab === "orders" ? "bg-white text-blue-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              📋 Factory Cutting Orders
            </button>
            <button
              onClick={() => setActiveTab("optimizer")}
              className={`px-3 py-1.5 rounded-md transition ${
                activeTab === "optimizer" ? "bg-white text-blue-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              ✂️ Sheet Cutting Optimizer
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-[98%] mx-auto px-4 mt-4 print:p-0 print:m-0 print:max-w-full">
        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">
            <div className="animate-spin text-2xl mb-2">⚙️</div>
            <p className="font-medium text-sm">Loading Factory Cutting Data...</p>
          </div>
        ) : activeTab === "orders" ? (
          /* ============================================================ */
          /* TAB 1: FACTORY CUTTING ORDERS                                 */
          /* ============================================================ */
          <div>
            {/* Filter & Action Toolbar */}
            <div className="bg-white rounded-xl border border-slate-200 p-3 mb-4 shadow-xs flex flex-wrap items-center justify-between gap-3 print:hidden">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-600 uppercase">Filter Factory:</span>
                <select
                  value={selectedFactoryFilter}
                  onChange={(e) => setSelectedFactoryFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white font-medium"
                >
                  <option value="ALL">All Factories ({factoryGroups.length})</option>
                  {factoryGroups.map((f) => (
                    <option key={f.factoryName} value={f.factoryName}>
                      {f.factoryName} ({f.totalPieces} pcs)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg transition"
                >
                  🖨️ Print A4
                </button>
              </div>
            </div>

            {/* Factory Groups List */}
            {visibleFactories.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">
                <p className="text-sm font-medium">No factory cutting items found.</p>
                <p className="text-xs text-slate-400 mt-1">Add items with dimensions in the Master Sheet first.</p>
              </div>
            ) : (
              visibleFactories.map((factory) => (
                <div
                  key={factory.factoryName}
                  className="bg-white rounded-xl border border-slate-200 p-6 mb-6 shadow-xs page-break print:shadow-none print:border-none print:p-0 print:mb-8"
                >
                  {/* Factory Header */}
                  <div className="flex flex-wrap items-start justify-between border-b-2 border-slate-900 pb-4 mb-4 gap-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <h2 className="text-xl font-black text-slate-900 tracking-tight">
                          {factory.factoryName.toUpperCase()}
                        </h2>
                        <span className="px-2.5 py-0.5 text-xs font-bold bg-blue-100 text-blue-800 rounded-full">
                          FACTORY CUTTING INDENT
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Glass Care Enterprises • Deduction Rule:{" "}
                        <strong className="text-red-600">Frame - 7 mm</strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 print:hidden">
                      <button
                        onClick={() => handleCopyWhatsApp(factory)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg border border-emerald-200 transition"
                      >
                        💬 Copy for WhatsApp
                      </button>
                      <a
                        href={`/api/factory/pdf?factory=${encodeURIComponent(factory.factoryName)}`}
                        download
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs transition"
                      >
                        📄 Download PDF
                      </a>
                    </div>
                  </div>

                  {/* KPI Summary Strip */}
                  <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 mb-6 text-xs">
                    <div>
                      <span className="text-slate-500 block uppercase font-bold text-[10px]">Processing Unit</span>
                      <span className="font-bold text-slate-900 text-sm">{factory.factoryName}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block uppercase font-bold text-[10px]">Total Quantity</span>
                      <span className="font-bold text-blue-700 text-sm">{factory.totalPieces} Pieces</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block uppercase font-bold text-[10px]">Total Area</span>
                      <span className="font-bold text-slate-900 text-sm">{factory.totalSqft} Sq.Ft</span>
                    </div>
                  </div>

                  {/* Glass Types Sections */}
                  {factory.glassTypes.map((gt) => (
                    <div key={gt.glassType} className="mb-6">
                      <div className="flex items-center justify-between bg-slate-100 px-3 py-2 rounded-t-lg border-t border-x border-slate-300">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                          <h3 className="text-xs font-black uppercase text-slate-800 tracking-wide">
                            {gt.glassType}
                          </h3>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="font-semibold text-slate-600">
                            {gt.totalPieces} pcs ({gt.totalSqft} sqft)
                          </span>
                          <button
                            onClick={() => handleOpenOptimizer(factory.factoryName, gt.glassType)}
                            className="text-blue-600 hover:text-blue-800 font-bold text-[11px] underline print:hidden"
                          >
                            ✂️ Optimize Cut
                          </button>
                        </div>
                      </div>

                      <div className="overflow-x-auto border border-slate-300 rounded-b-lg">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-300 text-[11px] font-bold text-slate-700 uppercase">
                              <th className="py-2 px-3 w-10 text-center">#</th>
                              <th className="py-2 px-3 text-blue-700 font-black">Glass Cut Size (H x W mm)</th>
                              <th className="py-2 px-3">Frame Size (H x W mm)</th>
                              <th className="py-2 px-3 text-center">Qty</th>
                              <th className="py-2 px-3 text-right">Sq.Ft</th>
                              <th className="py-2 px-3">Client / Flat / Building</th>
                              <th className="py-2 px-3">Status</th>
                              <th className="py-2 px-3">Notes</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {gt.items.map((item, idx) => (
                              <tr key={item.id} className="hover:bg-blue-50/40">
                                <td className="py-2 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                                <td className="py-2 px-3 font-mono font-black text-blue-900 bg-blue-50/50">
                                  {item.glassCutHeightMm} × {item.glassCutWidthMm} mm
                                </td>
                                <td className="py-2 px-3 font-mono text-slate-600">
                                  {item.frameHeightMm} × {item.frameWidthMm} mm
                                </td>
                                <td className="py-2 px-3 text-center font-bold text-slate-900">{item.quantity}</td>
                                <td className="py-2 px-3 text-right font-mono">{item.sqft.toFixed(2)}</td>
                                <td className="py-2 px-3 font-medium text-slate-800">
                                  {[item.clientName, item.building, item.flat ? `Fl.${item.flat}` : ""]
                                    .filter(Boolean)
                                    .join(" - ")}
                                </td>
                                <td className="py-2 px-3">
                                  <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-700 rounded-full border">
                                    {item.status}
                                  </span>
                                </td>
                                <td className="py-2 px-3 text-slate-500 italic">{item.notes || "-"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}

                  {/* Print Signatures */}
                  <div className="hidden print:flex justify-between items-end mt-12 pt-8 border-t border-slate-300 text-xs text-slate-600">
                    <div>
                      <div className="border-t border-slate-400 w-40 mb-1"></div>
                      <p>Prepared By (GCE)</p>
                    </div>
                    <div>
                      <div className="border-t border-slate-400 w-40 mb-1"></div>
                      <p>Checked & Verified</p>
                    </div>
                    <div>
                      <div className="border-t border-slate-400 w-40 mb-1"></div>
                      <p>Factory Incharge Stamp & Sign</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          /* ============================================================ */
          /* TAB 2: SHEET CUTTING OPTIMIZER                               */
          /* ============================================================ */
          <div>
            {/* Optimizer Configuration Toolbar */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4 shadow-xs">
              <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <span>✂️</span>
                <span>Guillotine Glass Cutting Optimizer Configuration</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                {/* Target Factory */}
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Factory</label>
                  <select
                    value={selectedFactoryForOpt}
                    onChange={(e) => {
                      setSelectedFactoryForOpt(e.target.value);
                      const f = factoryGroups.find((g) => g.factoryName === e.target.value);
                      if (f && f.glassTypes.length > 0) {
                        setSelectedGlassTypeForOpt(f.glassTypes[0].glassType);
                      }
                    }}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white"
                  >
                    {factoryGroups.map((f) => (
                      <option key={f.factoryName} value={f.factoryName}>
                        {f.factoryName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Target Glass Type */}
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Glass Type / Product</label>
                  <select
                    value={selectedGlassTypeForOpt}
                    onChange={(e) => setSelectedGlassTypeForOpt(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="ALL">All Glass Types in Factory</option>
                    {factoryGroups
                      .find((f) => f.factoryName === selectedFactoryForOpt)
                      ?.glassTypes.map((gt) => (
                        <option key={gt.glassType} value={gt.glassType}>
                          {gt.glassType} ({gt.totalPieces} pcs)
                        </option>
                      ))}
                  </select>
                </div>

                {/* Stock Sheet Size Presets */}
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Stock Sheet Size</label>
                  <select
                    value={`${stockWidth}x${stockHeight}`}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "2440x1830") {
                        setStockWidth(2440);
                        setStockHeight(1830);
                        setStockLabel("Standard Float (2440x1830)");
                      } else if (val === "3210x2250") {
                        setStockWidth(3210);
                        setStockHeight(2250);
                        setStockLabel("Jumbo Sheet (3210x2250)");
                      } else if (val === "2140x1605") {
                        setStockWidth(2140);
                        setStockHeight(1605);
                        setStockLabel("Medium Sheet (2140x1605)");
                      }
                    }}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="2440x1830">Standard Float: 2440 × 1830 mm</option>
                    <option value="3210x2250">Jumbo Sheet: 3210 × 2250 mm</option>
                    <option value="2140x1605">Medium Sheet: 2140 × 1605 mm</option>
                  </select>
                </div>

                {/* Options: Rotation & Kerf */}
                <div className="flex items-center gap-4 pt-2">
                  <label className="inline-flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={allowRotation}
                      onChange={(e) => setAllowRotation(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <span>Allow 90° Rotation</span>
                  </label>

                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 font-medium">Kerf:</span>
                    <input
                      type="number"
                      min={0}
                      max={10}
                      value={kerfMm}
                      onChange={(e) => setKerfMm(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      className="w-14 px-1.5 py-1 text-xs border border-slate-200 rounded text-center"
                    />
                    <span className="text-slate-400">mm</span>
                  </div>

                  <button
                    onClick={handleRunOptimizer}
                    disabled={optimizing}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-xs transition disabled:opacity-50 ml-auto"
                  >
                    {optimizing ? "Optimizing..." : "🚀 Run Optimization"}
                  </button>
                </div>
              </div>
            </div>

            {/* Optimization Results */}
            {optResult && (
              <div>
                {/* KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">Sheets Required</span>
                    <div className="text-2xl font-black text-blue-600 mt-1">{optResult.totalSheets}</div>
                    <span className="text-[11px] text-slate-400">
                      Stock: {stockWidth} × {stockHeight} mm
                    </span>
                  </div>

                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">Overall Wastage</span>
                    <div
                      className={`text-2xl font-black mt-1 ${
                        optResult.overallWastagePercent > 25 ? "text-amber-600" : "text-emerald-600"
                      }`}
                    >
                      {optResult.overallWastagePercent}%
                    </div>
                    <span className="text-[11px] text-slate-400">Guillotine cuts</span>
                  </div>

                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">Pieces Placed</span>
                    <div className="text-2xl font-black text-slate-800 mt-1">
                      {optResult.totalPiecesPlaced} / {optResult.totalPiecesRequired}
                    </div>
                    <span className="text-[11px] text-emerald-600 font-semibold">
                      {optResult.unplacedPieces.length === 0 ? "100% placed" : `${optResult.unplacedPieces.length} unplaced`}
                    </span>
                  </div>

                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">Glass Area</span>
                    <div className="text-xl font-bold text-slate-800 mt-1 font-mono">
                      {(optResult.totalGlassAreaMm2 / 1000000).toFixed(2)} m²
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {((optResult.totalGlassAreaMm2 / 1000000) * 10.7639).toFixed(1)} sq.ft
                    </span>
                  </div>

                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">Stock Area</span>
                    <div className="text-xl font-bold text-slate-800 mt-1 font-mono">
                      {(optResult.totalStockAreaMm2 / 1000000).toFixed(2)} m²
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {((optResult.totalStockAreaMm2 / 1000000) * 10.7639).toFixed(1)} sq.ft
                    </span>
                  </div>
                </div>

                {/* Sheet Interactive Visualizer */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Left: Sheet selector & preview */}
                  <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
                    <div className="flex items-center justify-between mb-3 border-b pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">
                          Sheet {activeSheetPreviewIndex + 1} of {optResult.sheets.length}
                        </span>
                        <span className="px-2 py-0.5 text-xs font-semibold bg-slate-100 text-slate-700 rounded-full border">
                          Wastage: {optResult.sheets[activeSheetPreviewIndex]?.wastagePercent}%
                        </span>
                      </div>

                      {/* Sheet tabs */}
                      <div className="flex items-center gap-1 overflow-x-auto max-w-[300px]">
                        {optResult.sheets.map((s, idx) => (
                          <button
                            key={idx}
                            onClick={() => setActiveSheetPreviewIndex(idx)}
                            className={`px-2.5 py-1 text-xs font-bold rounded-md transition ${
                              activeSheetPreviewIndex === idx
                                ? "bg-blue-600 text-white"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                          >
                            #{s.sheetIndex}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* SVG Graphic */}
                    {optResult.sheets[activeSheetPreviewIndex] && (
                      <div
                        className="w-full flex items-center justify-center p-2 rounded-lg bg-slate-50"
                        dangerouslySetInnerHTML={{
                          __html: optResult.sheets[activeSheetPreviewIndex].svg,
                        }}
                      />
                    )}
                  </div>

                  {/* Right: Placed Pieces Details */}
                  <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
                    <h3 className="font-bold text-xs uppercase tracking-wide text-slate-600 mb-2">
                      Placed Pieces on Sheet #{activeSheetPreviewIndex + 1} (
                      {optResult.sheets[activeSheetPreviewIndex]?.placedPieces.length || 0})
                    </h3>

                    <div className="max-h-[460px] overflow-y-auto">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="border-b text-slate-500 font-bold text-[10px] uppercase">
                            <th className="py-1.5 px-2">Tag</th>
                            <th className="py-1.5 px-2">Size (W × H)</th>
                            <th className="py-1.5 px-2 text-center">Rotated</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {optResult.sheets[activeSheetPreviewIndex]?.placedPieces.map((p) => (
                            <tr key={p.id} className="hover:bg-slate-50">
                              <td className="py-1.5 px-2 font-medium text-slate-800">{p.label}</td>
                              <td className="py-1.5 px-2 font-mono text-slate-700">
                                {p.width} × {p.height} mm
                              </td>
                              <td className="py-1.5 px-2 text-center">
                                {p.rotated ? (
                                  <span className="text-blue-600 font-bold" title="Rotated 90°">
                                    🔄 Yes
                                  </span>
                                ) : (
                                  <span className="text-slate-400">No</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
