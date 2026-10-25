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
  // Navigation tabs matching the Google Sheet tabs: _Notebook Size's @26L and _Notelist @26
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

  // Active cell coordinate for fx bar
  const [activeCellCoord, setActiveCellCoord] = useState("A1:D4");
  const [activeCellValue, setActiveCellValue] = useState("GLASS CARE ENTERPRISES");

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
      date: r.date || "07/09/2026",
      clientName: r.clientName || "",
      flat: r.flat || "",
      building: r.building || "",
      category: r.category || "",
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
      id: `row-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      rowOrder: rows.length + 1,
      date: prevRow?.date || "07/09/2026",
      clientName: filterCustomer !== "ALL" ? filterCustomer : prevRow?.clientName || "Mr. Fayaz",
      flat: prevRow?.flat || "27",
      building: prevRow?.building || "Al.",
      category: prevRow?.category || "",
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
              id: `row-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
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
            id: `row-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
            rowOrder: rows.length + i + 1,
            date: today,
            clientName: newClientName.trim(),
            flat: newClientFlat.trim(),
            building: newClientBuilding.trim(),
            category: "",
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
        id: `row-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
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
      const hasDateAt0 = /\d{1,4}[-/.]\d{1,2}[-/.]\d{2,4}/.test(cols[0]);
      const hasDimAt6and7 = !isNaN(parseFloat(cols[6])) && !isNaN(parseFloat(cols[7]));
      const isGoogleSheetLayout = cols.length >= 10 && (hasDateAt0 || hasDimAt6and7);

      let rowDate = "07/09/2026";
      let client = "Client";
      let flat = "";
      let building = "";
      let category = "";
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
        category = cols[4] || "";
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

  // Active Customer metadata
  const activeCustomer = useMemo(() => {
    if (filterCustomer !== "ALL") return filterCustomer;
    return filteredRows[0]?.clientName || "Mr. Fayaz";
  }, [filterCustomer, filteredRows]);

  const activeFlat = useMemo(() => {
    return filteredRows[0]?.flat || "27.00";
  }, [filteredRows]);

  const activeBuilding = useMemo(() => {
    return filteredRows[0]?.building || "Al.";
  }, [filteredRows]);

  const activeDate = useMemo(() => {
    return filteredRows[0]?.date || "07/09/2026";
  }, [filteredRows]);

  // Active Quote Number
  const activeQuoteNumber = useMemo(() => {
    const cleanDate = (activeDate || "070926").replace(/[-/.]/g, "").slice(0, 6);
    const cleanFlat = (activeFlat || "27").replace(/[^0-9a-zA-Z]/g, "").slice(0, 4);
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
    <div className="min-h-screen bg-[#f8f9fa] text-slate-800 flex flex-col font-sans select-none" onPaste={handlePaste}>
      {/* 1. Google Sheets App Header & Ribbon */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="px-4 py-1.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Google Sheets Green Icon */}
            <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
              </svg>
            </div>

            <div>
              {/* Document Title & Status */}
              <div className="flex items-center gap-2">
                <h1 className="text-base font-semibold text-slate-900 leading-none">
                  &ldquo;GCE Meas_42&rdquo;
                </h1>
                <span className="text-slate-400 text-xs cursor-pointer hover:text-amber-500" title="Star document">★</span>
                <span className="text-slate-400 text-xs" title="Save state">
                  {saveStatus === "saving" ? "⏳ Saving..." : saveStatus === "saved" ? "☁️ ✓" : "⚠️"}
                </span>
                <span className="px-1.5 py-0.2 bg-slate-100 text-[10px] font-mono text-slate-500 rounded border border-slate-200">
                  Live Sync
                </span>
              </div>

              {/* Standard Menu Bar */}
              <div className="flex items-center gap-2 text-xs text-slate-600 mt-1">
                <span className="hover:bg-slate-100 px-1.5 py-0.5 rounded cursor-pointer">File</span>
                <span className="hover:bg-slate-100 px-1.5 py-0.5 rounded cursor-pointer">Edit</span>
                <span className="hover:bg-slate-100 px-1.5 py-0.5 rounded cursor-pointer">View</span>
                <span className="hover:bg-slate-100 px-1.5 py-0.5 rounded cursor-pointer">Insert</span>
                <span className="hover:bg-slate-100 px-1.5 py-0.5 rounded cursor-pointer">Format</span>
                <span className="hover:bg-slate-100 px-1.5 py-0.5 rounded cursor-pointer">Data</span>
                <span className="hover:bg-slate-100 px-1.5 py-0.5 rounded cursor-pointer">Tools</span>
                <span className="hover:bg-slate-100 px-1.5 py-0.5 rounded cursor-pointer">Extensions</span>
                <span className="hover:bg-slate-100 px-1.5 py-0.5 rounded cursor-pointer">Help</span>
              </div>
            </div>
          </div>

          {/* Right Toolbar Actions */}
          <div className="flex items-center gap-2.5">
            {/* Quick Customer Switcher */}
            <div className="flex items-center gap-1.5 bg-blue-50/80 px-2 py-1 rounded-lg border border-blue-200">
              <span className="text-[11px] font-bold text-blue-800">Customer:</span>
              <select
                value={filterCustomer}
                onChange={(e) => {
                  setFilterCustomer(e.target.value);
                  showToast(e.target.value === "ALL" ? "Showing all customers" : `Viewing ${e.target.value}`);
                }}
                className="text-xs font-bold bg-white text-blue-950 border border-blue-300 rounded px-2 py-0.5 focus:outline-none cursor-pointer"
              >
                <option value="ALL">👤 All Customers ({customerList.length})</option>
                {customerList.map((c) => (
                  <option key={c} value={c}>
                    👤 {c}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setNewClientModalOpen(true)}
                className="px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-bold shadow-xs transition flex items-center gap-1 cursor-pointer"
                title="Create a new client with their own quotation"
              >
                <span>+</span>
                <span>New</span>
              </button>
            </div>

            {/* Batch Generate Quotes */}
            <button
              onClick={handleBatchGenerateQuotes}
              disabled={isGeneratingQuote}
              className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold rounded-lg shadow-xs transition flex items-center gap-1.5 disabled:opacity-50"
              title="Generate official quotes for all customers in sheet"
            >
              <span>⚡</span>
              <span>Batch Generate</span>
            </button>

            {/* Official PDF */}
            <button
              onClick={() => {
                const targetGrp = groupedQuotes.find((g) => g.clientName === activeCustomer) || groupedQuotes[0];
                if (targetGrp) handleCreateOfficialQuote(targetGrp);
              }}
              disabled={isGeneratingQuote}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition flex items-center gap-1.5 disabled:opacity-50"
              title="Save as official quotation"
            >
              <span>📄</span>
              <span>Save Quote</span>
            </button>

            {/* Share via WhatsApp */}
            <button
              onClick={() => {
                const waText = encodeURIComponent(
                  `*GLASS CARE ENTERPRISES - QUOTATION*\nCustomer: ${activeCustomer}\nFlat: ${activeFlat}\nQuote No: ${activeQuoteNumber}\nTotal Amount: ${formatIndianCurrency(overallTotals.displayTotal)}\nSub Total: ${formatIndianCurrency(overallTotals.subTotal)}\nGST 18%: ${formatIndianCurrency(overallTotals.gst)}\n\nThank you for choosing Glass Care Enterprises!`
                );
                window.open(`https://wa.me/?text=${waText}`, "_blank");
              }}
              className="px-2.5 py-1.5 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300 rounded-lg text-xs font-bold transition flex items-center gap-1"
            >
              <span>💬</span>
              <span>WhatsApp</span>
            </button>

            {/* User Avatar */}
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs ml-1">
              GCE
            </div>
          </div>
        </div>

        {/* 2. Secondary Ribbon: Formatting & Action Buttons */}
        <div className="bg-[#edf2fa] px-4 py-1 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-700">
          <div className="flex items-center gap-2">
            <button
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className="px-2 py-0.5 rounded hover:bg-white text-slate-700 disabled:opacity-30 cursor-pointer"
              title="Undo (Ctrl+Z)"
            >
              ↩
            </button>
            <button
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className="px-2 py-0.5 rounded hover:bg-white text-slate-700 disabled:opacity-30 cursor-pointer"
              title="Redo (Ctrl+Y)"
            >
              ↪
            </button>
            <span className="text-slate-300">|</span>

            {/* Import Button */}
            <button
              onClick={() => setImportModalOpen(true)}
              className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 rounded font-semibold transition flex items-center gap-1"
              title="Import 100s or 1,000s of rows from Google Sheets or Excel"
            >
              <span>📥</span>
              <span>Import Sheet</span>
            </button>

            {/* Fill Down Button */}
            <button
              onClick={handleFillDown}
              disabled={!selectedRowId}
              className="px-2.5 py-1 bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 rounded font-medium disabled:opacity-30 transition"
              title="Fill Down (Ctrl+D): copy previous row"
            >
              ↓ Fill Down
            </button>

            {/* Add Row Button */}
            <button
              onClick={handleAddRow}
              className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded font-medium transition"
            >
              + Add Row
            </button>

            <span className="text-slate-300">|</span>

            {/* Search Box */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search measurement rows..."
                className="w-52 pl-6 pr-2 py-0.5 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <span className="absolute left-1.5 top-1 text-slate-400 text-xs">🔍</span>
            </div>

            {/* Factory Filter */}
            <select
              value={filterFactory}
              onChange={(e) => setFilterFactory(e.target.value)}
              className="px-2 py-0.5 text-xs bg-white border border-slate-300 rounded cursor-pointer"
            >
              <option value="ALL">All Factories</option>
              {factories.map((f) => (
                <option key={f.id} value={f.name}>
                  {f.name}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-2 py-0.5 text-xs bg-white border border-slate-300 rounded cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Approved">Approved</option>
              <option value="In production">In Production</option>
              <option value="Delivered">Delivered</option>
            </select>

            {/* State Filter */}
            <select
              value={filterState}
              onChange={(e) => setFilterState(e.target.value)}
              className="px-2 py-0.5 text-xs bg-white border border-slate-300 rounded cursor-pointer"
            >
              <option value="ALL">All States</option>
              <option value="Karnataka">Karnataka</option>
              <option value="Tamil Nadu">Tamil Nadu</option>
              <option value="Maharashtra">Maharashtra</option>
            </select>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="text-slate-500 font-mono text-[11px]">
              {lastSavedTime ? `Autosaved at ${lastSavedTime}` : "Auto-saving to SQLite"}
            </span>
            <div className="inline-flex rounded border border-slate-300 bg-white p-0.5">
              <button
                onClick={() => setActiveTab("sheet")}
                className={`px-2.5 py-0.5 rounded text-xs font-semibold ${
                  activeTab === "sheet" ? "bg-emerald-600 text-white" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                _Notebook Size&apos;s @26L
              </button>
              <button
                onClick={() => setActiveTab("quotes")}
                className={`px-2.5 py-0.5 rounded text-xs font-semibold ${
                  activeTab === "quotes" ? "bg-emerald-600 text-white" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                _Notelist @26 ({groupedQuotes.length})
              </button>
            </div>
          </div>
        </div>

        {/* 3. Formula Bar (fx) */}
        <div className="bg-white px-4 py-1 border-t border-slate-200 flex items-center gap-2 text-xs">
          <div className="w-16 font-mono text-center font-bold text-slate-600 border-r border-slate-200 pr-2">
            {activeCellCoord}
          </div>
          <span className="font-serif italic font-bold text-slate-400 text-sm">fx</span>
          <div className="flex-1 font-mono text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 text-xs truncate">
            {activeCellValue}
          </div>
        </div>

        {/* 4. Multi-Client Switcher Pills */}
        <div className="bg-[#f0f4f9] px-4 py-1.5 border-t border-slate-200 flex items-center gap-1.5 overflow-x-auto text-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
            <span>👥 Clients:</span>
          </span>

          <button
            onClick={() => {
              setFilterCustomer("ALL");
              showToast("Showing all clients");
            }}
            className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] transition shrink-0 cursor-pointer ${
              filterCustomer === "ALL"
                ? "bg-blue-600 text-white shadow-2xs"
                : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            All Clients ({rows.length} rows)
          </button>

          {customerList.map((c) => {
            const count = rows.filter((r) => r.clientName === c).length;
            const isCurrent = filterCustomer === c;
            return (
              <button
                key={c}
                onClick={() => {
                  setFilterCustomer(c);
                  showToast(`Switched to client: ${c}`);
                }}
                className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  isCurrent
                    ? "bg-emerald-600 text-white shadow-2xs"
                    : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                <span>👤 {c}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isCurrent ? "bg-emerald-700 text-white" : "bg-slate-100 text-slate-600 font-mono"}`}>
                  {count}
                </span>
              </button>
            );
          })}

          <button
            onClick={() => setNewClientModalOpen(true)}
            className="px-2.5 py-0.5 rounded-full font-bold text-[11px] bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 transition shrink-0 flex items-center gap-1 cursor-pointer"
            title="Create a new client with their own measurements"
          >
            <span>+</span>
            <span>Add Client</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-3 overflow-x-auto">
        {activeTab === "sheet" ? (
          <div className="bg-white rounded-lg border border-slate-300 shadow-sm inline-block min-w-full">
            {/* ============================================================== */}
            {/* EXACT GOOGLE SHEET QUOTE HEADER (Rows 1 to 6)                  */}
            {/* ============================================================== */}
            <div className="p-3 border-b-2 border-slate-300 bg-[#fdfdfd]">
              <div className="grid grid-cols-12 gap-3 items-stretch">
                {/* 1. GCE LOGO (A1:D5) */}
                <div
                  className="col-span-12 lg:col-span-3 border-2 border-blue-400 rounded-lg p-3 bg-white flex items-center justify-center gap-3 shadow-2xs cursor-pointer hover:border-blue-500"
                  onClick={() => {
                    setActiveCellCoord("A1:D4");
                    setActiveCellValue("GLASS CARE ENTERPRISES - FRAME YOUR VISION");
                  }}
                >
                  <div className="flex items-center gap-2">
                    {/* Stylized colored bars matching user logo */}
                    <div className="flex h-12 w-2.5 gap-0.5">
                      <span className="w-1 h-full bg-amber-500 rounded-xs"></span>
                      <span className="w-1 h-full bg-red-500 rounded-xs"></span>
                      <span className="w-1 h-full bg-blue-600 rounded-xs"></span>
                    </div>
                    <div>
                      <div className="text-xl font-black text-blue-900 tracking-wider leading-none">
                        GC
                      </div>
                      <div className="text-[11px] font-bold text-blue-800 tracking-wider uppercase">
                        ENTERPRISES
                      </div>
                      <div className="text-[9px] font-black text-orange-600 tracking-widest uppercase mt-0.5">
                        FRAME YOUR VISION
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. COMPANY ADDRESS (E1:H5) */}
                <div
                  className="col-span-12 lg:col-span-3 border border-slate-300 rounded-lg p-3 bg-white flex flex-col justify-center text-center cursor-pointer hover:bg-slate-50"
                  onClick={() => {
                    setActiveCellCoord("E1:H4");
                    setActiveCellValue("GLASS CARE ENTERPRISES, Near Nagwara, Manyata Tech Park, Contact: 7411415842");
                  }}
                >
                  <h2 className="text-sm font-black tracking-wide text-slate-900">
                    GLASS CARE ENTERPRISES
                  </h2>
                  <p className="text-xs text-slate-600 font-medium">Near Nagwara, Manyata Tech Park</p>
                  <p className="text-xs text-slate-700 font-bold mt-0.5">Contact: 7411415842</p>
                </div>

                {/* 3. TOTALS BLOCK (J2:M5) */}
                <div
                  className="col-span-12 sm:col-span-4 lg:col-span-2 border border-slate-300 rounded-lg overflow-hidden bg-white text-xs cursor-pointer hover:border-blue-400"
                  onClick={() => {
                    setActiveCellCoord("J2:M4");
                    setActiveCellValue(`Sub Total: ${overallTotals.subTotal.toFixed(2)}, GST: ${overallTotals.gst.toFixed(2)}, Grand Total: ${overallTotals.grandTotal.toFixed(2)}`);
                  }}
                >
                  <div className="grid grid-cols-2 divide-x divide-y divide-slate-200">
                    <div className="p-1.5 bg-[#f8fafc] font-bold text-slate-600 text-[11px]">Sub Total</div>
                    <div className="p-1.5 text-right font-mono font-bold text-slate-800 text-[11px]">
                      {overallTotals.subTotal.toFixed(2)}
                    </div>
                    <div className="p-1.5 bg-[#f8fafc] font-bold text-slate-600 text-[11px]">GST 18%</div>
                    <div className="p-1.5 text-right font-mono font-bold text-slate-800 text-[11px]">
                      {overallTotals.gst.toFixed(2)}
                    </div>
                    <div className="p-1.5 bg-blue-50 font-black text-blue-900 text-[11px]">Grand Total</div>
                    <div className="p-1.5 text-right font-mono font-black text-blue-900 text-xs bg-blue-50/60">
                      {overallTotals.grandTotal.toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* 4. CUSTOMER BLOCK (N2:P5) */}
                <div
                  className="col-span-12 sm:col-span-4 lg:col-span-2 border border-slate-300 rounded-lg overflow-hidden bg-white text-xs cursor-pointer hover:border-blue-400"
                  onClick={() => {
                    setActiveCellCoord("N2:P4");
                    setActiveCellValue(`FLAT: ${activeFlat}, CUSTOMER: ${activeCustomer}, PROJECT: ${activeBuilding}`);
                  }}
                >
                  <div className="grid grid-cols-2 divide-x divide-y divide-slate-200">
                    <div className="p-1.5 bg-[#f8fafc] font-bold text-slate-600 text-[10px] uppercase">FLAT/HOUSE NO</div>
                    <div className="p-1.5 font-mono font-bold text-slate-900 text-[11px] truncate">
                      {activeFlat}
                    </div>
                    <div className="p-1.5 bg-[#f8fafc] font-bold text-slate-600 text-[10px] uppercase flex items-center justify-between">
                      <span>CUSTOMER NAME</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicateClient(activeCustomer);
                        }}
                        className="text-[9px] text-blue-600 hover:text-blue-800 underline font-normal cursor-pointer"
                        title="Duplicate these measurements for a new client"
                      >
                        Duplicate
                      </button>
                    </div>
                    <div className="p-1.5 font-bold text-blue-950 text-[11px] truncate" title={activeCustomer}>
                      {activeCustomer}
                    </div>
                    <div className="p-1.5 bg-[#f8fafc] font-bold text-slate-600 text-[10px] uppercase">PROJECT</div>
                    <div className="p-1.5 font-semibold text-slate-800 text-[11px] truncate">
                      {activeBuilding || "All"}
                    </div>
                  </div>
                </div>

                {/* 5. QUOTATION METADATA (R1:T5) */}
                <div
                  className="col-span-12 sm:col-span-4 lg:col-span-2 border border-slate-300 rounded-lg overflow-hidden bg-white text-xs cursor-pointer hover:border-blue-400"
                  onClick={() => {
                    setActiveCellCoord("R1:T4");
                    setActiveCellValue(`QUOTE ${activeQuoteNumber} DATE: ${activeDate} VALID: 07/11/2026`);
                  }}
                >
                  <div className="bg-slate-100 font-bold text-center py-0.5 border-b border-slate-300 text-[10px] tracking-wider text-slate-700">
                    QUOTE
                  </div>
                  <div className="grid grid-cols-2 divide-x divide-y divide-slate-200 text-[10px]">
                    <div className="p-1 bg-[#f8fafc] font-bold text-slate-600">DATE</div>
                    <div className="p-1 font-mono font-medium text-slate-800">{activeDate}</div>
                    <div className="p-1 bg-[#f8fafc] font-bold text-slate-600">QUOTE #</div>
                    <div className="p-1 font-mono font-bold text-blue-800 truncate" title={activeQuoteNumber}>
                      {activeQuoteNumber}
                    </div>
                    <div className="p-1 bg-[#f8fafc] font-bold text-slate-600">VALID</div>
                    <div className="p-1 font-mono font-medium text-slate-800">07/11/2026</div>
                  </div>
                </div>
              </div>
            </div>

            {/* ============================================================== */}
            {/* EXACT GOOGLE SHEET TABLE WITH ALL 22 COLUMNS                   */}
            {/* ============================================================== */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs font-sans">
                {/* ROW 7: EXACT COLORED HEADERS */}
                <thead>
                  <tr className="border-b-2 border-slate-400 text-slate-800 font-bold text-[11px] select-none text-center">
                    {/* Row Number Header */}
                    <th className="w-12 bg-slate-200 border-r border-slate-300 py-1.5 text-center text-slate-500 font-mono text-[10px]">
                      7
                    </th>

                    {/* Col A: Date */}
                    <th className="bg-[#eef2e6] border-r border-slate-300 py-2 px-2 min-w-[95px] text-left">
                      Date
                    </th>

                    {/* Col B: Flat no/ Loc */}
                    <th className="bg-[#eef2e6] border-r border-slate-300 py-2 px-2 min-w-[85px] text-left">
                      <span className="flex items-center justify-between">
                        <span>Flat no/ Loc</span>
                        <span className="text-[10px] text-slate-400">▼</span>
                      </span>
                    </th>

                    {/* Col C: Client 'Name's' */}
                    <th className="bg-[#d9ead3] border-r border-slate-300 py-2 px-2 min-w-[130px] text-left text-emerald-950 font-black">
                      <span className="flex items-center justify-between">
                        <span>Client &lsquo;Name&apos;s&rsquo;</span>
                        <span className="text-[10px] text-emerald-700">▼</span>
                      </span>
                    </th>

                    {/* Col D: Appt/Building Name */}
                    <th className="bg-[#eef2e6] border-r border-slate-300 py-2 px-2 min-w-[110px] text-left">
                      Appt/Building Name
                    </th>

                    {/* Col E: Product Category */}
                    <th className="bg-[#f3f4f6] border-r border-slate-300 py-2 px-2 min-w-[110px] text-left">
                      Product Category
                    </th>

                    {/* Col F: Item Name */}
                    <th className="bg-[#f3f4f6] border-r border-slate-300 py-2 px-2 min-w-[140px] text-left">
                      Item Name
                    </th>

                    {/* Col G: Frame H */}
                    <th className="bg-[#fff2cc] border-r border-slate-300 py-2 px-1 min-w-[70px] text-right">
                      Fr am e H
                    </th>

                    {/* Col H: Frame W */}
                    <th className="bg-[#fff2cc] border-r border-slate-300 py-2 px-1 min-w-[70px] text-right">
                      Fr am e W
                    </th>

                    {/* Col I: Round of H 76.2 */}
                    <th className="bg-[#fff2cc] border-r border-slate-300 py-2 px-1 min-w-[75px] text-right">
                      Rou of H 76.2
                    </th>

                    {/* Col J: Round of W */}
                    <th className="bg-[#fff2cc] border-r border-slate-300 py-2 px-1 min-w-[75px] text-right">
                      Rou of W
                    </th>

                    {/* Col K: Qty */}
                    <th className="bg-[#e2efda] border-r border-slate-300 py-2 px-1 min-w-[50px] text-center">
                      Qty
                    </th>

                    {/* Col L: R.ft */}
                    <th className="bg-[#e2efda] border-r border-slate-300 py-2 px-1 min-w-[55px] text-right">
                      R.ft
                    </th>

                    {/* Col M: Size Sqft */}
                    <th className="bg-[#ffd966] border-r border-slate-300 py-2 px-1 min-w-[65px] text-right font-black text-amber-950">
                      Size Sqft
                    </th>

                    {/* Col N: Rate */}
                    <th className="bg-[#ffd966] border-r border-slate-300 py-2 px-1 min-w-[65px] text-right font-black text-amber-950">
                      Rate
                    </th>

                    {/* Col O: State */}
                    <th className="bg-[#fff2cc] border-r border-slate-300 py-2 px-2 min-w-[95px] text-left">
                      State
                    </th>

                    {/* Col P: GST18% */}
                    <th className="bg-[#fff2cc] border-r border-slate-300 py-2 px-1 min-w-[65px] text-center">
                      GST18%
                    </th>

                    {/* Col Q: GST Amt */}
                    <th className="bg-[#f6b26b] border-r border-slate-300 py-2 px-1 min-w-[80px] text-right font-black text-amber-950">
                      GST Amt
                    </th>

                    {/* Col R: Net Amount */}
                    <th className="bg-[#f6b26b] border-r border-slate-300 py-2 px-1 min-w-[90px] text-right font-black text-amber-950">
                      Net Amount
                    </th>

                    {/* Col S: Factory Belongs */}
                    <th className="bg-[#f9cb9c] border-r border-slate-300 py-2 px-2 min-w-[100px] text-left">
                      Factory Belongs.
                    </th>

                    {/* Col T: Status/Installation */}
                    <th className="bg-[#f9cb9c] border-r border-slate-300 py-2 px-2 min-w-[100px] text-left">
                      Status/ Installation
                    </th>

                    {/* Col U: Glass H -7mm */}
                    <th className="bg-[#fff2cc] border-r border-slate-300 py-2 px-1 min-w-[70px] text-right font-bold text-slate-700">
                      Glass H -7mm
                    </th>

                    {/* Col V: Glass W -7mm */}
                    <th className="bg-[#fff2cc] border-r border-slate-300 py-2 px-1 min-w-[70px] text-right font-bold text-slate-700">
                      Glass W -7mm
                    </th>

                    {/* Actions */}
                    <th className="bg-slate-100 py-2 px-1 w-8 text-center text-slate-400"></th>
                  </tr>
                </thead>

                {/* SPREADSHEET DATA ROWS */}
                <tbody className="divide-y divide-slate-200">
                  {filteredRows.map((r, idx) => {
                    const rowNumber = 22 + idx; // Matches starting row 22 in user screenshot!
                    const isSelected = selectedRowId === r.id;

                    return (
                      <tr
                        key={r.id}
                        onClick={() => {
                          setSelectedRowId(r.id);
                          setActiveCellCoord(`C${rowNumber}`);
                          setActiveCellValue(`${r.clientName} | ${r.description} | ${r.frameHeightMm}x${r.frameWidthMm} | Net: ${r.netAmount}`);
                        }}
                        className={`hover:bg-blue-50/40 transition text-[11px] ${
                          isSelected ? "bg-blue-50/70 ring-1 ring-blue-400" : ""
                        }`}
                      >
                        {/* Row Number */}
                        <td className="bg-slate-100 border-r border-slate-300 py-1 px-1 text-center font-mono text-slate-500 select-none text-[10px]">
                          {rowNumber}
                        </td>

                        {/* Col A: Date */}
                        <td className="border-r border-slate-200 p-0.5 font-mono text-slate-700">
                          <input
                            type="text"
                            value={r.date || "07/09/2026"}
                            onChange={(e) => handleCellChange(r.id, { date: e.target.value })}
                            className="w-full px-1.5 py-1 text-[11px] bg-transparent hover:bg-white focus:bg-white focus:outline-none border border-transparent focus:border-blue-400 rounded-xs"
                          />
                        </td>

                        {/* Col B: Flat */}
                        <td className="border-r border-slate-200 p-0.5 font-mono text-slate-800">
                          <input
                            type="text"
                            value={r.flat}
                            onChange={(e) => handleCellChange(r.id, { flat: e.target.value })}
                            placeholder="Flat"
                            className="w-full px-1.5 py-1 text-[11px] bg-transparent hover:bg-white focus:bg-white focus:outline-none border border-transparent focus:border-blue-400 rounded-xs"
                          />
                        </td>

                        {/* Col C: Client Name */}
                        <td className="border-r border-slate-200 p-0.5 font-semibold text-slate-900">
                          <input
                            type="text"
                            value={r.clientName}
                            onChange={(e) => handleCellChange(r.id, { clientName: e.target.value })}
                            placeholder="Client Name"
                            className="w-full px-1.5 py-1 text-[11px] font-bold bg-transparent hover:bg-white focus:bg-white focus:outline-none border border-transparent focus:border-blue-400 rounded-xs"
                          />
                        </td>

                        {/* Col D: Building */}
                        <td className="border-r border-slate-200 p-0.5 text-slate-700">
                          <input
                            type="text"
                            value={r.building}
                            onChange={(e) => handleCellChange(r.id, { building: e.target.value })}
                            placeholder="Building"
                            className="w-full px-1.5 py-1 text-[11px] bg-transparent hover:bg-white focus:bg-white focus:outline-none border border-transparent focus:border-blue-400 rounded-xs"
                          />
                        </td>

                        {/* Col E: Category */}
                        <td className="border-r border-slate-200 p-0.5 text-slate-600">
                          <input
                            type="text"
                            value={r.category || ""}
                            onChange={(e) => handleCellChange(r.id, { category: e.target.value })}
                            placeholder="Category"
                            className="w-full px-1.5 py-1 text-[11px] bg-transparent hover:bg-white focus:bg-white focus:outline-none border border-transparent focus:border-blue-400 rounded-xs"
                          />
                        </td>

                        {/* Col F: Item Name / Description */}
                        <td className="border-r border-slate-200 p-0.5">
                          <input
                            type="text"
                            value={r.description}
                            onChange={(e) => handleCellChange(r.id, { description: e.target.value })}
                            placeholder="Item Name"
                            className="w-full px-1.5 py-1 text-[11px] font-semibold text-slate-800 bg-transparent hover:bg-white focus:bg-white focus:outline-none border border-transparent focus:border-blue-400 rounded-xs"
                          />
                        </td>

                        {/* Col G: Frame H */}
                        <td className="border-r border-slate-200 p-0.5 text-right font-mono">
                          <input
                            type="number"
                            value={r.frameHeightMm || ""}
                            onChange={(e) => handleCellChange(r.id, { frameHeightMm: parseFloat(e.target.value) || 0 })}
                            className="w-full px-1 py-1 text-right text-[11px] bg-transparent hover:bg-white focus:bg-white focus:outline-none border border-transparent focus:border-blue-400 rounded-xs font-mono font-medium"
                          />
                        </td>

                        {/* Col H: Frame W */}
                        <td className="border-r border-slate-200 p-0.5 text-right font-mono">
                          <input
                            type="number"
                            value={r.frameWidthMm || ""}
                            onChange={(e) => handleCellChange(r.id, { frameWidthMm: parseFloat(e.target.value) || 0 })}
                            className="w-full px-1 py-1 text-right text-[11px] bg-transparent hover:bg-white focus:bg-white focus:outline-none border border-transparent focus:border-blue-400 rounded-xs font-mono font-medium"
                          />
                        </td>

                        {/* Col I: Round of H (Computed) */}
                        <td className="border-r border-slate-200 p-1 text-right font-mono text-slate-600 bg-[#fffdf5]">
                          {r.roundedHeightMm}
                        </td>

                        {/* Col J: Round of W (Computed) */}
                        <td className="border-r border-slate-200 p-1 text-right font-mono text-slate-600 bg-[#fffdf5]">
                          {r.roundedWidthMm}
                        </td>

                        {/* Col K: Qty */}
                        <td className="border-r border-slate-200 p-0.5 text-center font-mono">
                          <input
                            type="number"
                            min="1"
                            value={r.quantity || ""}
                            onChange={(e) => handleCellChange(r.id, { quantity: parseInt(e.target.value, 10) || 1 })}
                            className="w-full px-1 py-1 text-center text-[11px] bg-transparent hover:bg-white focus:bg-white focus:outline-none border border-transparent focus:border-blue-400 rounded-xs font-mono font-bold"
                          />
                        </td>

                        {/* Col L: R.ft (Computed) */}
                        <td className="border-r border-slate-200 p-1 text-right font-mono text-slate-600">
                          {r.runningFeet.toFixed(1)}
                        </td>

                        {/* Col M: Size Sqft (Computed) */}
                        <td className="border-r border-slate-200 p-1 text-right font-mono font-semibold text-slate-900 bg-[#fefce8]">
                          {r.sqft.toFixed(3)}
                        </td>

                        {/* Col N: Rate */}
                        <td className="border-r border-slate-200 p-0.5 text-right font-mono">
                          <input
                            type="number"
                            value={r.rate || ""}
                            onChange={(e) => handleCellChange(r.id, { rate: parseFloat(e.target.value) || 0 })}
                            className="w-full px-1 py-1 text-right text-[11px] font-mono font-bold text-slate-900 bg-transparent hover:bg-white focus:bg-white focus:outline-none border border-transparent focus:border-blue-400 rounded-xs"
                          />
                        </td>

                        {/* Col O: State */}
                        <td className="border-r border-slate-200 p-0.5">
                          <select
                            value={r.state}
                            onChange={(e) => handleCellChange(r.id, { state: e.target.value })}
                            className="w-full px-1 py-1 text-[11px] bg-transparent hover:bg-white focus:bg-white border border-transparent focus:border-blue-400 rounded-xs"
                          >
                            <option value="Karnataka">Karnataka</option>
                            <option value="Tamil Nadu">Tamil Nadu</option>
                            <option value="Maharashtra">Maharashtra</option>
                          </select>
                        </td>

                        {/* Col P: GST18% */}
                        <td className="border-r border-slate-200 p-1 text-center text-[10px] text-slate-600 font-mono">
                          {r.state === "Karnataka" ? "9%+9%" : "18%"}
                        </td>

                        {/* Col Q: GST Amt (Computed) */}
                        <td className="border-r border-slate-200 p-1 text-right font-mono text-slate-800 bg-[#fffbeb]">
                          ₹{r.gstAmount.toFixed(2)}
                        </td>

                        {/* Col R: Net Amount (Computed) */}
                        <td className="border-r border-slate-200 p-1 text-right font-mono font-bold text-slate-900 bg-[#fffbeb]">
                          ₹{r.netAmount.toFixed(2)}
                        </td>

                        {/* Col S: Factory Belongs */}
                        <td className="border-r border-slate-200 p-0.5">
                          <select
                            value={r.factory}
                            onChange={(e) => handleCellChange(r.id, { factory: e.target.value })}
                            className="w-full px-1 py-1 text-[11px] bg-transparent hover:bg-white focus:bg-white border border-transparent focus:border-blue-400 rounded-xs"
                          >
                            {factories.map((f) => (
                              <option key={f.id} value={f.name}>
                                {f.name}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Col T: Status/Installation */}
                        <td className="border-r border-slate-200 p-0.5">
                          <select
                            value={r.status}
                            onChange={(e) => handleCellChange(r.id, { status: e.target.value })}
                            className="w-full px-1 py-1 text-[11px] bg-transparent hover:bg-white focus:bg-white border border-transparent focus:border-blue-400 rounded-xs"
                          >
                            <option value="Draft">Draft</option>
                            <option value="Approved">Approved</option>
                            <option value="In production">In Production</option>
                            <option value="Delivered">Delivered</option>
                          </select>
                        </td>

                        {/* Col U: Glass H -7mm (Computed) */}
                        <td className="border-r border-slate-200 p-1 text-right font-mono text-slate-700 bg-[#fffef0]">
                          {r.glassCutHeightMm}
                        </td>

                        {/* Col V: Glass W -7mm (Computed) */}
                        <td className="border-r border-slate-200 p-1 text-right font-mono text-slate-700 bg-[#fffef0]">
                          {r.glassCutWidthMm}
                        </td>

                        {/* Delete Row Action */}
                        <td className="p-0.5 text-center">
                          <button
                            onClick={() => handleDeleteRow(r.id)}
                            className="text-slate-300 hover:text-red-600 font-bold px-1 transition"
                            title="Delete Row"
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ============================================================== */}
            {/* EXACT FOOTER: BANK DETAILS, WORDS, TOTALS, AND TERMS (1501-1515) */}
            {/* ============================================================== */}
            <div className="border-t-2 border-slate-300 bg-[#fafafa] p-4 text-xs font-sans">
              <div className="grid grid-cols-12 gap-6">
                {/* Left: Bank Details & Terms */}
                <div className="col-span-12 lg:col-span-8 space-y-4">
                  {/* Bank Details */}
                  <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1 font-mono text-[11px] text-slate-700 leading-relaxed shadow-2xs">
                    <div className="font-bold text-slate-900">COMPANY NAME - GLASS CARE ENTERPRISES</div>
                    <div>STATE BANK OF INDIA / IFSC CODE: <span className="font-bold text-slate-900">SBIN0002263</span></div>
                    <div>UPI ID | <span className="font-bold text-blue-700">9945988552@upi</span></div>
                    <div>ACCOUNT NO - <span className="font-bold text-slate-900">42443380892</span></div>
                    <div>BRANCH - MASQUE ROAD, RICHARDS TOWN BANGALORE 560005</div>
                  </div>

                  {/* Total In Words */}
                  <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg">
                    <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">Total In Words</span>
                    <p className="text-xs font-serif italic font-bold text-amber-950 mt-0.5">
                      &ldquo;{overallTotals.words}&rdquo;
                    </p>
                  </div>

                  {/* Terms & Conditions */}
                  <div className="p-3 bg-white rounded-lg border border-slate-200 text-[11px] space-y-1 text-slate-600 leading-normal">
                    <div className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">TERMS & CONDITIONS:</div>
                    <ol className="list-decimal list-inside space-y-0.5 pl-1">
                      <li>Order once confirmed cannot be cancelled.</li>
                      <li>Any complaint related to processing quality should be informed at time of unloading duly remarked on DC.</li>
                      <li>All disputes shall be subject to Bangalore jurisdiction only.</li>
                      <li>Initial payment 70% of gross price to be paid at the time of ordering.</li>
                      <li>Interim payment 20% of gross price on delivery pallet glass &amp; material of the goods to be used for the work.</li>
                      <li>Final payment 10% of gross price on completion of works.</li>
                    </ol>
                  </div>

                  {/* Signatures */}
                  <div className="pt-2 flex items-center justify-between text-xs text-slate-500">
                    <div>
                      <div className="w-48 border-b border-slate-300 mb-1"></div>
                      <span>Authorized Signature</span>
                    </div>
                    <div className="font-serif italic text-slate-600 font-semibold">
                      Thanks for your business.
                    </div>
                  </div>
                </div>

                {/* Right: Freight Input & Grand Totals Box */}
                <div className="col-span-12 lg:col-span-4">
                  <div className="bg-white rounded-xl border border-slate-300 p-4 shadow-xs space-y-3">
                    <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider pb-2 border-b border-slate-200">
                      Summary Calculation
                    </h3>

                    {/* Freight Charge Input */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-600">Freight Charge:</span>
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400 font-mono">₹</span>
                        <input
                          type="number"
                          value={freightCharge || ""}
                          onChange={(e) => setFreightCharge(parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                          className="w-24 text-right px-2 py-1 text-xs border border-slate-200 rounded font-mono font-medium focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                      <span className="text-slate-600 font-medium">Sub Total:</span>
                      <span className="font-mono font-bold text-slate-900">
                        {formatIndianCurrency(overallTotals.subTotal)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 font-medium">GST 18%:</span>
                      <span className="font-mono font-bold text-slate-900">
                        {formatIndianCurrency(overallTotals.gst)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-100">
                      <span>Exact Grand Total:</span>
                      <span className="font-mono">{formatIndianCurrency(overallTotals.grandTotal)}</span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Round Off:</span>
                      <span className="font-mono">{overallTotals.roundOff >= 0 ? `+${overallTotals.roundOff.toFixed(2)}` : overallTotals.roundOff.toFixed(2)}</span>
                    </div>

                    {/* Final Display Total */}
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 flex items-center justify-between">
                      <span className="text-xs font-black uppercase text-blue-900">Grand Total:</span>
                      <span className="font-mono text-lg font-black text-blue-950">
                        {formatIndianCurrency(overallTotals.displayTotal)}
                      </span>
                    </div>

                    {/* Action buttons inside summary */}
                    <div className="pt-2 flex flex-col gap-2">
                      <button
                        onClick={() => {
                          const targetGrp = groupedQuotes.find((g) => g.clientName === activeCustomer) || groupedQuotes[0];
                          if (targetGrp) handleCreateOfficialQuote(targetGrp);
                        }}
                        disabled={isGeneratingQuote}
                        className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5 disabled:opacity-50"
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
                        className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5"
                      >
                        <span>💬</span>
                        <span>Share on WhatsApp</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ============================================================== */
          /* AUTO-GROUPED QUOTES TAB (_Notelist @26)                        */
          /* ============================================================== */
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
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
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
                          className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-medium rounded-lg transition flex items-center gap-1 cursor-pointer"
                          title="Share summary via WhatsApp"
                        >
                          <span>💬</span>
                          <span>WhatsApp</span>
                        </button>
                        <button
                          onClick={() => {
                            setFilterCustomer(q.clientName);
                            setActiveTab("sheet");
                            showToast(`Editing measurements for ${q.clientName}`);
                          }}
                          className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold rounded-lg transition flex items-center gap-1 cursor-pointer"
                          title="Open and edit this client's rows in Master Sheet"
                        >
                          <span>✏️</span>
                          <span>Edit Sheet</span>
                        </button>
                        <button
                          onClick={() => handleDuplicateClient(q.clientName)}
                          className="px-2 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-medium rounded-lg transition flex items-center gap-1 cursor-pointer"
                          title="Duplicate these sizes for a new client"
                        >
                          <span>📋</span>
                          <span>Duplicate</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 text-xs italic text-slate-500 font-serif">
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

      {/* ============================================================== */}
      {/* 4. BOTTOM GOOGLE SHEETS TABS BAR (Exact matching layout)       */}
      {/* ============================================================== */}
      <footer className="bg-white border-t border-slate-300 px-3 py-1 flex items-center justify-between text-xs sticky bottom-0 z-30 shadow-xs">
        <div className="flex items-center gap-1 overflow-x-auto">
          {/* Add Sheet / Add Row */}
          <button
            onClick={handleAddRow}
            className="w-7 h-7 rounded hover:bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-sm cursor-pointer"
            title="Add row"
          >
            +
          </button>

          {/* Sheets List Icon */}
          <button
            className="w-7 h-7 rounded hover:bg-slate-100 text-slate-600 flex items-center justify-center text-sm cursor-pointer"
            title="All sheets"
          >
            ≡
          </button>

          <span className="text-slate-300">|</span>

          {/* Folder Tab */}
          <span className="px-2.5 py-1 text-slate-500 font-medium text-xs flex items-center gap-1 cursor-default">
            📁 GCE-Folders
          </span>

          {/* Primary Tab: _Notebook Size's @26L */}
          <button
            onClick={() => setActiveTab("sheet")}
            className={`px-3 py-1.5 font-bold text-xs flex items-center gap-1.5 border-b-2 transition ${
              activeTab === "sheet"
                ? "border-emerald-600 text-emerald-800 bg-emerald-50/50"
                : "border-transparent text-slate-600 hover:bg-slate-50"
            }`}
          >
            <span>_Notebook Size&apos;s @26L</span>
            <span className="text-[10px] text-slate-400">▼</span>
          </button>

          {/* Secondary Tab: _Notelist @26 (Quotes) */}
          <button
            onClick={() => setActiveTab("quotes")}
            className={`px-3 py-1.5 font-bold text-xs flex items-center gap-1.5 border-b-2 transition ${
              activeTab === "quotes"
                ? "border-emerald-600 text-emerald-800 bg-emerald-50/50"
                : "border-transparent text-slate-600 hover:bg-slate-50"
            }`}
          >
            <span>🔒 _Notelist @26</span>
            <span className="px-1.5 py-0.2 bg-blue-100 text-blue-800 text-[10px] rounded-full">
              {groupedQuotes.length}
            </span>
          </button>

          <span className="text-slate-300">|</span>

          {/* App Navigation Links */}
          <Link
            href="/quotes"
            className="px-2.5 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition font-medium"
          >
            Quotes Registry
          </Link>
          <Link
            href="/factory"
            className="px-2.5 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition font-medium"
          >
            Factory Sheet
          </Link>
          <Link
            href="/payments"
            className="px-2.5 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition font-medium"
          >
            Payments
          </Link>
          <Link
            href="/dashboard"
            className="px-2.5 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition font-medium"
          >
            Dashboard
          </Link>
          <Link
            href="/settings"
            className="px-2.5 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition font-medium"
          >
            Settings
          </Link>
        </div>

        {/* Counter displayed on bottom right */}
        <div className="flex items-center gap-3 text-slate-500 font-mono text-[11px] shrink-0 pl-4">
          <span>{filteredRows.length} of 1,510 rows displayed</span>
        </div>
      </footer>

      {/* Floating Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-12 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-bounce">
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
                  Import & Auto-Group Rows
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
                    <option value="NONE">-- Start with blank rows --</option>
                    {customerList.map((c) => (
                      <option key={c} value={c}>
                        Copy all measurements from {c}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-blue-700 mt-1">
                    Ideal when new flat has identical window or shutter dimensions!
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
