"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import { MasterSheetRowData } from "@/lib/sheet/types";
import { groupRowsByCustomer, GroupedCustomerQuote } from "@/lib/sheet/grouping";
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
  const [filterCustomer, setFilterCustomer] = useState("ALL");
  const [filterFactory, setFilterFactory] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterState, setFilterState] = useState("ALL");

  // Import Modal & Toast
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isGeneratingQuote, setIsGeneratingQuote] = useState(false);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

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
    if (typeof window !== "undefined" && !window.confirm("Are you sure you want to delete this row?")) {
      return;
    }
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

  // Helper to parse raw rows from Google Sheets or standard paste
  const parseInputRows = useCallback((rawText: string): MasterSheetRowData[] => {
    const lines = rawText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return [];

    const parsed: MasterSheetRowData[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Split by tab (if TSV) or comma (if CSV)
      const cols = line.includes("\t")
        ? line.split("\t").map((c) => c.trim().replace(/^["']|["']$/g, ""))
        : line.split(",").map((c) => c.trim().replace(/^["']|["']$/g, ""));

      // Skip header lines
      const lowerRow = cols.join(" ").toLowerCase();
      if (
        lowerRow.includes("appt/building") ||
        lowerRow.includes("round of h") ||
        lowerRow.includes("product category") ||
        (lowerRow.includes("date") && lowerRow.includes("client"))
      ) {
        continue;
      }

      // Check if this matches Google Sheet "_Notebook Size's @26L" format
      // Typically: Date [0], Flat [1], Client [2], Building [3], Category [4], Item [5], Frame H [6], Frame W [7], Round H [8], Round W [9], Qty [10] ... Rate [13] ... Factory [18]
      const hasDateAt0 = /\d{1,4}[-/.]\d{1,2}[-/.]\d{2,4}/.test(cols[0]);
      const hasDimAt6and7 = !isNaN(parseFloat(cols[6])) && !isNaN(parseFloat(cols[7]));
      const isGoogleSheetLayout = cols.length >= 10 && (hasDateAt0 || hasDimAt6and7);

      let client = "Client";
      let flat = "";
      let building = "";
      let state = "Karnataka";
      let factory = "Veera Glass";
      let status = "Draft";
      let desc = "Al Shutters 565";
      let height = 1000;
      let width = 500;
      let qty = 1;
      let rate = 565;
      let notes = "";

      if (isGoogleSheetLayout) {
        flat = cols[1] || "";
        client = cols[2] || "Customer";
        building = cols[3] || "";
        desc = cols[5] || cols[4] || "Al Shutters 565";
        height = parseFloat(cols[6]) || 1000;
        width = parseFloat(cols[7]) || 500;
        qty = parseInt(cols[10], 10) || 1;
        rate = parseFloat(cols[13]) || 0;
        state = cols[14] || "Karnataka";
        factory = cols[18] || "Veera Glass";
        status = cols[19] || "Draft";
        notes = cols[22] || cols[23] || "";
      } else {
        client = cols[0] || "Client";
        flat = cols[1] || "";
        building = cols[2] || "";
        state = cols[3] || "Karnataka";
        factory = cols[4] || "Veera Glass";
        status = cols[5] || "Draft";
        desc = cols[6] || "Al Shutters 565";
        height = parseFloat(cols[7]) || 1000;
        width = parseFloat(cols[8]) || 500;
        qty = parseInt(cols[9], 10) || 1;
        rate = parseFloat(cols[10]) || 0;
        notes = cols[11] || "";
      }

      // Normalization of item names and rates based on catalog
      const matchedProd = products.find(
        (p) => p.name.toLowerCase() === desc.toLowerCase() || p.code?.toLowerCase() === desc.toLowerCase()
      );

      if (matchedProd) {
        desc = matchedProd.name;
        if (!rate || rate === 0) rate = matchedProd.rate;
      } else {
        // Smart catalog heuristics matching GCE pricing
        const lowerDesc = desc.toLowerCase();
        if (rate === 430 || lowerDesc.includes("430")) {
          desc = "Al Shutters 430";
          rate = 430;
        } else if (rate === 135 || lowerDesc.includes("plain") || lowerDesc.includes("8mm")) {
          desc = "8mm plain glass";
          rate = 135;
        } else if (rate === 145 || lowerDesc.includes("mirror") || lowerDesc.includes("5mm")) {
          desc = "5mm mirror polished";
          rate = 145;
        } else if (!rate || rate === 0) {
          rate = 565;
          desc = "Al Shutters 565";
        }
      }

      const row = recalculateRow({
        id: `row-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
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

      parsed.push(row);
    }

    return parsed;
  }, [products, recalculateRow, rows.length]);

  // Paste from Excel / Google Sheets
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const clipData = e.clipboardData.getData("text");
    if (!clipData || (!clipData.includes("\t") && !clipData.includes("\n"))) {
      return;
    }

    e.preventDefault();
    const newRows = parseInputRows(clipData);
    if (newRows.length > 0) {
      updateRowsWithHistory([...rows, ...newRows]);
      const clientsSet = new Set(newRows.map((r) => r.clientName));
      showToast(`Imported ${newRows.length} rows for ${clientsSet.size} customer(s)!`);
    }
  };

  // File Upload (.xlsx, .csv)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const csvData = XLSX.utils.sheet_to_csv(ws);
        const imported = parseInputRows(csvData);
        if (imported.length > 0) {
          updateRowsWithHistory([...rows, ...imported]);
          const clientsSet = new Set(imported.map((r) => r.clientName));
          showToast(`Successfully imported ${imported.length} rows for ${clientsSet.size} customer(s)!`);
          setImportModalOpen(false);
        } else {
          showToast("No valid measurement rows found in file");
        }
      } catch (err) {
        console.error(err);
        showToast("Failed to parse Excel file");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
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

  // Unique customer names for filter
  const customerList = useMemo(() => {
    const list = Array.from(new Set(rows.map((r) => r.clientName).filter(Boolean)));
    return list.sort();
  }, [rows]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (filterCustomer !== "ALL" && r.clientName !== filterCustomer) {
        return false;
      }
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
  }, [rows, filterCustomer, searchQuery, filterFactory, filterStatus, filterState]);

  // Auto-grouped quotes (Client + Flat + Building)
  const groupedQuotes = useMemo(() => {
    return groupRowsByCustomer(rows);
  }, [rows]);

  // Overall totals across current visible rows
  const overallTotals = useMemo(() => {
    const net = filteredRows.reduce((acc, r) => acc + r.netAmount, 0);
    const gst = filteredRows.reduce((acc, r) => acc + r.gstAmount, 0);
    const total = filteredRows.reduce((acc, r) => acc + r.totalAmount, 0);
    return { net, gst, total, count: filteredRows.length };
  }, [filteredRows]);

  // Create official quote from auto-grouped customer
  const handleCreateOfficialQuote = async (g: GroupedCustomerQuote) => {
    setIsGeneratingQuote(true);
    try {
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: g.clientName,
          customerFlat: g.flat,
          customerBuilding: g.building,
          destinationState: g.state,
          items: g.rows.map((r: MasterSheetRowData) => ({
            description: r.description,
            frameHeightMm: r.frameHeightMm,
            frameWidthMm: r.frameWidthMm,
            quantity: r.quantity,
            rate: r.rate,
          })),
        }),
      });

      const json = await res.json();
      if (json.quote || json.success) {
        const qNumber = json.quote?.quoteNumber || "New Quote";
        showToast(`Official Quote created: ${qNumber} for ${g.clientName}!`);
      } else {
        showToast(json.error || "Failed to create quote");
      }
    } catch (err) {
      console.error(err);
      showToast("Error creating quote");
    } finally {
      setIsGeneratingQuote(false);
    }
  };

  // Batch generate quotes for all customers
  const handleBatchGenerateQuotes = async () => {
    if (groupedQuotes.length === 0) return;
    setIsGeneratingQuote(true);
    let createdCount = 0;
    try {
      for (const g of groupedQuotes) {
        await fetch("/api/quotes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerName: g.clientName,
            customerFlat: g.flat,
            customerBuilding: g.building,
            destinationState: g.state,
            items: g.rows.map((r: MasterSheetRowData) => ({
              description: r.description,
              frameHeightMm: r.frameHeightMm,
              frameWidthMm: r.frameWidthMm,
              quantity: r.quantity,
              rate: r.rate,
            })),
          }),
        });
        createdCount++;
      }
      showToast(`Generated ${createdCount} official quotes for all customers! View in Quotes tab.`);
    } catch (err) {
      console.error(err);
      showToast("Error batch generating quotes");
    } finally {
      setIsGeneratingQuote(false);
    }
  };

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

            <nav className="hidden xl:flex items-center gap-1 text-xs font-semibold">
              <span className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-md">Master Sheet</span>
              <Link href="/quotes" className="px-3 py-1.5 text-slate-600 hover:text-slate-900 rounded-md hover:bg-slate-100 transition">
                Quotes
              </Link>
              <Link href="/factory" className="px-3 py-1.5 text-slate-600 hover:text-slate-900 rounded-md hover:bg-slate-100 transition">
                Factory Sheet
              </Link>
              <Link href="/payments" className="px-3 py-1.5 text-slate-600 hover:text-slate-900 rounded-md hover:bg-slate-100 transition">
                Payments
              </Link>
              <Link href="/dashboard" className="px-3 py-1.5 text-slate-600 hover:text-slate-900 rounded-md hover:bg-slate-100 transition">
                Dashboard
              </Link>
              <Link href="/customers" className="px-3 py-1.5 text-slate-600 hover:text-slate-900 rounded-md hover:bg-slate-100 transition">
                Customers
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
                    value={filterCustomer}
                    onChange={(e) => setFilterCustomer(e.target.value)}
                    className="px-2.5 py-1.5 text-xs border border-blue-300 rounded-lg bg-blue-50/60 font-bold text-blue-900 focus:outline-none"
                  >
                    <option value="ALL">All Customers ({customerList.length})</option>
                    {customerList.map((c) => (
                      <option key={c} value={c}>
                        👤 {c}
                      </option>
                    ))}
                  </select>

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
                  onClick={() => setImportModalOpen(true)}
                  className="px-2.5 py-1 text-xs font-semibold border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded-lg transition flex items-center gap-1"
                  title="Import rows from Google Sheets or Excel"
                >
                  <span>📥</span>
                  <span>Import Sheet</span>
                </button>
                <button
                  onClick={handleAddRow}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
                >
                  + Add Row
                </button>
              </div>
            </div>

            {/* Active Customer Quotation Header (matching Google Sheets layout) */}
            {filterCustomer !== "ALL" && (
              <div className="bg-white rounded-xl border border-blue-200 p-4 mb-3 shadow-xs bg-gradient-to-r from-blue-50/50 via-white to-indigo-50/40">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-xl shadow-sm">
                      GCE
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                          Active Customer Quote View
                        </span>
                        <span className="text-xs text-slate-400 font-medium">{filteredRows.length} Line Items</span>
                      </div>
                      <h2 className="text-lg font-black text-slate-900 mt-0.5">{filterCustomer}</h2>
                      <p className="text-xs text-slate-500">
                        Site: {filteredRows[0]?.building || "Main Site"} {filteredRows[0]?.flat ? `• Flat ${filteredRows[0]?.flat}` : ""} • {filteredRows[0]?.state || "Karnataka"}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center bg-white p-2 rounded-xl border border-slate-200 shadow-2xs text-xs">
                      <div className="text-right px-3 border-r border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Sub Total</span>
                        <span className="font-mono text-xs font-bold text-slate-800">{formatIndianCurrency(overallTotals.net)}</span>
                      </div>
                      <div className="text-right px-3 border-r border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">GST 18%</span>
                        <span className="font-mono text-xs font-bold text-slate-800">{formatIndianCurrency(overallTotals.gst)}</span>
                      </div>
                      <div className="text-right px-3">
                        <span className="text-[10px] font-extrabold text-blue-600 uppercase block">Grand Total</span>
                        <span className="font-mono text-base font-black text-blue-900">{formatIndianCurrency(overallTotals.total)}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        const grp = groupedQuotes.find((g) => g.clientName === filterCustomer);
                        if (grp) handleCreateOfficialQuote(grp);
                      }}
                      disabled={isGeneratingQuote}
                      className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <span>📄</span>
                      <span>Save as Official Quote</span>
                    </button>

                    <button
                      onClick={() => {
                        const waText = encodeURIComponent(
                          `*GLASS CARE ENTERPRISES - QUOTATION*\nCustomer: ${filterCustomer}\nFlat: ${filteredRows[0]?.flat || '-'}\nTotal Amount: ${formatIndianCurrency(overallTotals.total)}\nSub Total: ${formatIndianCurrency(overallTotals.net)}\nGST (18%): ${formatIndianCurrency(overallTotals.gst)}\n\nThank you for choosing Glass Care Enterprises!`
                        );
                        window.open(`https://wa.me/?text=${waText}`, "_blank");
                      }}
                      className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold border border-emerald-200 transition flex items-center gap-1"
                    >
                      <span>💬</span>
                      <span>WhatsApp</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Excel-like Table View (Desktop & Tablet) */}
            <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
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

            {/* Mobile Card-per-Row Editor (Phones < 768px) */}
            <div className="md:hidden space-y-4">
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex justify-between items-center text-xs">
                <span className="font-bold text-slate-700">Total {filteredRows.length} Rows</span>
                <span className="font-mono font-bold text-blue-700">{formatIndianCurrency(overallTotals.total)}</span>
              </div>

              {filteredRows.map((r, idx) => (
                <div
                  key={r.id}
                  className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between border-b pb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 font-bold text-xs flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="font-bold text-slate-900 text-sm">{r.clientName || "Unnamed Client"}</span>
                    </div>
                    <button
                      onClick={() => handleDeleteRow(r.id)}
                      className="text-red-500 hover:text-red-700 text-xs font-semibold px-2 py-0.5"
                    >
                      Delete
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 block">Flat / Unit</label>
                      <input
                        type="text"
                        value={r.flat}
                        onChange={(e) => handleCellChange(r.id, { flat: e.target.value })}
                        placeholder="e.g. 27"
                        className="w-full px-2 py-1 border border-slate-200 rounded mt-0.5"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 block">Building</label>
                      <input
                        type="text"
                        value={r.building}
                        onChange={(e) => handleCellChange(r.id, { building: e.target.value })}
                        placeholder="e.g. Tower B"
                        className="w-full px-2 py-1 border border-slate-200 rounded mt-0.5"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block">Item / Glass Type</label>
                    <input
                      type="text"
                      value={r.description}
                      onChange={(e) => handleCellChange(r.id, { description: e.target.value })}
                      className="w-full px-2 py-1 border border-slate-200 rounded mt-0.5"
                    />
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 block">Frame H</label>
                      <input
                        type="number"
                        value={r.frameHeightMm || ""}
                        onChange={(e) => handleCellChange(r.id, { frameHeightMm: parseFloat(e.target.value) || 0 })}
                        className="w-full px-2 py-1 border border-slate-200 rounded mt-0.5 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 block">Frame W</label>
                      <input
                        type="number"
                        value={r.frameWidthMm || ""}
                        onChange={(e) => handleCellChange(r.id, { frameWidthMm: parseFloat(e.target.value) || 0 })}
                        className="w-full px-2 py-1 border border-slate-200 rounded mt-0.5 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 block">Qty</label>
                      <input
                        type="number"
                        value={r.quantity || ""}
                        onChange={(e) => handleCellChange(r.id, { quantity: parseInt(e.target.value, 10) || 1 })}
                        className="w-full px-2 py-1 border border-slate-200 rounded mt-0.5 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 block">Rate (₹)</label>
                      <input
                        type="number"
                        value={r.rate || ""}
                        onChange={(e) => handleCellChange(r.id, { rate: parseFloat(e.target.value) || 0 })}
                        className="w-full px-2 py-1 border border-slate-200 rounded mt-0.5 font-mono"
                      />
                    </div>
                  </div>

                  {/* Computed Chips */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t text-[11px]">
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded font-mono">
                      Cut: {r.glassCutHeightMm}×{r.glassCutWidthMm}
                    </span>
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded font-mono">
                      {r.sqft.toFixed(2)} sqft
                    </span>
                    <span className="ml-auto font-mono font-bold text-slate-900 text-sm">
                      {formatIndianCurrency(r.totalAmount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          /* Quotes Tab: Auto-grouped by Client + Flat + Building */
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Quotes Auto-Grouped by Customer</h2>
                <p className="text-xs text-slate-500">
                  Rows from the master sheet are automatically grouped into clean quotes by Client + Flat + Building
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-3 py-1.5 bg-blue-50 text-blue-700 font-semibold rounded-lg text-xs border border-blue-200">
                  {groupedQuotes.length} Distinct Quotes Detected
                </span>
                <button
                  onClick={handleBatchGenerateQuotes}
                  disabled={isGeneratingQuote || groupedQuotes.length === 0}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs transition flex items-center gap-1.5 disabled:opacity-50"
                  title="Generate official quotes for all customers in one click"
                >
                  <span>⚡</span>
                  <span>{isGeneratingQuote ? "Generating Quotes..." : "Batch Generate All Quotes"}</span>
                </button>
              </div>
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

                    <div className="flex flex-wrap items-center gap-4">
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

                      <div className="flex items-center gap-2 pl-2 border-l border-slate-100">
                        <button
                          onClick={() => handleCreateOfficialQuote(q)}
                          disabled={isGeneratingQuote}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition disabled:opacity-50 flex items-center gap-1"
                          title="Save as an official quote in the Quotes registry"
                        >
                          <span>📄</span>
                          <span>Save Quote</span>
                        </button>
                        <button
                          onClick={() => {
                            const waText = encodeURIComponent(
                              `*GLASS CARE ENTERPRISES - QUOTATION*\nCustomer: ${q.clientName}\nFlat: ${q.flat || '-'}\nTotal Amount: ${formatIndianCurrency(q.displayTotal)}\nSub Total: ${formatIndianCurrency(q.subTotal)}\nGST: ${formatIndianCurrency(q.gstTotal)}\n\nThank you for choosing Glass Care Enterprises!`
                            );
                            window.open(`https://wa.me/?text=${waText}`, "_blank");
                          }}
                          className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-medium rounded-lg transition flex items-center gap-1"
                          title="Share summary via WhatsApp"
                        >
                          <span>💬</span>
                          <span>WhatsApp</span>
                        </button>
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

      {/* Floating Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 border border-slate-700 animate-bounce">
          <span className="text-emerald-400 font-bold text-base">✓</span>
          <span className="text-xs font-medium">{toastMsg}</span>
        </div>
      )}

      {/* Import Modal */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">📥</span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Import Measurement Sheet</h3>
                  <p className="text-xs text-slate-500">
                    Paste from Google Sheets (e.g. &ldquo;_Notebook Size&apos;s @26L&rdquo;) or upload an Excel file
                  </p>
                </div>
              </div>
              <button
                onClick={() => setImportModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Option 1: Paste rows from Google Sheets / Excel (tab or comma separated)
                </label>
                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder="Paste multi-row data here... Column structure A to V from your Google Sheet is automatically detected!"
                  rows={6}
                  className="w-full text-xs font-mono p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                {importText.trim() && (
                  <div className="mt-1 text-[11px] text-blue-600 font-medium">
                    Preview: {importText.trim().split("\n").length} raw row(s) ready to parse
                  </div>
                )}
              </div>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink mx-4 text-xs uppercase font-bold text-slate-400">OR</span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Option 2: Upload Excel File (.xlsx, .xls, .csv)
                </label>
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileUpload}
                  className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                />
              </div>

              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-[11px] text-slate-600">
                <p className="font-semibold text-slate-800 mb-1">💡 Smart Google Sheet Auto-Detection:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>Detects standard 22-column GCE layout (Date, Flat, Client, Building, Category, Item, Frame H, Frame W, Qty, Rate, Factory...)</li>
                  <li>Automatically splits and groups rows by each customer (Client + Flat + Building)</li>
                  <li>Auto-calculates Glass Cut (-7mm), 76.2mm Rounding, Sqft, and 18% GST (9%+9%)</li>
                </ul>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setImportModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!importText.trim()) {
                      showToast("Please paste rows first or choose a file");
                      return;
                    }
                    const parsed = parseInputRows(importText);
                    if (parsed.length > 0) {
                      updateRowsWithHistory([...rows, ...parsed]);
                      const clientsSet = new Set(parsed.map((r) => r.clientName));
                      showToast(`Imported ${parsed.length} rows for ${clientsSet.size} customer(s)!`);
                      setImportText("");
                      setImportModalOpen(false);
                    } else {
                      showToast("No valid rows could be parsed");
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition"
                >
                  Import & Auto-Group Rows
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

