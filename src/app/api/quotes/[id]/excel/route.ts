import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateQuoteExcelBuffer } from "@/lib/excel/exportQuote";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const quote = await prisma.quote.findUnique({
      where: { id },
      include: { items: { orderBy: { itemOrder: "asc" } } },
    });

    if (!quote || quote.deletedAt !== null) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    const excelData = {
      quoteNumber: quote.quoteNumber,
      customerName: quote.customerName,
      date: new Date(quote.createdAt).toLocaleDateString(),
      subTotal: quote.subTotal.toNumber(),
      gstTotal: quote.gstTotal.toNumber(),
      grandTotal: quote.grandTotal.toNumber(),
      displayTotal: quote.displayTotal.toNumber(),
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
        runningFeet: it.runningFeet.toNumber(),
        netAmount: it.netAmount.toNumber(),
        gstAmount: it.gstAmount.toNumber(),
        totalAmount: it.totalAmount.toNumber(),
      })),
    };

    const buffer = generateQuoteExcelBuffer(excelData);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${quote.quoteNumber}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("Excel generation error:", error);
    return NextResponse.json({ error: "Failed to generate Excel file" }, { status: 500 });
  }
}

