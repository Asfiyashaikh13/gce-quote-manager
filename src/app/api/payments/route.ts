import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateReceiptNumber } from "@/lib/payments/milestones";
import { PaymentMode, QuoteStatus, Prisma } from "@prisma/client";
import Decimal from "decimal.js";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const quoteId = searchParams.get("quoteId");

    const where: Prisma.PaymentWhereInput = { deletedAt: null };
    if (quoteId) {
      where.quoteId = quoteId;
    }

    const payments = await prisma.payment.findMany({
      where,
      include: {
        quote: {
          select: {
            id: true,
            quoteNumber: true,
            customerName: true,
            customerPhone: true,
            customerBuilding: true,
            customerFlat: true,
            displayTotal: true,
            grandTotal: true,
            status: true,
          },
        },
      },
      orderBy: { paymentDate: "desc" },
    });

    const serialized = payments.map((p) => ({
      id: p.id,
      receiptNumber: p.receiptNumber,
      quoteId: p.quoteId,
      quoteNumber: p.quote.quoteNumber,
      customerName: p.quote.customerName,
      customerLocation: [p.quote.customerBuilding, p.quote.customerFlat ? `Flat ${p.quote.customerFlat}` : ""]
        .filter(Boolean)
        .join(" - "),
      milestone: p.milestone,
      amount: p.amount.toNumber(),
      mode: p.mode,
      reference: p.reference,
      paymentDate: p.paymentDate,
      notes: p.notes,
      quoteTotal: p.quote.displayTotal.toNumber(),
      quoteStatus: p.quote.status,
    }));

    const totalCollected = serialized.reduce((sum, p) => sum + p.amount, 0);

    return NextResponse.json({
      success: true,
      payments: serialized,
      totalCollected,
      count: serialized.length,
    });
  } catch (error: unknown) {
    if ((error as { digest?: string })?.digest?.startsWith?.("NEXT_PRERENDER")) {
      throw error;
    }
    console.error("Failed to fetch payments:", error);
    return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      quoteId,
      amount,
      milestone = "Advance payment (70% on ordering)",
      mode = "BANK",
      reference = "",
      paymentDate = new Date().toISOString(),
      notes = "",
    } = body;

    if (!quoteId || !amount || Number(amount) <= 0) {
      return NextResponse.json({ error: "Quote and valid amount are required" }, { status: 400 });
    }

    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
      include: { payments: { where: { deletedAt: null } } },
    });

    if (!quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    // Generate sequence number for today's receipts
    const today = new Date(paymentDate);
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const existingTodayCount = await prisma.payment.count({
      where: {
        createdAt: {
          gte: startOfDay,
          lt: endOfDay,
        },
      },
    });

    const receiptNumber = generateReceiptNumber(existingTodayCount + 1, today);

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        quoteId,
        receiptNumber,
        milestone,
        amount: new Decimal(amount),
        mode: (mode as PaymentMode) || PaymentMode.BANK,
        reference,
        paymentDate: new Date(paymentDate),
        notes,
      },
    });

    // Check if quote is now fully paid
    const previousPaid = quote.payments.reduce((acc, p) => acc.plus(p.amount), new Decimal(0));
    const newTotalPaid = previousPaid.plus(new Decimal(amount));

    if (newTotalPaid.greaterThanOrEqualTo(quote.displayTotal) && quote.status !== QuoteStatus.CANCELLED) {
      await prisma.quote.update({
        where: { id: quoteId },
        data: { status: QuoteStatus.PAID },
      });
    }

    // Create Audit Log
    try {
      await prisma.auditLog.create({
        data: {
          entityName: "Payment",
          entityId: payment.id,
          action: "PAYMENT_RECORDED",
          details: JSON.stringify({
            receiptNumber,
            quoteNumber: quote.quoteNumber,
            amount: Number(amount),
            mode,
            newTotalPaid: newTotalPaid.toNumber(),
          }),
        },
      });
    } catch (auditErr) {
      console.warn("Failed to write audit log:", auditErr);
    }

    return NextResponse.json({
      success: true,
      payment: {
        id: payment.id,
        receiptNumber: payment.receiptNumber,
        amount: payment.amount.toNumber(),
        milestone: payment.milestone,
        mode: payment.mode,
        reference: payment.reference,
        paymentDate: payment.paymentDate,
      },
    });
  } catch (error: unknown) {
    if ((error as { digest?: string })?.digest?.startsWith?.("NEXT_PRERENDER")) {
      throw error;
    }
    console.error("Failed to record payment:", error);
    return NextResponse.json({ error: "Failed to record payment" }, { status: 500 });
  }
}
