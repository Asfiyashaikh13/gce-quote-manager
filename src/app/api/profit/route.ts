import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const profitMonths = await prisma.profitMonth.findMany({
      where: { deletedAt: null },
      orderBy: { monthYear: "desc" },
    });

    // Also calculate live aggregate from Quotes & Expenses for comparison / sync
    const quotes = await prisma.quote.findMany({
      where: { deletedAt: null },
      select: { displayTotal: true, grandTotal: true, status: true, createdAt: true },
    });

    const expenses = await prisma.expense.findMany({
      where: { deletedAt: null },
      select: { amount: true, category: true, date: true },
    });

    const liveTotalSales = quotes.reduce((acc, q) => acc + q.displayTotal.toNumber(), 0);
    const livePurchases = expenses
      .filter((e) => e.category === "PURCHASE")
      .reduce((acc, e) => acc + e.amount.toNumber(), 0);
    const liveExpenses = expenses
      .filter((e) => e.category !== "PURCHASE")
      .reduce((acc, e) => acc + e.amount.toNumber(), 0);
    const liveProfit = Math.max(0, liveTotalSales - livePurchases - liveExpenses);
    const livePartner30 = Math.round(liveProfit * 0.3);
    const liveOwner70 = Math.round(liveProfit * 0.7);

    const serialized = profitMonths.map((p) => {
      const sales = p.salesAmount.toNumber();
      const purchases = p.purchaseAmount.toNumber();
      const expense = p.expenseAmount.toNumber();
      const profit = sales - purchases - expense;
      const partnerPercent = p.partnerPercent.toNumber() || 30;
      const partner = Math.round(profit * (partnerPercent / 100));
      const owner = profit - partner;

      return {
        id: p.id,
        monthYear: p.monthYear,
        salesAmount: sales,
        purchaseAmount: purchases,
        expenseAmount: expense,
        profitAmount: profit,
        partnerPercent,
        partnerAmount: partner,
        ownerAmount: owner,
        status: p.status || "RECEIVED",
        notes: p.notes || "",
        createdAt: p.createdAt.toISOString(),
      };
    });

    return NextResponse.json({
      success: true,
      months: serialized,
      liveSummary: {
        totalSales: liveTotalSales,
        totalPurchases: livePurchases,
        totalExpenses: liveExpenses,
        netProfit: liveProfit,
        partner30Percent: livePartner30,
        owner70Percent: liveOwner70,
        partnerRule: "Partner: VIEW ONLY | Owner: EDIT",
        formula: "Net Profit = Sale - Purchase - Expense",
      },
    });
  } catch (error) {
    console.error("Failed to fetch profit records:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch profit records" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, monthYear, salesAmount, purchaseAmount, expenseAmount, partnerPercent, status, notes } = body;

    if (!monthYear || typeof monthYear !== "string") {
      return NextResponse.json({ success: false, error: "Month (e.g. 10/2026 or Oct-2026) is required" }, { status: 400 });
    }

    const sales = Number(salesAmount) || 0;
    const purchases = Number(purchaseAmount) || 0;
    const expenses = Number(expenseAmount) || 0;
    const profit = sales - purchases - expenses;
    const pPercent = partnerPercent !== undefined && partnerPercent !== null ? Number(partnerPercent) : 30;
    const partner = Math.round(profit * (pPercent / 100));
    const owner = profit - partner;

    const data = {
      monthYear: monthYear.trim(),
      salesAmount: sales,
      purchaseAmount: purchases,
      expenseAmount: expenses,
      profitAmount: profit,
      partnerPercent: pPercent,
      partnerAmount: partner,
      ownerAmount: owner,
      status: status || "RECEIVED",
      notes: notes?.trim() || null,
    };

    let record;
    if (id) {
      record = await prisma.profitMonth.update({
        where: { id },
        data,
      });
    } else {
      record = await prisma.profitMonth.upsert({
        where: { monthYear: data.monthYear },
        update: data,
        create: data,
      });
    }

    return NextResponse.json({
      success: true,
      record: {
        ...record,
        salesAmount: record.salesAmount.toNumber(),
        purchaseAmount: record.purchaseAmount.toNumber(),
        expenseAmount: record.expenseAmount.toNumber(),
        profitAmount: record.profitAmount.toNumber(),
        partnerAmount: record.partnerAmount.toNumber(),
        ownerAmount: record.ownerAmount.toNumber(),
      },
    });
  } catch (error) {
    console.error("Failed to save profit record:", error);
    return NextResponse.json({ success: false, error: "Failed to save profit record" }, { status: 500 });
  }
}

