import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { groupRowsForFactory } from "@/lib/factory/grouping";
import { MasterSheetRowData } from "@/lib/sheet/types";
import { renderToBuffer } from "@react-pdf/renderer";
import { FactoryPdfDocument } from "@/lib/pdf/FactoryPdfDocument";
import React from "react";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const targetFactory = searchParams.get("factory");

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

    const groups = groupRowsForFactory(rows);

    let selectedGroup = groups[0];
    if (targetFactory) {
      const match = groups.find(
        (g) => g.factoryName.toLowerCase() === targetFactory.toLowerCase()
      );
      if (match) selectedGroup = match;
    }

    if (!selectedGroup) {
      return NextResponse.json({ error: "No factory data found" }, { status: 404 });
    }

    const pdfElement = React.createElement(FactoryPdfDocument, {
      factory: selectedGroup,
      orderNumber: `FCO-${Date.now().toString().slice(-6)}`,
      orderDate: new Date().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buffer = await renderToBuffer(pdfElement as any);

    const safeName = selectedGroup.factoryName.replace(/[^a-zA-Z0-9_-]/g, "_");

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="FactoryCutOrder_${safeName}.pdf"`,
      },
    });
  } catch (error: unknown) {
    if ((error as { digest?: string })?.digest?.startsWith?.("NEXT_PRERENDER")) {
      throw error;
    }
    console.error("Factory PDF generation error:", error);
    return NextResponse.json({ error: "Failed to generate factory PDF" }, { status: 500 });
  }
}
