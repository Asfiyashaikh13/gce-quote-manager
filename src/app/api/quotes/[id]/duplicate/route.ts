import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { canEditQuotes } from "@/lib/auth/types";
import { formatDateForQuoteNumber, formatQuoteNumber } from "@/lib/quotes/numbering";
import { QuoteStatus } from "@prisma/client";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (session && !canEditQuotes(session.role)) {
    return NextResponse.json({ error: "Forbidden: Read-only access" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const original = await prisma.quote.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!original || original.deletedAt !== null) {
      return NextResponse.json({ error: "Original quote not found" }, { status: 404 });
    }

    // Generate new stable quote number
    const todayPrefix = formatDateForQuoteNumber();
    const countToday = await prisma.quote.count({
      where: {
        quoteNumber: { startsWith: `QT-${todayPrefix}-` },
      },
    });

    const newQuoteNumber = formatQuoteNumber(todayPrefix, countToday + 1);

    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 57);

    const duplicated = await prisma.quote.create({
      data: {
        quoteNumber: newQuoteNumber,
        version: 1,
        status: QuoteStatus.DRAFT,
        customerId: original.customerId,
        customerName: `${original.customerName} (Copy)`,
        customerBuilding: original.customerBuilding,
        customerFlat: original.customerFlat,
        customerPhone: original.customerPhone,
        customerAddress: original.customerAddress,
        customerState: original.customerState,
        destinationState: original.destinationState,
        factoryId: original.factoryId,
        discountType: original.discountType,
        discountValue: original.discountValue,
        freight: original.freight,
        validUntil,
        subTotal: original.subTotal,
        cgstTotal: original.cgstTotal,
        sgstTotal: original.sgstTotal,
        igstTotal: original.igstTotal,
        gstTotal: original.gstTotal,
        grandTotal: original.grandTotal,
        roundOff: original.roundOff,
        displayTotal: original.displayTotal,
        displayTotalWords: original.displayTotalWords,
        createdById: session?.id || null,
        items: {
          create: original.items.map((it) => ({
            itemOrder: it.itemOrder,
            description: it.description,
            frameHeightMm: it.frameHeightMm,
            frameWidthMm: it.frameWidthMm,
            quantity: it.quantity,
            rate: it.rate,
            discountType: it.discountType,
            discountValue: it.discountValue,
            roundedHeightMm: it.roundedHeightMm,
            roundedWidthMm: it.roundedWidthMm,
            glassCutHeightMm: it.glassCutHeightMm,
            glassCutWidthMm: it.glassCutWidthMm,
            sqft: it.sqft,
            runningFeet: it.runningFeet,
            grossAmount: it.grossAmount,
            discountAmount: it.discountAmount,
            netAmount: it.netAmount,
            taxableAmount: it.taxableAmount,
            cgstRate: it.cgstRate,
            sgstRate: it.sgstRate,
            igstRate: it.igstRate,
            cgstAmount: it.cgstAmount,
            sgstAmount: it.sgstAmount,
            igstAmount: it.igstAmount,
            gstAmount: it.gstAmount,
            totalAmount: it.totalAmount,
            createdById: session?.id || null,
          })),
        },
      },
    });

    return NextResponse.json({ quote: duplicated });
  } catch (error) {
    console.error("Duplicate quote error:", error);
    return NextResponse.json({ error: "Failed to duplicate quote" }, { status: 500 });
  }
}

