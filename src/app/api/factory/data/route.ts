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

    const rows: MasterSheetRowData[] = dbRows.map((r) => ({
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
