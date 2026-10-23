import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { renderToBuffer } from "@react-pdf/renderer";
import { QuotePdfDocument } from "@/lib/pdf/QuotePdfDocument";
import React from "react";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const hideCuttingSizes = searchParams.get("hideCuttingSizes") === "true";

    const quote = await prisma.quote.findUnique({
      where: { id },
      include: { items: { orderBy: { itemOrder: "asc" } } },
    });

    if (!quote || quote.deletedAt !== null) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    // Load settings from DB
    const settingsRecords = await prisma.setting.findMany();
    const settingsMap: Record<string, string> = {};
    settingsRecords.forEach((s) => {
      settingsMap[s.key] = s.value;
    });

    const pdfData = {
      quoteNumber: quote.quoteNumber,
      version: quote.version,
      createdAt: quote.createdAt,
      validUntil: quote.validUntil,
      customerName: quote.customerName,
      customerBuilding: quote.customerBuilding,
      customerFlat: quote.customerFlat,
      customerAddress: quote.customerAddress,
      customerState: quote.customerState,
      destinationState: quote.destinationState,
      subTotal: quote.subTotal.toNumber(),
      cgstTotal: quote.cgstTotal.toNumber(),
      sgstTotal: quote.sgstTotal.toNumber(),
      igstTotal: quote.igstTotal.toNumber(),
      gstTotal: quote.gstTotal.toNumber(),
      grandTotal: quote.grandTotal.toNumber(),
      roundOff: quote.roundOff.toNumber(),
      displayTotal: quote.displayTotal.toNumber(),
      displayTotalWords: quote.displayTotalWords,
      items: quote.items.map((it) => ({
        itemOrder: it.itemOrder,
        description: it.description || "Custom Item",
        frameHeightMm: it.frameHeightMm.toNumber(),
        frameWidthMm: it.frameWidthMm.toNumber(),
        roundedHeightMm: it.roundedHeightMm.toNumber(),
        roundedWidthMm: it.roundedWidthMm.toNumber(),
        glassCutHeightMm: it.glassCutHeightMm.toNumber(),
        glassCutWidthMm: it.glassCutWidthMm.toNumber(),
        quantity: it.quantity,
        rate: it.rate.toNumber(),
        sqft: it.sqft.toNumber(),
        gstAmount: it.gstAmount.toNumber(),
        netAmount: it.netAmount.toNumber(),
        totalAmount: it.totalAmount.toNumber(),
      })),
    };

    const pdfElement = React.createElement(QuotePdfDocument, {
      quote: pdfData,
      settings: settingsMap,
      hideCuttingSizes,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buffer = await renderToBuffer(pdfElement as any);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${quote.quoteNumber}-v${quote.version}.pdf"`,
      },
    });
  } catch (error: any) {
    if (error?.digest?.startsWith?.("NEXT_PRERENDER")) {
      throw error;
    }
    console.error("PDF generation error:", error);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}
