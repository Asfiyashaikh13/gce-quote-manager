"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface SevenTabsNavProps {
  currentTab?: "quotes" | "processing" | "payments" | "vendors" | "expenses" | "profit" | "inventory";
}

export function SevenTabsNav({ currentTab }: SevenTabsNavProps) {
  const pathname = usePathname();

  const tabs = [
    {
      id: "quotes",
      tabNumber: "TAB 1",
      name: "Quotation Tracker",
      sub: "Date • Client • Amount",
      href: "/quotes",
      color: "border-emerald-500 text-emerald-700",
      activeBg: "bg-emerald-50/70 border-emerald-600 text-emerald-800",
      badge: "Quotes",
      badgeColor: "bg-emerald-100 text-emerald-800",
    },
    {
      id: "processing",
      tabNumber: "TAB 2",
      name: "Processing",
      sub: "Factory WIP • Site Date",
      href: "/factory",
      color: "border-sky-500 text-sky-700",
      activeBg: "bg-sky-50/70 border-sky-600 text-sky-800",
      badge: "Factory WIP",
      badgeColor: "bg-sky-100 text-sky-800",
    },
    {
      id: "payments",
      tabNumber: "TAB 3",
      name: "Payment Tracker",
      sub: "Total • Advance • Balance",
      href: "/payments",
      color: "border-amber-500 text-amber-700",
      activeBg: "bg-amber-50/70 border-amber-600 text-amber-800",
      badge: "Milestones",
      badgeColor: "bg-amber-100 text-amber-800",
    },
    {
      id: "vendors",
      tabNumber: "TAB 4",
      name: "Vendor List",
      sub: "Payment Dena Hai • Rates",
      href: "/vendors",
      color: "border-purple-500 text-purple-700",
      activeBg: "bg-purple-50/70 border-purple-600 text-purple-800",
      badge: "Payables",
      badgeColor: "bg-purple-100 text-purple-800",
    },
    {
      id: "expenses",
      tabNumber: "TAB 5",
      name: "Purchase / Expense",
      sub: "Cash / UPI • GST Bill Hai?",
      href: "/expenses",
      color: "border-rose-500 text-rose-700",
      activeBg: "bg-rose-50/70 border-rose-600 text-rose-800",
      badge: "Expenses",
      badgeColor: "bg-rose-100 text-rose-800",
    },
    {
      id: "profit",
      tabNumber: "TAB 6",
      name: "Month Profit",
      sub: "Partner 30% | Tum 70%",
      href: "/profit",
      color: "border-teal-500 text-teal-700",
      activeBg: "bg-teal-50/70 border-teal-600 text-teal-800",
      badge: "Auto 30/70",
      badgeColor: "bg-teal-100 text-teal-800",
    },
    {
      id: "inventory",
      tabNumber: "TAB 7",
      name: "Inventory / Stock",
      sub: "Stock In • Use Hua • Baki Hai",
      href: "/inventory",
      color: "border-indigo-500 text-indigo-700",
      activeBg: "bg-indigo-50/70 border-indigo-600 text-indigo-800",
      badge: "Stock",
      badgeColor: "bg-indigo-100 text-indigo-800",
    },
  ];

  const determineActive = (id: string, href: string) => {
    if (currentTab) return currentTab === id;
    if (pathname === href) return true;
    if (id === "quotes" && (pathname === "/" || pathname?.startsWith("/quotes"))) return true;
    if (id === "processing" && pathname?.startsWith("/factory")) return true;
    if (id === "payments" && pathname?.startsWith("/payments")) return true;
    if (id === "vendors" && pathname?.startsWith("/vendors")) return true;
    if (id === "expenses" && pathname?.startsWith("/expenses")) return true;
    if (id === "profit" && pathname?.startsWith("/profit")) return true;
    if (id === "inventory" && pathname?.startsWith("/inventory")) return true;
    return false;
  };

  return (
    <div className="w-full bg-white border-b border-slate-200 shadow-xs">
      {/* Top Banner with Business Title & Red/Green status rule */}
      <div className="px-4 py-2 bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <span className="font-mono text-emerald-400 font-extrabold tracking-wider uppercase text-[11px] px-2 py-0.5 bg-emerald-950/80 rounded border border-emerald-600/50">
            ROYAL WORLD
          </span>
          <span className="font-semibold text-slate-200">
            Google Sheet Business Management System &bull; 7 Tabs A-One
          </span>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-medium">
          <span className="text-slate-300">Status Indicator:</span>
          <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-400/30 font-bold">
            Pending
          </span>
          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30 font-bold">
            Follow Up
          </span>
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-bold">
            Received
          </span>
          <span className="text-emerald-400 font-bold ml-1 hidden sm:inline">
            &mdash; Red &amp; Green se pata chalega Boss!
          </span>
        </div>
      </div>

      {/* 7 Tabs Horizontal Bar */}
      <div className="flex items-stretch overflow-x-auto scrollbar-thin divide-x divide-slate-200">
        {tabs.map((tab) => {
          const isActive = determineActive(tab.id, tab.href);
          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={`flex-1 min-w-[145px] px-3 py-2.5 flex flex-col justify-between transition group cursor-pointer ${
                isActive
                  ? `${tab.activeBg} border-b-2 font-bold shadow-inner`
                  : "bg-white hover:bg-slate-50 text-slate-700"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-[10px] font-mono font-extrabold px-1.5 py-0.2 rounded ${
                    isActive ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 group-hover:bg-slate-200"
                  }`}
                >
                  {tab.tabNumber}
                </span>
                <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${tab.badgeColor}`}>
                  {tab.badge}
                </span>
              </div>
              <div>
                <p className={`text-xs leading-snug font-bold ${isActive ? "text-slate-900" : "text-slate-800"}`}>
                  {tab.name}
                </p>
                <p className="text-[10px] text-slate-500 leading-tight truncate">{tab.sub}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
