import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { groupRowsForFactory } from "@/lib/factory/grouping";
import { MasterSheetRowData } from "@/lib/sheet/types";

export async function GET() {
  try {
    const dbRows = await prisma.masterRow.findMany({
      where: { deletedAt: null },
      orderBy: { rowOrder: "asc" },
    });

    const dbQuoteItems = await prisma.quoteItem.findMany({
      where: {
        quote: {
          deletedAt: null,
          status: { in: ["APPROVED", "IN_PRODUCTION", "SENT", "DRAFT", "DELIVERED", "PAID"] },
        },
      },
      include: {
        quote: {
          include: { factory: true },
        },
      },
      orderBy: { itemOrder: "asc" },
    });

    const masterRowsMapped: MasterSheetRowData[] = dbRows.map((r) => ({
      id: r.id,
      rowOrder: r.rowOrder,
      clientName: r.clientName,
      flat: r.flat || "",
      building: r.building || "",
      state: r.state || "Karnataka",
      factory: r.factory || "Veera Glass",
      status: r.status || "Draft",
      notes: r.notes || "",
      productId: r.productId || "",
      description: r.description,
      frameHeightMm: r.frameHeightMm.toNumber(),
      frameWidthMm: r.frameWidthMm.toNumber(),
      quantity: r.quantity,
      rate: r.rate.toNumber(),
      discountType: (r.discountType as "PERCENT" | "FLAT" | "NONE") || "NONE",
      discountValue: r.discountValue.toNumber(),
      roundedHeightMm: r.roundedHeightMm.toNumber(),
      roundedWidthMm: r.roundedWidthMm.toNumber(),
      glassCutHeightMm: r.glassCutHeightMm.toNumber(),
      glassCutWidthMm: r.glassCutWidthMm.toNumber(),
      sqft: r.sqft.toNumber(),
      runningFeet: r.runningFeet.toNumber(),
      netAmount: r.netAmount.toNumber(),
      gstAmount: r.gstAmount.toNumber(),
      totalAmount: r.totalAmount.toNumber(),
    }));

    const quoteItemsMapped: MasterSheetRowData[] = dbQuoteItems.map((qi, idx) => ({
      id: `qi-${qi.id}`,
      rowOrder: masterRowsMapped.length + idx + 1,
      clientName: qi.quote.customerName,
      flat: qi.quote.customerFlat || "",
      building: qi.quote.customerBuilding || "",
      state: qi.quote.destinationState || "Karnataka",
      factory: qi.quote.factory?.name || "Veera Glass",
      status: qi.quote.status === "APPROVED" || qi.quote.status === "IN_PRODUCTION" ? "In Production" : "Draft",
      notes: `Quote: ${qi.quote.quoteNumber}`,
      productId: qi.productId || "",
      description: qi.description || "Glass Cutting",
      frameHeightMm: qi.frameHeightMm.toNumber(),
      frameWidthMm: qi.frameWidthMm.toNumber(),
      quantity: qi.quantity,
      rate: qi.rate.toNumber(),
      discountType: (qi.discountType as "PERCENT" | "FLAT" | "NONE") || "NONE",
      discountValue: qi.discountValue.toNumber(),
      roundedHeightMm: qi.roundedHeightMm.toNumber(),
      roundedWidthMm: qi.roundedWidthMm.toNumber(),
      glassCutHeightMm: qi.glassCutHeightMm.toNumber(),
      glassCutWidthMm: qi.glassCutWidthMm.toNumber(),
      sqft: qi.sqft.toNumber(),
      runningFeet: qi.runningFeet.toNumber(),
      netAmount: qi.netAmount.toNumber(),
      gstAmount: (qi.cgstRate.toNumber() + qi.sgstRate.toNumber()) > 0 ? (qi.netAmount.toNumber() * 0.18) : 0,
      totalAmount: qi.netAmount.toNumber() * 1.18,
    }));

    const rows: MasterSheetRowData[] = [...masterRowsMapped, ...quoteItemsMapped];

    const factoryGroups = groupRowsForFactory(rows);

    return NextResponse.json({
      success: true,
      factoryGroups,
      totalRows: rows.length,
    });
  } catch (error) {
    console.error("Failed to load factory data:", error);
    return NextResponse.json({ error: "Failed to load factory data" }, { status: 500 });
  }
}

