import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { canEditQuotes } from "@/lib/auth/types";
import { formatDateForQuoteNumber, formatQuoteNumber } from "@/lib/quotes/numbering";
import { calculateQuote } from "@/lib/calc";
import { QuoteStatus, DiscountType } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const where: Record<string, unknown> = {
      deletedAt: null,
    };

    if (status && status !== "ALL") {
      where.status = status as QuoteStatus;
    }

    if (search) {
      where.OR = [
        { quoteNumber: { contains: search } },
        { customerName: { contains: search } },
        { customerBuilding: { contains: search } },
        { customerFlat: { contains: search } },
      ];
    }

    const quotes = await prisma.quote.findMany({
      where,
      include: {
        items: true,
        _count: { select: { items: true, revisions: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = quotes.map((q) => ({
      id: q.id,
      quoteNumber: q.quoteNumber,
      version: q.version,
      status: q.status,
      customerName: q.customerName,
      customerBuilding: q.customerBuilding || "",
      customerFlat: q.customerFlat || "",
      customerState: q.customerState,
      destinationState: q.destinationState,
      itemCount: q._count.items,
      revisionCount: q._count.revisions,
      subTotal: q.subTotal.toNumber(),
      gstTotal: q.gstTotal.toNumber(),
      grandTotal: q.grandTotal.toNumber(),
      displayTotal: q.displayTotal.toNumber(),
      displayTotalWords: q.displayTotalWords,
      createdAt: q.createdAt.toISOString(),
      validUntil: q.validUntil ? q.validUntil.toISOString() : null,
    }));

    return NextResponse.json({ success: true, quotes: formatted });
  } catch (error) {
    console.error("GET /api/quotes error:", error);
    return NextResponse.json({ error: "Failed to fetch quotes" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (session && !canEditQuotes(session.role)) {
    return NextResponse.json({ error: "Forbidden: Read-only access" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const {
      customerName,
      customerBuilding,
      customerFlat,
      customerPhone,
      customerAddress,
      destinationState,
      factoryId,
      items,
      freight = 0,
      discountType = "NONE",
      discountValue = 0,
    } = body;

    if (!customerName || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Customer name and line items are required" }, { status: 400 });
    }

    // Generate unique stable quote number QT-DDMMYY-NN
    const todayPrefix = formatDateForQuoteNumber();
    const countToday = await prisma.quote.count({
      where: {
        quoteNumber: { startsWith: `QT-${todayPrefix}-` },
      },
    });

    const quoteNumber = formatQuoteNumber(todayPrefix, countToday + 1);

    // Calculate totals using engine
    const state = destinationState || "Karnataka";
    const calculation = calculateQuote({
      items: items.map((it: { frameHeightMm: number; frameWidthMm: number; quantity: number; rate: number; description?: string }) => ({
        frameHeight: it.frameHeightMm,
        frameWidth: it.frameWidthMm,
        quantity: it.quantity,
        rate: it.rate,
        description: it.description,
      })),
      freight,
      discount: discountType !== "NONE" ? { type: discountType, value: discountValue } : undefined,
      state,
    });

    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 57);

    const quote = await prisma.quote.create({
      data: {
        quoteNumber,
        version: 1,
        status: QuoteStatus.DRAFT,
        customerName,
        customerBuilding: customerBuilding || "",
        customerFlat: customerFlat || "",
        customerPhone: customerPhone || "",
        customerAddress: customerAddress || "",
        customerState: state,
        destinationState: state,
        factoryId: factoryId || null,
        discountType: discountType as DiscountType,
        discountValue,
        freight,
        validUntil,
        subTotal: calculation.totals.subTotal.toNumber(),
        cgstTotal: calculation.totals.cgstTotal.toNumber(),
        sgstTotal: calculation.totals.sgstTotal.toNumber(),
        igstTotal: calculation.totals.igstTotal.toNumber(),
        gstTotal: calculation.totals.gstTotal.toNumber(),
        grandTotal: calculation.totals.grandTotal.toNumber(),
        roundOff: calculation.totals.roundOff.toNumber(),
        displayTotal: calculation.totals.displayTotal.toNumber(),
        displayTotalWords: calculation.displayTotalWords,
        createdById: session?.id || null,
        items: {
          create: calculation.items.map((it, idx) => ({
            itemOrder: idx + 1,
            description: it.description || "Custom Item",
            frameHeightMm: it.frameHeight.toNumber(),
            frameWidthMm: it.frameWidth.toNumber(),
            quantity: it.quantity,
            rate: it.rate.toNumber(),
            discountType: DiscountType.NONE,
            discountValue: 0,
            roundedHeightMm: it.roundedHeight.toNumber(),
            roundedWidthMm: it.roundedWidth.toNumber(),
            glassCutHeightMm: it.glassCutHeight.toNumber(),
            glassCutWidthMm: it.glassCutWidth.toNumber(),
            sqft: it.sqft.toNumber(),
            runningFeet: it.runningFeet.toNumber(),
            grossAmount: it.grossAmount.toNumber(),
            discountAmount: it.discountAmount.toNumber(),
            netAmount: it.netAmount.toNumber(),
            taxableAmount: it.taxableAmount.toNumber(),
            cgstRate: it.cgstRate.toNumber(),
            sgstRate: it.sgstRate.toNumber(),
            igstRate: it.igstRate.toNumber(),
            cgstAmount: it.cgstAmount.toNumber(),
            sgstAmount: it.sgstAmount.toNumber(),
            igstAmount: it.igstAmount.toNumber(),
            gstAmount: it.gstAmount.toNumber(),
            totalAmount: it.totalAmount.toNumber(),
            createdById: session?.id || null,
          })),
        },
      },
      include: {
        items: true,
      },
    });

    return NextResponse.json({ quote });
  } catch (error) {
    console.error("POST /api/quotes error:", error);
    return NextResponse.json({ error: "Failed to create quote" }, { status: 500 });
  }
}

