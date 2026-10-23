import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { renderToBuffer } from "@react-pdf/renderer";
import { ReceiptPdfDocument } from "@/lib/pdf/ReceiptPdfDocument";
import Decimal from "decimal.js";
import React from "react";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        quote: {
          include: {
            payments: { where: { deletedAt: null } },
          },
        },
      },
    });

    if (!payment || payment.deletedAt !== null) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    const quote = payment.quote;
    const totalQuoteAmount = quote.displayTotal.toNumber();
    const totalPaidSoFar = quote.payments.reduce(
      (acc, p) => acc.plus(p.amount),
      new Decimal(0)
    ).toNumber();

    const outstandingBalance = Math.max(0, totalQuoteAmount - totalPaidSoFar);

    const receiptDate = new Date(payment.paymentDate).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    const receiptData = {
      receiptNumber: payment.receiptNumber,
      receiptDate,
      customerName: quote.customerName,
      customerPhone: quote.customerPhone || undefined,
      customerAddress: [
        quote.customerBuilding,
        quote.customerFlat ? `Flat ${quote.customerFlat}` : "",
        quote.customerAddress,
      ]
        .filter(Boolean)
        .join(", "),
      quoteNumber: quote.quoteNumber,
      milestone: payment.milestone,
      paymentMode: payment.mode,
      reference: payment.reference || undefined,
      amount: payment.amount.toNumber(),
      totalQuoteAmount,
      outstandingBalance,
      notes: payment.notes || undefined,
    };

    const pdfElement = React.createElement(ReceiptPdfDocument, {
      receipt: receiptData,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buffer = await renderToBuffer(pdfElement as any);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${payment.receiptNumber}.pdf"`,
      },
    });
  } catch (error: unknown) {
    if ((error as { digest?: string })?.digest?.startsWith?.("NEXT_PRERENDER")) {
      throw error;
    }
    console.error("Receipt PDF generation error:", error);
    return NextResponse.json({ error: "Failed to generate receipt PDF" }, { status: 500 });
  }
}
