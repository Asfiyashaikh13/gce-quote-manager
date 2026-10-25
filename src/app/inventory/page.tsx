"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { SevenTabsNav } from "@/components/SevenTabsNav";

interface InventoryItem {
  id: string;
  itemName: string;
  category: string;
  stockIn: number;
  stockUsed: number;
  stockBalance: number;
  unit: string;
  status: string;
  notes: string;
  updatedAt: string;
}

interface Summary {
  totalItemTypes: number;
  totalStockIn: number;
  totalStockUsed: number;
  totalStockBalance: number;
  lowStockCount: number;
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("GLASS");
  const [formStockIn, setFormStockIn] = useState("0");
  const [formStockUsed, setFormStockUsed] = useState("0");
  const [formUnit, setFormUnit] = useState("SQFT");
  const [formNotes, setFormNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const fetchInventory = async () => {
    try {
      const res = await fetch("/api/inventory");
      const data = await res.json();
      if (data.success) {
        setItems(data.items);
        setSummary(data.summary);
      }
    } catch (err) {
      console.error("Failed to load inventory:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch("/api/inventory");
        const data = await res.json();
        if (ignore) return;
        if (data.success) {
          setItems(data.items);
          setSummary(data.summary);
        }
      } catch (err) {
        console.error("Failed to load inventory:", err);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, []);

  const openAddModal = () => {
    setEditingId(null);
    setFormName("");
    setFormCategory("GLASS");
    setFormStockIn("0");
    setFormStockUsed("0");
    setFormUnit("SQFT");
    setFormNotes("");
    setModalOpen(true);
  };

  const openEditModal = (i: InventoryItem) => {
    setEditingId(i.id);
    setFormName(i.itemName);
    setFormCategory(i.category);
    setFormStockIn(i.stockIn.toString());
    setFormStockUsed(i.stockUsed.toString());
    setFormUnit(i.unit);
    setFormNotes(i.notes);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    try {
      setIsSaving(true);
      const payload = {
        id: editingId,
        itemName: formName.trim(),
        category: formCategory,
        stockIn: parseFloat(formStockIn) || 0,
        stockUsed: parseFloat(formStockUsed) || 0,
        unit: formUnit,
        notes: formNotes.trim(),
      };

      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setModalOpen(false);
        fetchInventory();
      }
    } catch (err) {
      console.error("Error saving inventory item:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const filtered = items.filter((i) => {
    const matchesSearch =
      i.itemName.toLowerCase().includes(search.toLowerCase()) ||
      i.category.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      categoryFilter === "ALL" || i.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const computedModalBalance =
    (parseFloat(formStockIn) || 0) - (parseFloat(formStockUsed) || 0);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      <SevenTabsNav currentTab="inventory" />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 text-xs font-bold rounded">
                TAB 7
              </span>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Inventory &bull; Stock Tracker
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Stock In &minus; Use Hua = Baki Hai (Available Balance) &bull; Architectural glass sheets and aluminium inventory
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="px-3 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition"
            >
              ← Back to Master Sheet
            </Link>
            <button
              onClick={openAddModal}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>+ Add Stock Item</span>
            </button>
          </div>
        </div>

        {/* 4 Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Total Material Types
              </p>
              <p className="text-2xl font-black text-slate-900 mt-1">
                {summary?.totalItemTypes || 0}
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg">
              📦
            </div>
          </div>

          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Total Stock In
              </p>
              <p className="text-2xl font-black text-sky-800 mt-1 font-mono">
                {summary?.totalStockIn.toLocaleString() || "0"}
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center font-bold text-lg">
              📥
            </div>
          </div>

          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Total Use Hua (Consumed)
              </p>
              <p className="text-2xl font-black text-amber-700 mt-1 font-mono">
                {summary?.totalStockUsed.toLocaleString() || "0"}
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-lg">
              ✂️
            </div>
          </div>

          <div className="p-4 bg-emerald-50/70 border border-emerald-300 rounded-xl shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                Baki Hai (Floor Balance)
              </p>
              <p className="text-2xl font-black text-emerald-900 mt-1 font-mono">
                {summary?.totalStockBalance.toLocaleString() || "0"}
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-lg">
              🏢
            </div>
          </div>
        </div>

        {/* Filter bar */}
        <div className="p-3 bg-white rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <span className="text-slate-400">🔍</span>
            <input
              type="text"
              placeholder="Search item name or glass specification..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent border-none focus:outline-none text-slate-800 placeholder-slate-400 font-medium"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-semibold">Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-slate-50 font-semibold text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Categories</option>
              <option value="GLASS">Architectural Glass</option>
              <option value="AL_PROFILE">Aluminium Profiles</option>
              <option value="HARDWARE">Hardware &amp; Sealant</option>
            </select>
          </div>
        </div>

        {/* Inventory Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Item Name / Specification</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-right">Stock In</th>
                  <th className="py-3 px-4 text-right">Use Hua</th>
                  <th className="py-3 px-4 text-right text-emerald-800 bg-emerald-50/50">
                    Baki Hai (Balance)
                  </th>
                  <th className="py-3 px-4 text-center">Unit</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4">Notes</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="text-center py-10 text-slate-400 font-medium">
                      Loading inventory...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-10 text-slate-400">
                      No stock items found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-bold text-slate-900 text-sm">
                        {item.itemName}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-600">
                        {item.category}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-sky-800">
                        {item.stockIn.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-amber-700">
                        {item.stockUsed.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-emerald-900 bg-emerald-50/40 text-sm">
                        {item.stockBalance.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-slate-500">
                        {item.unit}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {item.status === "OUT_OF_STOCK" && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-300">
                            Out of Stock
                          </span>
                        )}
                        {item.status === "LOW_STOCK" && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            Low Stock (Reorder)
                          </span>
                        )}
                        {item.status === "IN_STOCK" && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-300">
                            In Stock
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px] max-w-xs truncate">
                        {item.notes || "—"}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => openEditModal(item)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded text-xs transition cursor-pointer"
                        >
                          Update
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

      {/* Add / Edit Inventory Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-black text-slate-900 text-lg">
                {editingId ? "Update Stock Balance" : "Add Inventory Item"}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Item Name / Specification *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. 8mm Plain Glass, 12mm Toughened, Profile 565"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white font-semibold focus:outline-none"
                  >
                    <option value="GLASS">Architectural Glass</option>
                    <option value="AL_PROFILE">Aluminium Profile</option>
                    <option value="HARDWARE">Hardware / Fittings</option>
                    <option value="SEALANT">Silicone Sealant</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Unit</label>
                  <select
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white font-semibold focus:outline-none"
                  >
                    <option value="SQFT">SQFT (Square Feet)</option>
                    <option value="RFT">RFT (Running Feet)</option>
                    <option value="NOS">NOS (Numbers / Pieces)</option>
                    <option value="TUBES">TUBES (Sealant)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-sky-800 mb-1">Stock In (Total)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formStockIn}
                    onChange={(e) => setFormStockIn(e.target.value)}
                    className="w-full px-3 py-2 border border-sky-300 rounded-lg text-xs font-mono font-bold text-sky-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-amber-800 mb-1">Use Hua (Used)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formStockUsed}
                    onChange={(e) => setFormStockUsed(e.target.value)}
                    className="w-full px-3 py-2 border border-amber-300 rounded-lg text-xs font-mono font-bold text-amber-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
                <span className="font-bold text-emerald-900 text-xs">
                  Baki Hai (Auto Balance):
                </span>
                <span className="font-mono font-black text-emerald-950 text-base">
                  {computedModalBalance.toLocaleString()} {formUnit}
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="e.g. Standard 2440x1830 stock sheets from Veera Glass"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-xs transition cursor-pointer"
                >
                  {isSaving ? "Saving..." : editingId ? "Save Changes" : "Create Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
