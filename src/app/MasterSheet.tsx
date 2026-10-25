"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import { MasterSheetRowData } from "@/lib/sheet/types";
import { groupRowsByCustomer, GroupedCustomerQuote } from "@/lib/sheet/grouping";
import { calculateQuoteItem, formatIndianCurrency, numberToIndianWords } from "@/lib/calc";

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
  // Navigation tabs: Estimator Grid vs Client Quotations Summary
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

  // Freight charge
  const [freightCharge, setFreightCharge] = useState<number>(0);

  // Import Modal & Toast
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isGeneratingQuote, setIsGeneratingQuote] = useState(false);

  // New Client Modal
  const [newClientModalOpen, setNewClientModalOpen] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientFlat, setNewClientFlat] = useState("");
  const [newClientBuilding, setNewClientBuilding] = useState("");
  const [newClientState, setNewClientState] = useState("Karnataka");
  const [newClientRowsCount, setNewClientRowsCount] = useState(3);
  const [copyFromClient, setCopyFromClient] = useState("NONE");

  // Selected row
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Recalculate row computed values using the pure calculation engine
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
      id: r.id || `row-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      rowOrder: r.rowOrder || 1,
      date: r.date || new Date().toLocaleDateString("en-GB"),
      clientName: r.clientName || "",
      flat: r.flat || "",
      building: r.building || "",
      category: r.category || "Aluminium",
      state: r.state || "Karnataka",
      factory: r.factory || "Veera Glass",
      status: r.status || "Draft",
      notes: r.notes || "",
      productId: r.productId || "",
      description: r.description || "Al Shutters 565",
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
    const prevRow = rows[rows.length - 1];
    const newRow = recalculateRow({
      id: `row-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      rowOrder: rows.length + 1,
      date: prevRow?.date || new Date().toLocaleDateString("en-GB"),
      clientName: filterCustomer !== "ALL" ? filterCustomer : prevRow?.clientName || "Mr. Fayaz",
      flat: prevRow?.flat || "27",
      building: prevRow?.building || "Main Building",
      category: prevRow?.category || "Aluminium",
      state: prevRow?.state || "Karnataka",
      factory: prevRow?.factory || "Veera Glass",
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

  // Duplicate specific row
  const handleDuplicateRow = (id: string) => {
    const target = rows.find((r) => r.id === id);
    if (!target) return;
    const duplicated = recalculateRow({
      ...target,
      id: `row-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      rowOrder: rows.length + 1,
    });
    updateRowsWithHistory([...rows, duplicated]);
    showToast("Measurement row duplicated");
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

  // Fill Down (Ctrl+D)
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

  // Create New Client with fresh measurement rows or copied template
  const handleCreateNewClient = () => {
    if (!newClientName.trim()) {
      showToast("Please enter a client name");
      return;
    }

    const defaultProd = products[0];
    const newRows: MasterSheetRowData[] = [];
    const today = new Date().toLocaleDateString("en-GB");

    if (copyFromClient !== "NONE") {
      const sourceRows = rows.filter((r) => r.clientName === copyFromClient);
      if (sourceRows.length > 0) {
        sourceRows.forEach((sr, idx) => {
          newRows.push(
            recalculateRow({
              id: `row-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
              rowOrder: rows.length + idx + 1,
              date: today,
              clientName: newClientName.trim(),
              flat: newClientFlat.trim() || sr.flat,
              building: newClientBuilding.trim() || sr.building,
              category: sr.category,
              description: sr.description,
              productId: sr.productId,
              frameHeightMm: sr.frameHeightMm,
              frameWidthMm: sr.frameWidthMm,
              quantity: sr.quantity,
              rate: sr.rate,
              state: newClientState,
              factory: sr.factory,
              status: "Draft",
              notes: `Copied from ${copyFromClient}`,
            })
          );
        });
      }
    } else {
      const count = Math.max(1, newClientRowsCount || 3);
      for (let i = 0; i < count; i++) {
        newRows.push(
          recalculateRow({
            id: `row-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
            rowOrder: rows.length + i + 1,
            date: today,
            clientName: newClientName.trim(),
            flat: newClientFlat.trim(),
            building: newClientBuilding.trim(),
            category: "Aluminium",
            description: defaultProd?.name || "Al Shutters 565",
            productId: defaultProd?.code || "AL-SHUTTER-565",
            frameHeightMm: 1000 + i * 150,
            frameWidthMm: 500 + i * 50,
            quantity: 1,
            rate: defaultProd?.rate || 565,
            state: newClientState,
            factory: "Veera Glass",
            status: "Draft",
            notes: "",
          })
        );
      }
    }

    updateRowsWithHistory([...rows, ...newRows]);
    setFilterCustomer(newClientName.trim());
    setNewClientModalOpen(false);
    setNewClientName("");
    setNewClientFlat("");
    setNewClientBuilding("");
    setCopyFromClient("NONE");
    showToast(`Created new client "${newClientName.trim()}" with ${newRows.length} rows!`);
  };

  // Duplicate measurements from an existing client to a new client
  const handleDuplicateClient = (sourceClientName: string) => {
    const targetClient = typeof window !== "undefined" ? window.prompt(`Enter new client name to duplicate measurements from "${sourceClientName}":`) : null;
    if (!targetClient || !targetClient.trim()) return;

    const targetFlat = (typeof window !== "undefined" ? window.prompt(`Enter Flat / Unit for "${targetClient.trim()}":`, "") : "") || "";
    const sourceRows = rows.filter((r) => r.clientName === sourceClientName);
    if (sourceRows.length === 0) return;

    const today = new Date().toLocaleDateString("en-GB");
    const newRows = sourceRows.map((sr, idx) =>
      recalculateRow({
        id: `row-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
        rowOrder: rows.length + idx + 1,
        date: today,
        clientName: targetClient.trim(),
        flat: targetFlat.trim(),
        building: sr.building,
        category: sr.category,
        description: sr.description,
        productId: sr.productId,
        frameHeightMm: sr.frameHeightMm,
        frameWidthMm: sr.frameWidthMm,
        quantity: sr.quantity,
        rate: sr.rate,
        state: sr.state,
        factory: sr.factory,
        status: "Draft",
        notes: `Duplicated from ${sourceClientName}`,
      })
    );

    updateRowsWithHistory([...rows, ...newRows]);
    setFilterCustomer(targetClient.trim());
    showToast(`Duplicated ${newRows.length} measurements for ${targetClient.trim()}!`);
  };

  // Helper to parse raw rows from Google Sheets or standard paste
  const parseInputRows = useCallback((rawText: string): MasterSheetRowData[] => {
    const lines = rawText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return [];

    const parsed: MasterSheetRowData[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
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

      const hasDateAt0 = /\d{1,4}[-/.]\d{1,2}[-/.]\d{2,4}/.test(cols[0]);
      const hasDimAt6and7 = !isNaN(parseFloat(cols[6])) && !isNaN(parseFloat(cols[7]));
      const isGoogleSheetLayout = cols.length >= 10 && (hasDateAt0 || hasDimAt6and7);

      let rowDate = "07/09/2026";
      let client = "Client";
      let flat = "";
      let building = "";
      let category = "Aluminium";
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
        rowDate = cols[0] || "07/09/2026";
        flat = cols[1] || "";
        client = cols[2] || "Customer";
        building = cols[3] || "";
        category = cols[4] || "Aluminium";
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

      // Catalog normalization
      const matchedProd = products.find(
        (p) => p.name.toLowerCase() === desc.toLowerCase() || p.code?.toLowerCase() === desc.toLowerCase()
      );

      if (matchedProd) {
        desc = matchedProd.name;
        if (!rate || rate === 0) rate = matchedProd.rate;
      } else {
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
        id: `row-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
        rowOrder: rows.length + i + 1,
        date: rowDate,
        clientName: client,
        flat,
        building,
        category,
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

  // Paste handler
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

  // Unique customer names
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

  // Auto-grouped quotes
  const groupedQuotes = useMemo(() => {
    return groupRowsByCustomer(rows);
  }, [rows]);

  // Active Customer metadata
  const activeCustomer = useMemo(() => {
    if (filterCustomer !== "ALL") return filterCustomer;
    return filteredRows[0]?.clientName || "Mr. Fayaz";
  }, [filterCustomer, filteredRows]);

  const activeFlat = useMemo(() => {
    return filteredRows[0]?.flat || "27";
  }, [filteredRows]);

  const activeBuilding = useMemo(() => {
    return filteredRows[0]?.building || "Main Building";
  }, [filteredRows]);

  const activeDate = useMemo(() => {
    return filteredRows[0]?.date || "07/09/2026";
  }, [filteredRows]);

  // Active Quote Number
  const activeQuoteNumber = useMemo(() => {
    const cleanDate = (activeDate || "070926").replace(/[-/.]/g, "").substring(0, 6);
    const cleanFlat = (activeFlat || "27").replace(/[^0-9a-zA-Z]/g, "").substring(0, 4);
    return `QT-${cleanDate || "231026"}-${cleanFlat || "27"}`;
  }, [activeDate, activeFlat]);

  // Overall totals across current visible rows
  const overallTotals = useMemo(() => {
    const net = filteredRows.reduce((acc, r) => acc + r.netAmount, 0);
    const gst = filteredRows.reduce((acc, r) => acc + r.gstAmount, 0);
    const subTotal = net + freightCharge;
    const grandTotal = subTotal + gst;
    const displayTotal = Math.round(grandTotal);
    const roundOff = displayTotal - grandTotal;
    const words = numberToIndianWords(displayTotal);
    return { net, gst, subTotal, grandTotal, displayTotal, roundOff, words, count: filteredRows.length };
  }, [filteredRows, freightCharge]);

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
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans" onPaste={handlePaste}>
      {/* ============================================================== */}
      {/* 1. ENTERPRISE HEADER & APPLICATION NAVIGATION                   */}
      {/* ============================================================== */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-[99%] mx-auto px-4 h-16 flex items-center justify-between gap-4">
          {/* Brand & Main Identity */}
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-black text-lg shadow-sm group-hover:scale-105 transition-transform">
                GC
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-base text-slate-900 tracking-tight leading-none">
                    Glass Care Enterprises
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-50 text-blue-700 rounded-full border border-blue-200">
                    ERP Estimator
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Professional Aluminium &amp; Glass Quotation Suite • Near Nagwara, Bangalore
                </p>
              </div>
            </Link>

            {/* Global Navigation Links */}
            <nav className="hidden xl:flex items-center gap-1 ml-4 pl-4 border-l border-slate-200 text-xs font-semibold">
              <span className="px-3 py-1.5 bg-blue-600 text-white rounded-lg shadow-2xs font-bold cursor-default">
                Estimator &amp; Sheet
              </span>
              <Link href="/quotes" className="px-3 py-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition">
                Quotes Registry
              </Link>
              <Link href="/factory" className="px-3 py-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition">
                Factory Indent
              </Link>
              <Link href="/payments" className="px-3 py-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition">
                Payments
              </Link>
              <Link href="/dashboard" className="px-3 py-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition">
                Dashboard
              </Link>
              <Link href="/customers" className="px-3 py-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition">
                Customers
              </Link>
              <Link href="/settings" className="px-3 py-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition">
                Settings
              </Link>
            </nav>
          </div>

          {/* Quick Toolbar Actions */}
          <div className="flex items-center gap-2.5">
            {/* Live Autosave Indicator */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
              <span className={`w-2 h-2 rounded-full ${saveStatus === "saving" ? "bg-amber-500 animate-ping" : saveStatus === "saved" ? "bg-emerald-500" : "bg-red-500"}`}></span>
              <span className="text-slate-600 font-medium text-[11px]">
                {saveStatus === "saving" ? "Saving..." : lastSavedTime ? `Saved at ${lastSavedTime}` : "Database Synced"}
              </span>
            </div>

            {/* Import Button */}
            <button
              onClick={() => setImportModalOpen(true)}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
              title="Import rows from Excel or CSV"
            >
              <span>📥</span>
              <span>Import Sheet</span>
            </button>

            {/* New Client Button */}
            <button
              onClick={() => setNewClientModalOpen(true)}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>+</span>
              <span>New Client</span>
            </button>

            {/* Batch Generate Quotes */}
            <button
              onClick={handleBatchGenerateQuotes}
              disabled={isGeneratingQuote || groupedQuotes.length === 0}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              title="Generate official quotes for all clients"
            >
              <span>⚡</span>
              <span>Batch Generate</span>
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 2. MULTI-CLIENT SWITCHER & FILTER BAR                          */}
        {/* ============================================================== */}
        <div className="bg-slate-100/80 px-4 py-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Client Navigation Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-0.5">
            <span className="font-bold text-slate-500 text-[11px] uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
              <span>Clients:</span>
            </span>

            <button
              onClick={() => {
                setFilterCustomer("ALL");
                showToast("Viewing all clients");
              }}
              className={`px-3 py-1 rounded-full text-xs font-bold transition shrink-0 cursor-pointer ${
                filterCustomer === "ALL"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-white text-slate-700 hover:bg-slate-200 border border-slate-300"
              }`}
            >
              All Clients ({rows.length})
            </button>

            {customerList.map((c) => {
              const count = rows.filter((r) => r.clientName === c).length;
              const isCurrent = filterCustomer === c;
              return (
                <button
                  key={c}
                  onClick={() => {
                    setFilterCustomer(c);
                    showToast(`Active client: ${c}`);
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
                    isCurrent
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-white text-slate-700 hover:bg-slate-200 border border-slate-300"
                  }`}
                >
                  <span>👤 {c}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${isCurrent ? "bg-blue-800 text-white" : "bg-slate-100 text-slate-600"}`}>
                    {count}
                  </span>
                </button>
              );
            })}

            <button
              onClick={() => setNewClientModalOpen(true)}
              className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition shrink-0 flex items-center gap-1 cursor-pointer"
            >
              <span>+</span>
              <span>Add Client</span>
            </button>
          </div>

          {/* Grid View Controls & Filters */}
          <div className="flex items-center gap-2">
            {/* Undo / Redo */}
            <div className="flex items-center bg-white border border-slate-300 rounded-lg p-0.5 shadow-2xs">
              <button
                onClick={handleUndo}
                disabled={historyIndex <= 0}
                className="px-2 py-0.5 text-slate-700 hover:bg-slate-100 rounded disabled:opacity-30 cursor-pointer"
                title="Undo (Ctrl+Z)"
              >
                ↩
              </button>
              <button
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1}
                className="px-2 py-0.5 text-slate-700 hover:bg-slate-100 rounded disabled:opacity-30 cursor-pointer"
                title="Redo (Ctrl+Y)"
              >
                ↪
              </button>
            </div>

            {/* Fill Down */}
            <button
              onClick={handleFillDown}
              disabled={!selectedRowId}
              className="px-2.5 py-1 bg-white hover:bg-blue-50 text-blue-700 border border-blue-300 rounded-lg text-xs font-semibold disabled:opacity-30 transition cursor-pointer"
              title="Fill Down (Ctrl+D)"
            >
              ↓ Fill Down
            </button>

            {/* Add Measurement Row */}
            <button
              onClick={handleAddRow}
              className="px-3 py-1 bg-white hover:bg-slate-50 text-slate-900 border border-slate-300 rounded-lg text-xs font-bold transition cursor-pointer shadow-2xs"
            >
              + Add Row
            </button>

            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search items, sizes..."
                className="w-44 pl-7 pr-2.5 py-1 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <span className="absolute left-2 top-1.5 text-slate-400 text-xs">🔍</span>
            </div>

            {/* Factory Selector */}
            <select
              value={filterFactory}
              onChange={(e) => setFilterFactory(e.target.value)}
              className="px-2 py-1 text-xs bg-white border border-slate-300 rounded-lg cursor-pointer"
            >
              <option value="ALL">All Factories</option>
              {factories.map((f) => (
                <option key={f.id} value={f.name}>
                  {f.name}
                </option>
              ))}
            </select>

            {/* Status Selector */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-2 py-1 text-xs bg-white border border-slate-300 rounded-lg cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Approved">Approved</option>
              <option value="In production">In Production</option>
              <option value="Delivered">Delivered</option>
            </select>

            {/* State Selector */}
            <select
              value={filterState}
              onChange={(e) => setFilterState(e.target.value)}
              className="px-2 py-1 text-xs bg-white border border-slate-300 rounded-lg cursor-pointer"
            >
              <option value="ALL">All States</option>
              <option value="Karnataka">Karnataka</option>
              <option value="Tamil Nadu">Tamil Nadu</option>
              <option value="Maharashtra">Maharashtra</option>
            </select>

            {/* View Mode Switcher */}
            <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5">
              <button
                onClick={() => setActiveTab("sheet")}
                className={`px-3 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
                  activeTab === "sheet" ? "bg-blue-600 text-white shadow-2xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Measurement Sheet ({rows.length})
              </button>
              <button
                onClick={() => setActiveTab("quotes")}
                className={`px-3 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
                  activeTab === "quotes" ? "bg-blue-600 text-white shadow-2xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Client Quotations ({groupedQuotes.length})
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ============================================================== */}
      {/* 3. MAIN WORKSPACE AREA                                         */}
      {/* ============================================================== */}
      <main className="flex-1 max-w-[99%] mx-auto w-full p-4 space-y-4">
        {activeTab === "sheet" ? (
          <>
            {/* ACTIVE CLIENT ESTIMATION SUMMARY CARD */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 bg-gradient-to-r from-blue-50/40 via-white to-indigo-50/30">
              <div className="flex flex-wrap items-center justify-between gap-6">
                {/* Client Profile Block */}
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-xl shadow-md">
                    {activeCustomer.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                        Active Quotation
                      </span>
                      <span className="text-xs text-slate-500 font-mono font-semibold">
                        Ref: {activeQuoteNumber}
                      </span>
                      <button
                        onClick={() => handleDuplicateClient(activeCustomer)}
                        className="text-[11px] text-blue-600 hover:text-blue-800 font-bold underline cursor-pointer"
                        title="Duplicate window dimensions for a new client"
                      >
                        Duplicate for new client
                      </button>
                    </div>

                    <h2 className="text-xl font-black text-slate-900 mt-1 flex items-center gap-2">
                      <span>{activeCustomer}</span>
                      {activeFlat && (
                        <span className="text-sm font-semibold text-slate-500">
                          (Flat: {activeFlat})
                        </span>
                      )}
                    </h2>

                    <p className="text-xs text-slate-500 font-medium">
                      Site: <span className="font-bold text-slate-700">{activeBuilding || "Main Project"}</span> • State: <span className="font-bold text-slate-700">{filteredRows[0]?.state || "Karnataka"}</span> • {filteredRows.length} Line Items
                    </p>
                  </div>
                </div>

                {/* Financial KPI Cards */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs divide-x divide-slate-100">
                    <div className="px-3 text-right">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Sub Total</span>
                      <span className="font-mono text-sm font-bold text-slate-800">
                        {formatIndianCurrency(overallTotals.subTotal)}
                      </span>
                    </div>

                    <div className="px-3 text-right">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">GST 18%</span>
                      <span className="font-mono text-sm font-bold text-slate-800">
                        {formatIndianCurrency(overallTotals.gst)}
                      </span>
                    </div>

                    <div className="px-4 text-right bg-blue-50/60 rounded-lg">
                      <span className="text-[10px] font-black text-blue-700 uppercase tracking-wider block">Grand Total</span>
                      <span className="font-mono text-xl font-black text-blue-900">
                        {formatIndianCurrency(overallTotals.displayTotal)}
                      </span>
                    </div>
                  </div>

                  {/* Actions for active client */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const targetGrp = groupedQuotes.find((g) => g.clientName === activeCustomer) || groupedQuotes[0];
                        if (targetGrp) handleCreateOfficialQuote(targetGrp);
                      }}
                      disabled={isGeneratingQuote}
                      className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                      title="Save as official quote in database"
                    >
                      <span>📄</span>
                      <span>Save as Official Quote</span>
                    </button>

                    <button
                      onClick={() => {
                        const waText = encodeURIComponent(
                          `*GLASS CARE ENTERPRISES - QUOTATION*\nCustomer: ${activeCustomer}\nFlat: ${activeFlat}\nQuote No: ${activeQuoteNumber}\nTotal Amount: ${formatIndianCurrency(overallTotals.displayTotal)}\nSub Total: ${formatIndianCurrency(overallTotals.subTotal)}\nGST 18%: ${formatIndianCurrency(overallTotals.gst)}\n\nThank you for choosing Glass Care Enterprises!`
                        );
                        window.open(`https://wa.me/?text=${waText}`, "_blank");
                      }}
                      className="px-3 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                      title="Share quote summary via WhatsApp"
                    >
                      <span>💬</span>
                      <span>WhatsApp</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ADVANCED MEASUREMENT & CALCULATION GRID */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold text-[11px] uppercase tracking-wider select-none">
                      <th className="py-3 px-2 text-center w-10">#</th>
                      <th className="py-3 px-2 min-w-[95px]">Date</th>
                      <th className="py-3 px-2 min-w-[70px]">Flat</th>
                      <th className="py-3 px-3 min-w-[130px]">Client Name</th>
                      <th className="py-3 px-2 min-w-[110px]">Project Site</th>
                      <th className="py-3 px-2 min-w-[110px]">Category</th>
                      <th className="py-3 px-3 min-w-[150px]">Product / Item</th>
                      <th className="py-3 px-2 text-right min-w-[75px] bg-amber-50/50">Frame H</th>
                      <th className="py-3 px-2 text-right min-w-[75px] bg-amber-50/50">Frame W</th>
                      <th className="py-3 px-2 text-right min-w-[80px] bg-amber-100/40">Round H</th>
                      <th className="py-3 px-2 text-right min-w-[80px] bg-amber-100/40">Round W</th>
                      <th className="py-3 px-2 text-center w-12 bg-emerald-50/50">Qty</th>
                      <th className="py-3 px-2 text-right min-w-[65px]">R.Ft</th>
                      <th className="py-3 px-2 text-right min-w-[75px] bg-yellow-50 font-black text-amber-950">Sqft</th>
                      <th className="py-3 px-2 text-right min-w-[75px] bg-yellow-50 font-black text-amber-950">Rate (₹)</th>
                      <th className="py-3 px-2 min-w-[95px]">State</th>
                      <th className="py-3 px-1 text-center w-14">GST %</th>
                      <th className="py-3 px-2 text-right min-w-[80px] bg-orange-50 font-bold text-orange-900">GST (₹)</th>
                      <th className="py-3 px-2 text-right min-w-[85px] bg-orange-50 font-black text-orange-950">Net (₹)</th>
                      <th className="py-3 px-2 min-w-[110px]">Factory</th>
                      <th className="py-3 px-2 min-w-[100px]">Status</th>
                      <th className="py-3 px-2 text-right min-w-[75px] bg-blue-50/40">Glass H (-7)</th>
                      <th className="py-3 px-2 text-right min-w-[75px] bg-blue-50/40">Glass W (-7)</th>
                      <th className="py-3 px-2 text-center w-14">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {filteredRows.map((r, idx) => {
                      const isSelected = selectedRowId === r.id;
                      return (
                        <tr
                          key={r.id}
                          onClick={() => setSelectedRowId(r.id)}
                          className={`hover:bg-blue-50/40 transition text-xs ${isSelected ? "bg-blue-50/80 ring-1 ring-blue-400" : ""}`}
                        >
                          {/* Row Number */}
                          <td className="py-2 px-2 text-center text-slate-400 font-mono text-[11px] select-none">
                            {idx + 1}
                          </td>

                          {/* Date */}
                          <td className="py-1 px-1">
                            <input
                              type="text"
                              value={r.date || "07/09/2026"}
                              onChange={(e) => handleCellChange(r.id, { date: e.target.value })}
                              className="w-full px-1.5 py-1 text-xs border border-transparent hover:border-slate-300 focus:border-blue-500 rounded bg-transparent focus:bg-white font-mono"
                            />
                          </td>

                          {/* Flat */}
                          <td className="py-1 px-1">
                            <input
                              type="text"
                              value={r.flat}
                              onChange={(e) => handleCellChange(r.id, { flat: e.target.value })}
                              placeholder="Flat"
                              className="w-full px-1.5 py-1 text-xs border border-transparent hover:border-slate-300 focus:border-blue-500 rounded bg-transparent focus:bg-white font-mono"
                            />
                          </td>

                          {/* Client Name */}
                          <td className="py-1 px-1">
                            <input
                              type="text"
                              value={r.clientName}
                              onChange={(e) => handleCellChange(r.id, { clientName: e.target.value })}
                              placeholder="Client name"
                              className="w-full px-2 py-1 text-xs font-bold text-slate-900 border border-transparent hover:border-slate-300 focus:border-blue-500 rounded bg-transparent focus:bg-white"
                            />
                          </td>

                          {/* Building / Project */}
                          <td className="py-1 px-1">
                            <input
                              type="text"
                              value={r.building}
                              onChange={(e) => handleCellChange(r.id, { building: e.target.value })}
                              placeholder="Building / Site"
                              className="w-full px-1.5 py-1 text-xs border border-transparent hover:border-slate-300 focus:border-blue-500 rounded bg-transparent focus:bg-white"
                            />
                          </td>

                          {/* Category */}
                          <td className="py-1 px-1">
                            <input
                              type="text"
                              value={r.category || "Aluminium"}
                              onChange={(e) => handleCellChange(r.id, { category: e.target.value })}
                              placeholder="Category"
                              className="w-full px-1.5 py-1 text-xs border border-transparent hover:border-slate-300 focus:border-blue-500 rounded bg-transparent focus:bg-white text-slate-600"
                            />
                          </td>

                          {/* Product / Description */}
                          <td className="py-1 px-1">
                            <input
                              type="text"
                              value={r.description}
                              onChange={(e) => handleCellChange(r.id, { description: e.target.value })}
                              placeholder="Item description"
                              className="w-full px-2 py-1 text-xs font-semibold text-slate-800 border border-transparent hover:border-slate-300 focus:border-blue-500 rounded bg-transparent focus:bg-white"
                            />
                          </td>

                          {/* Frame H */}
                          <td className="py-1 px-1 bg-amber-50/30">
                            <input
                              type="number"
                              value={r.frameHeightMm || ""}
                              onChange={(e) => handleCellChange(r.id, { frameHeightMm: parseFloat(e.target.value) || 0 })}
                              className="w-full px-1.5 py-1 text-xs text-right font-mono font-medium border border-transparent hover:border-slate-300 focus:border-blue-500 rounded bg-transparent focus:bg-white"
                            />
                          </td>

                          {/* Frame W */}
                          <td className="py-1 px-1 bg-amber-50/30">
                            <input
                              type="number"
                              value={r.frameWidthMm || ""}
                              onChange={(e) => handleCellChange(r.id, { frameWidthMm: parseFloat(e.target.value) || 0 })}
                              className="w-full px-1.5 py-1 text-xs text-right font-mono font-medium border border-transparent hover:border-slate-300 focus:border-blue-500 rounded bg-transparent focus:bg-white"
                            />
                          </td>

                          {/* Rounded H (76.2mm) */}
                          <td className="py-2 px-2 text-right font-mono text-slate-600 bg-amber-100/20">
                            {r.roundedHeightMm}
                          </td>

                          {/* Rounded W (76.2mm) */}
                          <td className="py-2 px-2 text-right font-mono text-slate-600 bg-amber-100/20">
                            {r.roundedWidthMm}
                          </td>

                          {/* Qty */}
                          <td className="py-1 px-1 bg-emerald-50/30">
                            <input
                              type="number"
                              min="1"
                              value={r.quantity || ""}
                              onChange={(e) => handleCellChange(r.id, { quantity: parseInt(e.target.value, 10) || 1 })}
                              className="w-full px-1 py-1 text-xs text-center font-mono font-bold border border-transparent hover:border-slate-300 focus:border-blue-500 rounded bg-transparent focus:bg-white"
                            />
                          </td>

                          {/* R.Ft */}
                          <td className="py-2 px-2 text-right font-mono text-slate-600">
                            {r.runningFeet.toFixed(1)}
                          </td>

                          {/* Sqft */}
                          <td className="py-2 px-2 text-right font-mono font-bold text-slate-900 bg-yellow-50/60">
                            {r.sqft.toFixed(3)}
                          </td>

                          {/* Rate */}
                          <td className="py-1 px-1 bg-yellow-50/60">
                            <input
                              type="number"
                              value={r.rate || ""}
                              onChange={(e) => handleCellChange(r.id, { rate: parseFloat(e.target.value) || 0 })}
                              className="w-full px-1.5 py-1 text-xs text-right font-mono font-bold text-slate-900 border border-transparent hover:border-slate-300 focus:border-blue-500 rounded bg-transparent focus:bg-white"
                            />
                          </td>

                          {/* State */}
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

                          {/* GST % */}
                          <td className="py-2 px-1 text-center font-mono text-[11px] text-slate-500">
                            {r.state === "Karnataka" ? "9%+9%" : "18%"}
                          </td>

                          {/* GST Amt */}
                          <td className="py-2 px-2 text-right font-mono text-orange-800 bg-orange-50/50">
                            {formatIndianCurrency(r.gstAmount)}
                          </td>

                          {/* Net Amount */}
                          <td className="py-2 px-2 text-right font-mono font-black text-slate-900 bg-orange-50/50">
                            {formatIndianCurrency(r.netAmount)}
                          </td>

                          {/* Factory */}
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

                          {/* Status */}
                          <td className="py-1 px-1">
                            <select
                              value={r.status}
                              onChange={(e) => handleCellChange(r.id, { status: e.target.value })}
                              className="w-full px-1.5 py-1 text-xs border border-transparent hover:border-slate-300 focus:border-blue-500 rounded bg-transparent focus:bg-white font-medium"
                            >
                              <option value="Draft">Draft</option>
                              <option value="Approved">Approved</option>
                              <option value="In production">In Production</option>
                              <option value="Delivered">Delivered</option>
                            </select>
                          </td>

                          {/* Glass Cut H (-7mm) */}
                          <td className="py-2 px-2 text-right font-mono text-blue-900 bg-blue-50/30">
                            {r.glassCutHeightMm}
                          </td>

                          {/* Glass Cut W (-7mm) */}
                          <td className="py-2 px-2 text-right font-mono text-blue-900 bg-blue-50/30">
                            {r.glassCutWidthMm}
                          </td>

                          {/* Actions */}
                          <td className="py-1 px-1 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleDuplicateRow(r.id)}
                                className="text-slate-400 hover:text-blue-600 px-1 py-0.5 rounded transition cursor-pointer"
                                title="Duplicate Row"
                              >
                                📋
                              </button>
                              <button
                                onClick={() => handleDeleteRow(r.id)}
                                className="text-slate-400 hover:text-red-600 px-1 py-0.5 rounded transition font-bold cursor-pointer"
                                title="Delete Row"
                              >
                                ✕
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Grid Footer Summary */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-slate-600">
                    Showing {filteredRows.length} of {rows.length} measurement entries
                  </span>
                  <button
                    onClick={handleAddRow}
                    className="px-3 py-1 bg-white hover:bg-slate-100 text-blue-700 border border-blue-200 rounded-lg font-bold transition shadow-2xs cursor-pointer"
                  >
                    + Add Measurement Line
                  </button>
                </div>

                <div className="flex items-center gap-6 font-mono text-xs">
                  <div>
                    <span className="text-slate-400 font-sans mr-2">Total Sqft:</span>
                    <span className="font-bold text-slate-800">
                      {filteredRows.reduce((acc, r) => acc + r.sqft, 0).toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-sans mr-2">Net Value:</span>
                    <span className="font-bold text-slate-900">
                      {formatIndianCurrency(overallTotals.net)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-sans mr-2">Total GST:</span>
                    <span className="font-bold text-slate-900">
                      {formatIndianCurrency(overallTotals.gst)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* COMMERCIAL DETAILS, WORDS, BANK AND TERMS */}
            <div className="grid grid-cols-12 gap-6">
              {/* Left Column: Bank Details & Terms */}
              <div className="col-span-12 lg:col-span-8 space-y-4">
                {/* Total in Indian Rupee Words Banner */}
                <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl shadow-xs">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 block">
                    Amount in Words (INR)
                  </span>
                  <p className="text-sm font-serif italic font-bold text-amber-950 mt-1">
                    &ldquo;{overallTotals.words}&rdquo;
                  </p>
                </div>

                {/* Bank Account Details */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-2">
                  <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
                    <span>🏦</span>
                    <span>Banking &amp; Settlement Details</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs font-mono text-slate-700">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                      <div className="text-[10px] font-sans font-bold text-slate-400 uppercase">Bank Account</div>
                      <div className="font-bold text-slate-900 text-sm">STATE BANK OF INDIA</div>
                      <div>IFSC: <span className="font-bold text-blue-700">SBIN0002263</span></div>
                      <div>A/C: <span className="font-bold text-slate-900">42443380892</span></div>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                      <div className="text-[10px] font-sans font-bold text-slate-400 uppercase">UPI &amp; Branch</div>
                      <div>UPI ID: <span className="font-bold text-blue-700">9945988552@upi</span></div>
                      <div className="text-[11px] font-sans text-slate-600 mt-1">
                        Branch: Masque Road, Richards Town, Bangalore 560005
                      </div>
                    </div>
                  </div>
                </div>

                {/* Commercial Terms & Conditions */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs text-xs space-y-2">
                  <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
                    <span>📋</span>
                    <span>Standard Terms &amp; Conditions</span>
                  </h3>
                  <ol className="list-decimal list-inside space-y-1 text-slate-600 text-xs pl-1 leading-relaxed">
                    <li>Order once confirmed cannot be cancelled.</li>
                    <li>Any complaint related to processing quality should be informed at time of unloading duly remarked on delivery challan.</li>
                    <li>All disputes shall be subject to Bangalore jurisdiction only.</li>
                    <li><strong>Advance:</strong> Initial payment 70% of gross price to be paid at time of ordering.</li>
                    <li><strong>Delivery:</strong> Interim payment 20% of gross price on delivery pallet glass &amp; material of goods to be used for work.</li>
                    <li><strong>Completion:</strong> Final payment 10% of gross price on completion of works.</li>
                  </ol>
                </div>
              </div>

              {/* Right Column: Financial Calculation Box */}
              <div className="col-span-12 lg:col-span-4">
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 sticky top-28">
                  <h3 className="font-black text-slate-900 text-xs uppercase tracking-wider pb-2 border-b border-slate-100">
                    Quotation Totals
                  </h3>

                  <div className="space-y-2.5 text-xs">
                    {/* Freight Charge Input */}
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-600">Freight &amp; Packaging:</span>
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400 font-mono">₹</span>
                        <input
                          type="number"
                          value={freightCharge || ""}
                          onChange={(e) => setFreightCharge(parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                          className="w-24 text-right px-2.5 py-1 text-xs border border-slate-300 rounded-lg font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                      <span className="text-slate-600">Sub Total:</span>
                      <span className="font-mono font-bold text-slate-900">
                        {formatIndianCurrency(overallTotals.subTotal)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">GST Total (18%):</span>
                      <span className="font-mono font-bold text-slate-900">
                        {formatIndianCurrency(overallTotals.gst)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-400 text-[11px] pt-1 border-t border-slate-100">
                      <span>Exact Grand Total:</span>
                      <span className="font-mono">{formatIndianCurrency(overallTotals.grandTotal)}</span>
                    </div>

                    <div className="flex items-center justify-between text-slate-400 text-[11px]">
                      <span>Round Off:</span>
                      <span className="font-mono">
                        {overallTotals.roundOff >= 0 ? `+${overallTotals.roundOff.toFixed(2)}` : overallTotals.roundOff.toFixed(2)}
                      </span>
                    </div>

                    {/* Final Grand Total Display */}
                    <div className="p-4 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-xl shadow-md flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider block opacity-80">Final Payable</span>
                        <span className="text-sm font-bold">Grand Total</span>
                      </div>
                      <span className="font-mono text-2xl font-black">
                        {formatIndianCurrency(overallTotals.displayTotal)}
                      </span>
                    </div>
                  </div>

                  {/* Actions inside summary box */}
                  <div className="pt-2 flex flex-col gap-2">
                    <button
                      onClick={() => {
                        const targetGrp = groupedQuotes.find((g) => g.clientName === activeCustomer) || groupedQuotes[0];
                        if (targetGrp) handleCreateOfficialQuote(targetGrp);
                      }}
                      disabled={isGeneratingQuote}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                    >
                      <span>📄</span>
                      <span>Save as Official Quote</span>
                    </button>

                    <button
                      onClick={() => {
                        const waText = encodeURIComponent(
                          `*GLASS CARE ENTERPRISES - QUOTATION*\nCustomer: ${activeCustomer}\nFlat: ${activeFlat}\nQuote No: ${activeQuoteNumber}\nTotal Amount: ${formatIndianCurrency(overallTotals.displayTotal)}\nSub Total: ${formatIndianCurrency(overallTotals.subTotal)}\nGST 18%: ${formatIndianCurrency(overallTotals.gst)}\n\nThank you for choosing Glass Care Enterprises!`
                        );
                        window.open(`https://wa.me/?text=${waText}`, "_blank");
                      }}
                      className="w-full py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>💬</span>
                      <span>Share on WhatsApp</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* ============================================================== */
          /* CLIENT QUOTATIONS SUMMARY TAB                                  */
          /* ============================================================== */
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-black text-slate-900">Client Quotations Overview</h2>
                <p className="text-xs text-slate-500 font-medium">
                  Automatically organized by Client + Flat + Building with live financial totals and PDF exports
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="px-3 py-1.5 bg-blue-50 text-blue-700 font-bold rounded-lg text-xs border border-blue-200">
                  {groupedQuotes.length} Client Quotations Ready
                </span>

                <button
                  onClick={handleBatchGenerateQuotes}
                  disabled={isGeneratingQuote || groupedQuotes.length === 0}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  title="Generate official quotes for all customers in one click"
                >
                  <span>⚡</span>
                  <span>{isGeneratingQuote ? "Generating Quotes..." : "Batch Generate All Quotes"}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {groupedQuotes.map((q, idx) => (
                <div key={q.groupKey} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:border-blue-400 transition">
                  <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-100 gap-3">
                    <div className="flex items-center gap-3">
                      <span className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-black text-sm">
                        #{idx + 1}
                      </span>
                      <div>
                        <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                          <span>{q.clientName}</span>
                          {q.flat && <span className="text-xs font-semibold text-slate-500">(Flat {q.flat})</span>}
                          {q.building && <span className="text-xs text-slate-400">— {q.building}</span>}
                        </h3>
                        <p className="text-xs text-slate-500 font-medium">
                          State: {q.state} • Factory: {q.factory} • Status: <span className="font-semibold text-blue-700">{q.status}</span> • {q.rowCount} Line Items
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Sub Total</span>
                        <span className="font-mono text-xs font-bold text-slate-800">
                          {formatIndianCurrency(q.subTotal)}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">GST 18%</span>
                        <span className="font-mono text-xs font-bold text-slate-800">
                          {formatIndianCurrency(q.gstTotal)}
                        </span>
                      </div>

                      <div className="text-right bg-blue-50 px-3.5 py-1.5 rounded-xl border border-blue-100">
                        <span className="text-[10px] text-blue-700 uppercase font-bold tracking-wider block">Grand Total</span>
                        <span className="font-mono text-base font-black text-blue-900">
                          {formatIndianCurrency(q.displayTotal)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 pl-2 border-l border-slate-100">
                        <button
                          onClick={() => handleCreateOfficialQuote(q)}
                          disabled={isGeneratingQuote}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs transition disabled:opacity-50 flex items-center gap-1 cursor-pointer"
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
                          className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold rounded-lg transition flex items-center gap-1 cursor-pointer"
                        >
                          <span>💬</span>
                          <span>WhatsApp</span>
                        </button>

                        <button
                          onClick={() => {
                            setFilterCustomer(q.clientName);
                            setActiveTab("sheet");
                            showToast(`Editing sheet for ${q.clientName}`);
                          }}
                          className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold rounded-lg transition flex items-center gap-1 cursor-pointer"
                        >
                          <span>✏️</span>
                          <span>Edit Sheet</span>
                        </button>

                        <button
                          onClick={() => handleDuplicateClient(q.clientName)}
                          className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold rounded-lg transition flex items-center gap-1 cursor-pointer"
                        >
                          <span>📋</span>
                          <span>Duplicate</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-2.5 text-xs italic text-slate-500 font-serif">
                    &ldquo;{q.displayTotalWords}&rdquo;
                  </div>

                  {/* Line Items Preview */}
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-slate-400 border-b border-slate-100 text-[11px] uppercase tracking-wider font-semibold">
                          <th className="py-1.5 px-2">Item Description</th>
                          <th className="py-1.5 px-2 text-right">Frame (mm)</th>
                          <th className="py-1.5 px-2 text-right">Glass Cut</th>
                          <th className="py-1.5 px-2 text-right">Rounded (76.2)</th>
                          <th className="py-1.5 px-2 text-center">Qty</th>
                          <th className="py-1.5 px-2 text-right">Sqft</th>
                          <th className="py-1.5 px-2 text-right">Rate (₹)</th>
                          <th className="py-1.5 px-2 text-right">Net (₹)</th>
                          <th className="py-1.5 px-2 text-right">GST (₹)</th>
                          <th className="py-1.5 px-2 text-right">Total (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 text-[11px] font-mono">
                        {q.rows.map((row) => (
                          <tr key={row.id}>
                            <td className="py-1.5 px-2 font-sans font-semibold text-slate-800">{row.description}</td>
                            <td className="py-1.5 px-2 text-right">{row.frameHeightMm}×{row.frameWidthMm}</td>
                            <td className="py-1.5 px-2 text-right text-slate-500">{row.glassCutHeightMm}×{row.glassCutWidthMm}</td>
                            <td className="py-1.5 px-2 text-right text-slate-500">{row.roundedHeightMm}×{row.roundedWidthMm}</td>
                            <td className="py-1.5 px-2 text-center font-bold text-slate-900">{row.quantity}</td>
                            <td className="py-1.5 px-2 text-right">{row.sqft.toFixed(3)}</td>
                            <td className="py-1.5 px-2 text-right">{row.rate}</td>
                            <td className="py-1.5 px-2 text-right font-medium text-slate-900">{formatIndianCurrency(row.netAmount)}</td>
                            <td className="py-1.5 px-2 text-right text-slate-600">{formatIndianCurrency(row.gstAmount)}</td>
                            <td className="py-1.5 px-2 text-right font-bold text-slate-900">{formatIndianCurrency(row.totalAmount)}</td>
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

      {/* ============================================================== */}
      {/* 4. MODALS & POPUPS                                             */}
      {/* ============================================================== */}

      {/* Floating Toast Alert */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-bounce">
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
                  <h3 className="text-base font-bold text-slate-900">Import Measurement Spreadsheet</h3>
                  <p className="text-xs text-slate-500">
                    Paste raw rows from Excel / Google Sheets or upload a .xlsx file
                  </p>
                </div>
              </div>
              <button
                onClick={() => setImportModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Option 1: Paste rows directly (Tab or Comma separated)
                </label>
                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder="Paste multi-row data here... Column structure (Date, Flat, Client, Building, Category, Item, Frame H, Frame W, Qty, Rate...) is automatically detected!"
                  rows={6}
                  className="w-full text-xs font-mono p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
                <p className="font-semibold text-slate-800 mb-1">💡 Smart Multi-Client Auto-Detection:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>Detects standard 22-column layout (Date, Flat, Client, Building, Category, Item, Frame H, Frame W, Qty, Rate, Factory...)</li>
                  <li>Automatically splits and groups rows by each customer (Client + Flat + Building)</li>
                  <li>Auto-calculates Glass Cut (-7mm), 76.2mm Rounding, Sqft, and 18% GST (9%+9%)</li>
                </ul>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setImportModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
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
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition cursor-pointer"
                >
                  Import &amp; Auto-Group Rows
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Client Modal */}
      {newClientModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">👤</span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Add New Client Quote</h3>
                  <p className="text-xs text-slate-500">
                    Create a dedicated client section with live measurements &amp; quotation
                  </p>
                </div>
              </div>
              <button
                onClick={() => setNewClientModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Client / Customer Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="e.g. Mr. Ramesh, Dr. Sharma, Prestige Tower A"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Flat / Villa No</label>
                  <input
                    type="text"
                    value={newClientFlat}
                    onChange={(e) => setNewClientFlat(e.target.value)}
                    placeholder="e.g. 104, B-302"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Apartment / Building / Project</label>
                  <input
                    type="text"
                    value={newClientBuilding}
                    onChange={(e) => setNewClientBuilding(e.target.value)}
                    placeholder="e.g. Prestige Lakeside, Sobha"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">State (GST)</label>
                  <select
                    value={newClientState}
                    onChange={(e) => setNewClientState(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="Karnataka">Karnataka (9%+9% CGST/SGST)</option>
                    <option value="Tamil Nadu">Tamil Nadu (18% IGST)</option>
                    <option value="Maharashtra">Maharashtra (18% IGST)</option>
                    <option value="Kerala">Kerala (18% IGST)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Starting Measurement Rows</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={newClientRowsCount}
                    onChange={(e) => setNewClientRowsCount(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {customerList.length > 0 && (
                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl">
                  <label className="block font-bold text-blue-900 mb-1">
                    📋 Optional: Copy Window Sizes from Existing Client
                  </label>
                  <select
                    value={copyFromClient}
                    onChange={(e) => setCopyFromClient(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-blue-300 rounded-lg text-xs bg-white font-medium text-slate-800 focus:outline-none"
                  >
                    <option value="NONE">-- Start with fresh measurement lines --</option>
                    {customerList.map((c) => (
                      <option key={c} value={c}>
                        Copy all measurements from {c}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-blue-700 mt-1">
                    Ideal when the new flat or villa has identical window sizes!
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setNewClientModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateNewClient}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <span>✓</span>
                  <span>Create Client &amp; Open Sheet</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
