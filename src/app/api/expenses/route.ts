import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const expenses = await prisma.expense.findMany({
      where: { deletedAt: null },
      orderBy: { date: "desc" },
      include: {
        vendor: {
          select: { id: true, name: true, mobile: true },
        },
      },
    });

    const serialized = expenses.map((e) => ({
      id: e.id,
      date: e.date.toISOString().split("T")[0],
      item: e.item,
      amount: e.amount.toNumber(),
      vendorId: e.vendorId || null,
      vendorName: e.vendorName || e.vendor?.name || "Direct Purchase",
      vendorMobile: e.vendor?.mobile || "",
      paymentMode: e.paymentMode || "UPI",
      hasBill: e.hasBill,
      category: e.category || "PURCHASE",
      status: e.status || "RECEIVED",
      notes: e.notes || "",
      createdAt: e.createdAt.toISOString(),
    }));

    const totalAmount = serialized.reduce((sum, e) => sum + e.amount, 0);
    const purchaseAmount = serialized.filter((e) => e.category === "PURCHASE").reduce((sum, e) => sum + e.amount, 0);
    const siteExpenseAmount = serialized.filter((e) => e.category !== "PURCHASE").reduce((sum, e) => sum + e.amount, 0);
    const cashTotal = serialized.filter((e) => e.paymentMode === "CASH").reduce((sum, e) => sum + e.amount, 0);
    const upiTotal = serialized.filter((e) => e.paymentMode === "UPI").reduce((sum, e) => sum + e.amount, 0);
    const billedCount = serialized.filter((e) => e.hasBill).length;

    return NextResponse.json({
      success: true,
      expenses: serialized,
      summary: {
        totalRecords: serialized.length,
        totalAmount,
        purchaseAmount,
        siteExpenseAmount,
        cashTotal,
        upiTotal,
        billedCount,
        unbilledCount: serialized.length - billedCount,
      },
    });
  } catch (error) {
    console.error("Failed to fetch expenses:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch expenses" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, date, item, amount, vendorId, vendorName, paymentMode, hasBill, category, status, notes } = body;

    if (!item || typeof item !== "string" || !item.trim()) {
      return NextResponse.json({ success: false, error: "Item description is required" }, { status: 400 });
    }

    const parsedAmount = Number(amount) || 0;
    const parsedDate = date ? new Date(date) : new Date();

    const data = {
      item: item.trim(),
      amount: parsedAmount,
      date: isNaN(parsedDate.getTime()) ? new Date() : parsedDate,
      vendorId: vendorId || null,
      vendorName: vendorName?.trim() || null,
      paymentMode: paymentMode || "UPI",
      hasBill: Boolean(hasBill),
      category: category || "PURCHASE",
      status: status || "RECEIVED",
      notes: notes?.trim() || null,
    };

    let expense;
    if (id) {
      expense = await prisma.expense.update({
        where: { id },
        data,
      });
    } else {
      expense = await prisma.expense.create({
        data,
      });
    }

    return NextResponse.json({
      success: true,
      expense: {
        ...expense,
        amount: expense.amount.toNumber(),
      },
    });
  } catch (error) {
    console.error("Failed to save expense:", error);
    return NextResponse.json({ success: false, error: "Failed to save expense" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, error: "Expense ID required" }, { status: 400 });
    }

    await prisma.expense.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ success: true, message: "Expense deleted successfully" });
  } catch (error) {
    console.error("Failed to delete expense:", error);
    return NextResponse.json({ success: false, error: "Failed to delete expense" }, { status: 500 });
  }
}

