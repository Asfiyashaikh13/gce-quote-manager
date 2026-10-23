"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import { MasterSheetRowData } from "@/lib/sheet/types";
import { groupRowsByCustomer } from "@/lib/sheet/grouping";
import { calculateQuoteItem, formatIndianCurrency } from "@/lib/calc";

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

interface MasterSheetProps {
  initialRows: MasterSheetRowData[];
  products: ProductOption[];
  factories: FactoryOption[];
}

export function MasterSheet({ initialRows, products, factories }: MasterSheetProps) {
  const [activeTab, setActiveTab] = useState<"sheet" | "quotes">("sheet");
  const [rows, setRows] = useState<MasterSheetRowData[]>(initialRows);
  const [history, setHistory] = useState<MasterSheetRowData[][]>([initialRows]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Autosave status
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved" | "error">("saved");
  const [lastSavedTime, setLastSavedTime] = useState<string>("");

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterFactory, setFilterFactory] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterState, setFilterState] = useState("ALL");

  // Selection for fill down & copy
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Recalculate row computed values using calc engine
  const recalculateRow = useCallback((r: Partial<MasterSheetRowData>): MasterSheetRowData => {
    const calc = calculateQuoteItem(
      {
        frameHeight: r.frameHeightMm || 0,
        frameWidth: r.frameWidthMm || 0,
        quantity: r.quantity || 1,
        rate: r.rate || 0,
        discount: r.discountType && r.discountType !== "NONE" ? { type: r.discountType, value: r.discountValue || 0 } : undefined,
        description: r.description,
      },
      r.state || "Karnataka"
    );

    return {
      id: r.id || `new-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      rowOrder: r.rowOrder || 1,
      clientName: r.clientName || "",
      flat: r.flat || "",
      building: r.building || "",
      state: r.state || "Karnataka",
      factory: r.factory || "Veera Glass",
      status: r.status || "Draft",
      notes: r.notes || "",
      productId: r.productId || "",
      description: r.description || "Custom Item",
      frameHeightMm: r.frameHeightMm || 0,
      frameWidthMm: r.frameWidthMm || 0,
      quantity: r.quantity || 1,
      rate: r.rate || 0,
      discountType: r.discountType || "NONE",
      discountValue: r.discountValue || 0,
      roundedHeightMm: calc.roundedHeight.toNumber(),
      roundedWidthMm: calc.roundedWidth.toNumber(),
      glassCutHeightMm: calc.glassCutHeight.toNumber(),
      glassCutWidthMm: calc.glassCutWidth.toNumber(),
      sqft: calc.sqft.toNumber(),
      runningFeet: calc.runningFeet.toNumber(),
      netAmount: calc.netAmount.toNumber(),
      gstAmount: calc.gstAmount.toNumber(),
      totalAmount: calc.totalAmount.toNumber(),
    };
  }, []);

  // Autosave trigger
  const triggerAutosave = useCallback((currentRows: MasterSheetRowData[]) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    setSaveStatus("saving");
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/sheet/rows", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows: currentRows }),
        });
        if (res.ok) {
          setSaveStatus("saved");
          const now = new Date();
          setLastSavedTime(now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
        } else {
          setSaveStatus("error");
        }
      } catch (err) {
        console.error("Autosave failed:", err);
        setSaveStatus("error");
      }
    }, 800);
  }, []);

  // Push new state to history for Undo/Redo and trigger autosave
  const updateRowsWithHistory = useCallback((newRows: MasterSheetRowData[]) => {
    setRows(newRows);
    setHistory((prev) => {
      const next = prev.slice(0, historyIndex + 1);
      return [...next, newRows];
    });
    setHistoryIndex((prev) => prev + 1);
    triggerAutosave(newRows);
  }, [historyIndex, triggerAutosave]);

  // Undo / Redo
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIdx = historyIndex - 1;
      setHistoryIndex(newIdx);
      const targetRows = history[newIdx];
      setRows(targetRows);
      triggerAutosave(targetRows);
    }
  }, [historyIndex, history, triggerAutosave]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIdx = historyIndex + 1;
      setHistoryIndex(newIdx);
      const targetRows = history[newIdx];
      setRows(targetRows);
      triggerAutosave(targetRows);
    }
  }, [historyIndex, history, triggerAutosave]);

  // Row update helper
  const handleCellChange = (id: string, updates: Partial<MasterSheetRowData>) => {
    const updated = rows.map((r) => {
      if (r.id !== id) return r;
      const merged = { ...r, ...updates };

      if (updates.productId) {
        const prod = products.find((p) => p.code === updates.productId || p.id === updates.productId);
        if (prod) {
          merged.description = prod.name;
          merged.rate = prod.rate;
        }
      }

      return recalculateRow(merged);
    });

    updateRowsWithHistory(updated);
  };

  // Add Row
  const handleAddRow = () => {
    const defaultProd = products[0];
    const lastRow = rows[rows.length - 1];

    const newRow = recalculateRow({
      id: `new-${Date.now()}`,
      rowOrder: rows.length + 1,
      clientName: lastRow?.clientName || "New Client",
      flat: lastRow?.flat || "",
      building: lastRow?.building || "",
      state: lastRow?.state || "Karnataka",
      factory: lastRow?.factory || "Veera Glass",
      status: "Draft",
      notes: "",
      productId: defaultProd?.code || "AL-SHUTTER-565",
      description: defaultProd?.name || "Al Shutters 565",
      frameHeightMm: 1000,
      frameWidthMm: 500,
      quantity: 1,
      rate: defaultProd?.rate || 565,
      discountType: "NONE",
      discountValue: 0,
    });

    updateRowsWithHistory([...rows, newRow]);
  };

  // Delete Row
  const handleDeleteRow = (id: string) => {
    if (rows.length <= 1) return;
    const filtered = rows.filter((r) => r.id !== id);
    updateRowsWithHistory(filtered);
  };

  // Fill Down: copy values from above row into selected row
  const handleFillDown = useCallback(() => {
    if (!selectedRowId) return;
    const index = rows.findIndex((r) => r.id === selectedRowId);
    if (index <= 0) return;

    const prevRow = rows[index - 1];
    const currentRow = rows[index];

    const filled = recalculateRow({
      ...currentRow,
      clientName: prevRow.clientName,
      flat: prevRow.flat,
      building: prevRow.building,
      state: prevRow.state,
      factory: prevRow.factory,
      status: prevRow.status,
      productId: prevRow.productId,
      description: prevRow.description,
      rate: prevRow.rate,
      discountType: prevRow.discountType,
      discountValue: prevRow.discountValue,
    });

    const nextRows = [...rows];
    nextRows[index] = filled;
    updateRowsWithHistory(nextRows);
  }, [selectedRowId, rows, recalculateRow, updateRowsWithHistory]);

  // Paste from Excel / Google Sheets (TSV parser)
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const clipData = e.clipboardData.getData("text");
    if (!clipData || (!clipData.includes("\t") && !clipData.includes("\n"))) {
      return;
    }

    e.preventDefault();
    const lines = clipData.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return;

    const newRows: MasterSheetRowData[] = [];

    for (let i = 0; i < lines.length; i++) {
      const cols = lines[i].split("\t").map((c) => c.trim());
      const client = cols[0] || "Client";
      const flat = cols[1] || "";
      const building = cols[2] || "";
      const state = cols[3] || "Karnataka";
      const factory = cols[4] || "Veera Glass";
      const status = cols[5] || "Draft";
      let desc = cols[6] || "Al Shutters 565";
      const height = parseFloat(cols[7]) || 1000;
      const width = parseFloat(cols[8]) || 500;
      const qty = parseInt(cols[9], 10) || 1;
      let rate = parseFloat(cols[10]) || 565;
      const notes = cols[11] || "";

      const matchedProd = products.find((p) => p.name.toLowerCase() === desc.toLowerCase() || p.code === desc);
      if (matchedProd) {
        desc = matchedProd.name;
        if (!cols[10]) rate = matchedProd.rate;
      }

      const row = recalculateRow({
        id: `paste-${Date.now()}-${i}`,
        rowOrder: rows.length + i + 1,
        clientName: client,
        flat,
        building,
        state,
        factory,
        status,
        description: desc,
        productId: matchedProd?.code || "",
        frameHeightMm: height,
        frameWidthMm: width,
        quantity: qty,
        rate,
        notes,
      });

      newRows.push(row);
    }

    updateRowsWithHistory([...rows, ...newRows]);
  };

  // Keyboard shortcuts (Ctrl+Z, Ctrl+Y, Ctrl+D)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === "y") {
        e.preventDefault();
        handleRedo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "d") {
        e.preventDefault();
        handleFillDown();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleUndo, handleRedo, handleFillDown]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          r.clientName.toLowerCase().includes(q) ||
          r.flat.toLowerCase().includes(q) ||
          r.building.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          r.notes.toLowerCase().includes(q);
        if (!matches) return false;
      }
      if (filterFactory !== "ALL" && r.factory !== filterFactory) return false;
      if (filterStatus !== "ALL" && r.status !== filterStatus) return false;
      if (filterState !== "ALL" && r.state !== filterState) return false;

      return true;
    });
  }, [rows, searchQuery, filterFactory, filterStatus, filterState]);

  // Auto-grouped quotes (Client + Flat + Building)
  const groupedQuotes = useMemo(() => {
    return groupRowsByCustomer(rows);
  }, [rows]);

  // Overall totals across current visible rows
  const overallTotals = useMemo(() => {
    const net = rows.reduce((acc, r) => acc + r.netAmount, 0);
    const gst = rows.reduce((acc, r) => acc + r.gstAmount, 0);
    const total = rows.reduce((acc, r) => acc + r.totalAmount, 0);
    return { net, gst, total, count: rows.length };
  }, [rows]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 pb-20" onPaste={handlePaste}>
      {/* Top App Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-[98%] mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                GCE
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold text-slate-900 leading-tight">Master Calculation Sheet</h1>
                  <span className="px-2 py-0.5 text-[11px] font-semibold bg-blue-50 text-blue-700 rounded-full border border-blue-200">
                    Live
                  </span>
                </div>
                <p className="text-xs text-slate-500">Per-row client metadata • SQLite auto-save • Excel paste & fill-down</p>
              </div>
            </div>

            <nav className="hidden lg:flex items-center gap-1 text-xs font-semibold">
              <span className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-md">Master Sheet</span>
              <Link href="/quotes" className="px-3 py-1.5 text-slate-600 hover:text-slate-900 rounded-md hover:bg-slate-100 transition">
                Quotes Registry
              </Link>
              <Link href="/factory" className="px-3 py-1.5 text-slate-600 hover:text-slate-900 rounded-md hover:bg-slate-100 transition">
                Factory & Optimizer
              </Link>
            </nav>
          </div>

          {/* Navigation Tabs & Actions */}
          <div className="flex items-center gap-4">
            {/* Autosave Status Badge */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium bg-slate-50 border-slate-200">
              {saveStatus === "saving" && (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                  <span className="text-amber-700">Saving to SQLite...</span>
                </>
              )}
              {saveStatus === "saved" && (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className="text-emerald-700">Saved {lastSavedTime ? `(${lastSavedTime})` : ""}</span>
                </>
              )}
              {saveStatus === "unsaved" && (
                <>
                  <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                  <span className="text-slate-600">Unsaved changes</span>
                </>
              )}
              {saveStatus === "error" && (
                <>
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  <span className="text-red-700">Save failed</span>
                </>
              )}
            </div>

            {/* Tab Switcher */}
            <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs font-semibold">
              <button
                onClick={() => setActiveTab("sheet")}
                className={`px-3 py-1.5 rounded-md transition ${
                  activeTab === "sheet" ? "bg-white text-blue-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Master Sheet ({rows.length})
              </button>
              <button
                onClick={() => setActiveTab("quotes")}
                className={`px-3 py-1.5 rounded-md transition ${
                  activeTab === "quotes" ? "bg-white text-blue-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Auto-Grouped Quotes ({groupedQuotes.length})
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-[98%] mx-auto px-4 mt-4">
        {activeTab === "sheet" ? (
          <>
            {/* Toolbar: Search, Filters, Undo/Redo, Actions */}
            <div className="bg-white rounded-xl border border-slate-200 p-3 mb-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                {/* Search Bar */}
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search client, flat, building..."
                    className="w-64 pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <span className="absolute left-2.5 top-2 text-slate-400 text-xs">🔍</span>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-2">
                  <select
                    value={filterFactory}
                    onChange={(e) => setFilterFactory(e.target.value)}
                    className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="ALL">All Factories</option>
                    {factories.map((f) => (
                      <option key={f.id} value={f.name}>
                        {f.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="Draft">Draft</option>
                    <option value="Sent">Sent</option>
                    <option value="Approved">Approved</option>
                  </select>

                  <select
                    value={filterState}
                    onChange={(e) => setFilterState(e.target.value)}
                    className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="ALL">All States</option>
                    <option value="Karnataka">Karnataka (Intra)</option>
                    <option value="Tamil Nadu">Tamil Nadu (Inter)</option>
                    <option value="Maharashtra">Maharashtra (Inter)</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleUndo}
                  disabled={historyIndex <= 0}
                  className="px-2.5 py-1 text-xs font-medium border border-slate-200 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-40 transition"
                  title="Undo (Ctrl+Z)"
                >
                  ↩ Undo
                </button>
                <button
                  onClick={handleRedo}
                  disabled={historyIndex >= history.length - 1}
                  className="px-2.5 py-1 text-xs font-medium border border-slate-200 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-40 transition"
                  title="Redo (Ctrl+Y)"
                >
                  ↪ Redo
                </button>
                <button
                  onClick={handleFillDown}
                  disabled={!selectedRowId}
                  className="px-2.5 py-1 text-xs font-medium border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-40 rounded-lg transition"
                  title="Fill Down (Ctrl+D): Copy previous row metadata into selected row"
                >
                  ↓ Fill Down (Ctrl+D)
                </button>
                <button
                  onClick={handleAddRow}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
                >
                  + Add Row
                </button>
              </div>
            </div>

            {/* Excel-like Table View */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto max-h-[70vh]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-2.5 px-2 text-center w-10">#</th>
                      <th className="py-2.5 px-3 min-w-[130px]">Client</th>
                      <th className="py-2.5 px-2 min-w-[70px]">Flat</th>
                      <th className="py-2.5 px-2 min-w-[100px]">Building</th>
                      <th className="py-2.5 px-2 min-w-[100px]">State</th>
                      <th className="py-2.5 px-2 min-w-[110px]">Factory</th>
                      <th className="py-2.5 px-2 min-w-[85px]">Status</th>
                      <th className="py-2.5 px-3 min-w-[150px]">Product / Desc</th>
                      <th className="py-2.5 px-2 text-right min-w-[75px]">Frame H</th>
                      <th className="py-2.5 px-2 text-right min-w-[75px]">Frame W</th>
                      <th className="py-2.5 px-2 text-center min-w-[90px]">Glass HxW</th>
                      <th className="py-2.5 px-2 text-center min-w-[90px]">Round HxW</th>
                      <th className="py-2.5 px-2 text-center w-14">Qty</th>
                      <th className="py-2.5 px-2 text-right min-w-[65px]">Sqft</th>
                      <th className="py-2.5 px-2 text-right min-w-[65px]">R.Ft</th>
                      <th className="py-2.5 px-2 text-right min-w-[75px]">Rate (₹)</th>
                      <th className="py-2.5 px-2 text-right min-w-[85px]">Net (₹)</th>
                      <th className="py-2.5 px-2 text-right min-w-[80px]">GST (₹)</th>
                      <th className="py-2.5 px-2 text-right min-w-[90px]">Total (₹)</th>
                      <th className="py-2.5 px-2 min-w-[100px]">Notes</th>
                      <th className="py-2.5 px-2 text-center w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {filteredRows.map((r, idx) => {
                      const isSelected = selectedRowId === r.id;
                      return (
                        <tr
                          key={r.id}
                          onClick={() => setSelectedRowId(r.id)}
                          className={`transition ${isSelected ? "bg-blue-50/70 ring-1 ring-blue-300" : "hover:bg-slate-50/60"}`}
                        >
                          <td className="py-2 px-2 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                          <td className="py-1 px-1">
                            <input
                              type="text"
                              value={r.clientName}
                              onChange={(e) => handleCellChange(r.id, { clientName: e.target.value })}
                              placeholder="Client name"
                              className="w-full px-2 py-1 text-xs border border-transparent hover:border-slate-300 focus:border-blue-500 rounded bg-transparent focus:bg-white"
                            />
                          </td>
                          <td className="py-1 px-1">
                            <input
                              type="text"
                              value={r.flat}
                              onChange={(e) => handleCellChange(r.id, { flat: e.target.value })}
                              placeholder="Flat"
                              className="w-full px-1.5 py-1 text-xs border border-transparent hover:border-slate-300 focus:border-blue-500 rounded bg-transparent focus:bg-white"
                            />
                          </td>
                          <td className="py-1 px-1">
                            <input
                              type="text"
                              value={r.building}
                              onChange={(e) => handleCellChange(r.id, { building: e.target.value })}
                              placeholder="Building"
                              className="w-full px-1.5 py-1 text-xs border border-transparent hover:border-slate-300 focus:border-blue-500 rounded bg-transparent focus:bg-white"
                            />
                          </td>
                          <td className="py-1 px-1">
                            <select
                              value={r.state}
                              onChange={(e) => handleCellChange(r.id, { state: e.target.value })}
                              className="w-full px-1.5 py-1 text-xs border border-transparent hover:border-slate-300 focus:border-blue-500 rounded bg-transparent focus:bg-white"
                            >
                              <option value="Karnataka">Karnataka</option>
                              <option value="Tamil Nadu">Tamil Nadu</option>
                              <option value="Maharashtra">Maharashtra</option>
                              <option value="Kerala">Kerala</option>
                            </select>
                          </td>
                          <td className="py-1 px-1">
                            <select
                              value={r.factory}
                              onChange={(e) => handleCellChange(r.id, { factory: e.target.value })}
                              className="w-full px-1.5 py-1 text-xs border border-transparent hover:border-slate-300 focus:border-blue-500 rounded bg-transparent focus:bg-white"
                            >
                              {factories.map((f) => (
                                <option key={f.id} value={f.name}>
                                  {f.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-1 px-1">
                            <select
                              value={r.status}
                              onChange={(e) => handleCellChange(r.id, { status: e.target.value })}
                              className="w-full px-1.5 py-1 text-xs border border-transparent hover:border-slate-300 focus:border-blue-500 rounded bg-transparent focus:bg-white"
                            >
                              <option value="Draft">Draft</option>
                              <option value="Sent">Sent</option>
                              <option value="Approved">Approved</option>
                            </select>
                          </td>
                          <td className="py-1 px-1">
                            <select
                              value={r.productId || r.description}
                              onChange={(e) => handleCellChange(r.id, { productId: e.target.value })}
                              className="w-full px-2 py-1 text-xs border border-transparent hover:border-slate-300 focus:border-blue-500 rounded bg-transparent focus:bg-white font-medium"
                            >
                              {products.map((p) => (
                                <option key={p.id} value={p.code || p.id}>
                                  {p.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-1 px-1">
                            <input
                              type="number"
                              value={r.frameHeightMm || ""}
                              onChange={(e) => handleCellChange(r.id, { frameHeightMm: parseFloat(e.target.value) || 0 })}
                              className="w-full px-1 py-1 text-xs text-right font-mono border border-transparent hover:border-slate-300 focus:border-blue-500 rounded bg-transparent focus:bg-white"
                            />
                          </td>
                          <td className="py-1 px-1">
                            <input
                              type="number"
                              value={r.frameWidthMm || ""}
                              onChange={(e) => handleCellChange(r.id, { frameWidthMm: parseFloat(e.target.value) || 0 })}
                              className="w-full px-1 py-1 text-xs text-right font-mono border border-transparent hover:border-slate-300 focus:border-blue-500 rounded bg-transparent focus:bg-white"
                            />
                          </td>
                          <td className="py-2 px-2 text-center font-mono text-[11px] text-slate-500">
                            {r.glassCutHeightMm}×{r.glassCutWidthMm}
                          </td>
                          <td className="py-2 px-2 text-center font-mono text-[11px] text-slate-500">
                            {r.roundedHeightMm}×{r.roundedWidthMm}
                          </td>
                          <td className="py-1 px-1">
                            <input
                              type="number"
                              min="1"
                              value={r.quantity || 1}
                              onChange={(e) => handleCellChange(r.id, { quantity: parseInt(e.target.value, 10) || 1 })}
                              className="w-full px-1 py-1 text-xs text-center font-mono border border-transparent hover:border-slate-300 focus:border-blue-500 rounded bg-transparent focus:bg-white"
                            />
                          </td>
                          <td className="py-2 px-2 text-right font-mono font-medium text-slate-700">
                            {r.sqft.toFixed(3)}
                          </td>
                          <td className="py-2 px-2 text-right font-mono text-slate-500">
                            {r.runningFeet.toFixed(2)}
                          </td>
                          <td className="py-1 px-1">
                            <input
                              type="number"
                              value={r.rate || ""}
                              onChange={(e) => handleCellChange(r.id, { rate: parseFloat(e.target.value) || 0 })}
                              className="w-full px-1 py-1 text-xs text-right font-mono border border-transparent hover:border-slate-300 focus:border-blue-500 rounded bg-transparent focus:bg-white"
                            />
                          </td>
                          <td className="py-2 px-2 text-right font-mono font-semibold text-slate-900">
                            {formatIndianCurrency(r.netAmount)}
                          </td>
                          <td className="py-2 px-2 text-right font-mono text-slate-600">
                            {formatIndianCurrency(r.gstAmount)}
                          </td>
                          <td className="py-2 px-2 text-right font-mono font-bold text-slate-900">
                            {formatIndianCurrency(r.totalAmount)}
                          </td>
                          <td className="py-1 px-1">
                            <input
                              type="text"
                              value={r.notes}
                              onChange={(e) => handleCellChange(r.id, { notes: e.target.value })}
                              placeholder="Notes"
                              className="w-full px-1.5 py-1 text-xs border border-transparent hover:border-slate-300 focus:border-blue-500 rounded bg-transparent focus:bg-white text-slate-500"
                            />
                          </td>
                          <td className="py-1 px-1 text-center">
                            <button
                              onClick={() => handleDeleteRow(r.id)}
                              disabled={rows.length <= 1}
                              title="Delete row"
                              className="text-slate-300 hover:text-red-500 disabled:opacity-20 px-1 py-0.5 rounded transition"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {/* Table Footer Totals */}
                  <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-200">
                    <tr>
                      <td colSpan={13} className="py-3 px-4 text-xs text-slate-600">
                        Total {filteredRows.length} Rows • Tip: Paste copied cells from Excel / Google Sheets directly!
                      </td>
                      <td colSpan={3} className="py-3 px-2 text-right text-xs text-slate-500">
                        Grand Totals:
                      </td>
                      <td className="py-3 px-2 text-right font-mono text-xs text-slate-900">
                        {formatIndianCurrency(overallTotals.net)}
                      </td>
                      <td className="py-3 px-2 text-right font-mono text-xs text-slate-700">
                        {formatIndianCurrency(overallTotals.gst)}
                      </td>
                      <td className="py-3 px-2 text-right font-mono text-sm text-blue-700">
                        {formatIndianCurrency(overallTotals.total)}
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </>
        ) : (
          /* Quotes Tab: Auto-grouped by Client + Flat + Building */
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Quotes Auto-Grouped by Customer</h2>
                <p className="text-xs text-slate-500">
                  Rows from the master sheet are automatically grouped into clean quotes by Client + Flat + Building
                </p>
              </div>
              <span className="px-3 py-1 bg-blue-50 text-blue-700 font-semibold rounded-lg text-xs border border-blue-200">
                {groupedQuotes.length} Distinct Quotes Generated
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {groupedQuotes.map((q, idx) => (
                <div key={q.groupKey} className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 hover:border-blue-300 transition">
                  <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-100 gap-2">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                        #{idx + 1}
                      </span>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">
                          {q.clientName} {q.flat ? `(Flat ${q.flat})` : ""} {q.building ? `— ${q.building}` : ""}
                        </h3>
                        <p className="text-xs text-slate-500">
                          State: {q.state} • Factory: {q.factory} • Status: {q.status} • {q.rowCount} Line Items
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Sub Total</span>
                        <span className="font-mono text-xs font-semibold text-slate-800">
                          {formatIndianCurrency(q.subTotal)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] text-slate-400 uppercase tracking-wider block">GST Total</span>
                        <span className="font-mono text-xs font-semibold text-slate-800">
                          {formatIndianCurrency(q.gstTotal)}
                        </span>
                      </div>
                      <div className="text-right bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
                        <span className="text-[10px] text-blue-700 uppercase font-bold tracking-wider block">Display Total</span>
                        <span className="font-mono text-base font-extrabold text-blue-900">
                          {formatIndianCurrency(q.displayTotal)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 text-xs italic text-slate-500">
                    &ldquo;{q.displayTotalWords}&rdquo;
                  </div>

                  {/* Nested Rows Preview */}
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-slate-400 border-b border-slate-100 text-[11px]">
                          <th className="py-1 px-2">Item</th>
                          <th className="py-1 px-2 text-right">Frame (mm)</th>
                          <th className="py-1 px-2 text-right">Glass Cut</th>
                          <th className="py-1 px-2 text-right">Rounded</th>
                          <th className="py-1 px-2 text-center">Qty</th>
                          <th className="py-1 px-2 text-right">Sqft</th>
                          <th className="py-1 px-2 text-right">Rate</th>
                          <th className="py-1 px-2 text-right">Net</th>
                          <th className="py-1 px-2 text-right">GST</th>
                          <th className="py-1 px-2 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 text-[11px]">
                        {q.rows.map((row) => (
                          <tr key={row.id}>
                            <td className="py-1.5 px-2 font-medium text-slate-800">{row.description}</td>
                            <td className="py-1.5 px-2 text-right font-mono">{row.frameHeightMm}×{row.frameWidthMm}</td>
                            <td className="py-1.5 px-2 text-right font-mono text-slate-500">{row.glassCutHeightMm}×{row.glassCutWidthMm}</td>
                            <td className="py-1.5 px-2 text-right font-mono text-slate-500">{row.roundedHeightMm}×{row.roundedWidthMm}</td>
                            <td className="py-1.5 px-2 text-center font-mono">{row.quantity}</td>
                            <td className="py-1.5 px-2 text-right font-mono">{row.sqft.toFixed(3)}</td>
                            <td className="py-1.5 px-2 text-right font-mono">{row.rate}</td>
                            <td className="py-1.5 px-2 text-right font-mono font-medium">{formatIndianCurrency(row.netAmount)}</td>
                            <td className="py-1.5 px-2 text-right font-mono text-slate-600">{formatIndianCurrency(row.gstAmount)}</td>
                            <td className="py-1.5 px-2 text-right font-mono font-bold text-slate-900">{formatIndianCurrency(row.totalAmount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

