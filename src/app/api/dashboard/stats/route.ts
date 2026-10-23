import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import Decimal from "decimal.js";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "all";

    const now = new Date();
    let startDate: Date | null = null;

    if (period === "this_month") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === "last_30_days") {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (period === "this_quarter") {
      const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
      startDate = new Date(now.getFullYear(), quarterMonth, 1);
    } else if (period === "this_year") {
      startDate = new Date(now.getFullYear(), 0, 1);
    }

    const where: Prisma.QuoteWhereInput = { deletedAt: null };
    if (startDate) {
      where.createdAt = { gte: startDate };
    }

    // 1. Fetch quotes in scope
    const quotes = await prisma.quote.findMany({
      where,
      include: {
        items: true,
        payments: { where: { deletedAt: null } },
      },
      orderBy: { createdAt: "desc" },
    });

    const totalQuotes = quotes.length;
    const totalQuotedValue = quotes.reduce(
      (sum, q) => sum + q.displayTotal.toNumber(),
      0
    );

    const approvedQuotes = quotes.filter((q) =>
      ["APPROVED", "IN_PRODUCTION", "DELIVERED", "PAID"].includes(q.status)
    );
    const approvedCount = approvedQuotes.length;
    const approvedValue = approvedQuotes.reduce(
      (sum, q) => sum + q.displayTotal.toNumber(),
      0
    );

    const conversionRate =
      totalQuotes > 0 ? Number(((approvedCount / totalQuotes) * 100).toFixed(1)) : 0;

    // 2. Payments & outstanding
    let totalCollected = 0;
    let totalOutstanding = 0;
    let totalOverdue = 0;

    quotes.forEach((q) => {
      const qPaid = q.payments.reduce(
        (acc, p) => acc.plus(p.amount),
        new Decimal(0)
      ).toNumber();
      totalCollected += qPaid;

      const bal = Math.max(0, q.displayTotal.toNumber() - qPaid);
      totalOutstanding += bal;

      if (bal > 0 && ["APPROVED", "IN_PRODUCTION", "DELIVERED"].includes(q.status)) {
        totalOverdue += bal;
      }
    });

    // 3. Status Funnel
    const statusMap: Record<string, number> = {
      DRAFT: 0,
      SENT: 0,
      APPROVED: 0,
      IN_PRODUCTION: 0,
      DELIVERED: 0,
      PAID: 0,
      CANCELLED: 0,
    };
    quotes.forEach((q) => {
      if (statusMap[q.status] !== undefined) {
        statusMap[q.status]++;
      }
    });

    const statusFunnel = [
      { name: "Draft", count: statusMap.DRAFT, fill: "#94a3b8" },
      { name: "Sent", count: statusMap.SENT, fill: "#3b82f6" },
      { name: "Approved", count: statusMap.APPROVED, fill: "#10b981" },
      { name: "In Production", count: statusMap.IN_PRODUCTION, fill: "#f59e0b" },
      { name: "Delivered", count: statusMap.DELIVERED, fill: "#8b5cf6" },
      { name: "Paid", count: statusMap.PAID, fill: "#059669" },
      { name: "Cancelled", count: statusMap.CANCELLED, fill: "#ef4444" },
    ];

    // 4. Monthly Trend (last 6 months)
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthlyMap = new Map<string, { quoted: number; approved: number }>();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`;
      monthlyMap.set(key, { quoted: 0, approved: 0 });
    }

    quotes.forEach((q) => {
      const d = new Date(q.createdAt);
      const key = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`;
      if (monthlyMap.has(key)) {
        const entry = monthlyMap.get(key)!;
        entry.quoted += q.displayTotal.toNumber();
        if (["APPROVED", "IN_PRODUCTION", "DELIVERED", "PAID"].includes(q.status)) {
          entry.approved += q.displayTotal.toNumber();
        }
      }
    });

    const monthlyTrend = Array.from(monthlyMap.entries()).map(([month, data]) => ({
      month,
      quoted: Math.round(data.quoted),
      approved: Math.round(data.approved),
    }));

    // 5. Top 5 Customers
    const customerMap = new Map<string, { totalValue: number; quotesCount: number }>();
    quotes.forEach((q) => {
      const name = q.customerName || "Anonymous";
      if (!customerMap.has(name)) {
        customerMap.set(name, { totalValue: 0, quotesCount: 0 });
      }
      const c = customerMap.get(name)!;
      c.totalValue += q.displayTotal.toNumber();
      c.quotesCount += 1;
    });

    const topCustomers = Array.from(customerMap.entries())
      .map(([name, data]) => ({
        name,
        totalValue: Math.round(data.totalValue),
        quotesCount: data.quotesCount,
      }))
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 5);

    // 6. Top Products
    const productMap = new Map<string, { quantity: number; revenue: number }>();
    quotes.forEach((q) => {
      q.items.forEach((item) => {
        const desc = item.description || "Custom Glass";
        if (!productMap.has(desc)) {
          productMap.set(desc, { quantity: 0, revenue: 0 });
        }
        const p = productMap.get(desc)!;
        p.quantity += item.quantity;
        p.revenue += item.netAmount.toNumber();
      });
    });

    const topProducts = Array.from(productMap.entries())
      .map(([name, data]) => ({
        name,
        quantity: data.quantity,
        revenue: Math.round(data.revenue),
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return NextResponse.json({
      success: true,
      kpis: {
        totalQuotes,
        totalQuotedValue: Math.round(totalQuotedValue),
        approvedCount,
        approvedValue: Math.round(approvedValue),
        conversionRate,
        totalCollected: Math.round(totalCollected),
        totalOutstanding: Math.round(totalOutstanding),
        totalOverdue: Math.round(totalOverdue),
      },
      statusFunnel,
      monthlyTrend,
      topCustomers,
      topProducts,
    });
  } catch (error: unknown) {
    if ((error as { digest?: string })?.digest?.startsWith?.("NEXT_PRERENDER")) {
      throw error;
    }
    console.error("Dashboard stats error:", error);
    return NextResponse.json({ error: "Failed to load dashboard stats" }, { status: 500 });
  }
}
