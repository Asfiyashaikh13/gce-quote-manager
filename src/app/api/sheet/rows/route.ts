import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { calculateQuoteItem } from "@/lib/calc";

export async function GET() {
  try {
    const rows = await prisma.masterRow.findMany({
      where: { deletedAt: null },
      orderBy: { rowOrder: "asc" },
    });

    const formatted = rows.map((r) => ({
      id: r.id,
      rowOrder: r.rowOrder,
      clientName: r.clientName,
      flat: r.flat || "",
      building: r.building || "",
      category: r.category || "",
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

    return NextResponse.json({ rows: formatted });
  } catch (error) {
    console.error("GET /api/sheet/rows error:", error);
    return NextResponse.json({ error: "Failed to fetch master sheet rows" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rawRows = body.rows;

    if (!Array.isArray(rawRows)) {
      return NextResponse.json({ error: "Expected rows array" }, { status: 400 });
    }

    // Process and recalculate all rows with calc engine to ensure DB integrity
    const processedRows = rawRows.map((r, index) => {
      const calc = calculateQuoteItem(
        {
          frameHeight: r.frameHeightMm || 0,
          frameWidth: r.frameWidthMm || 0,
          quantity: r.quantity || 1,
          rate: r.rate || 0,
          discount: r.discountType !== "NONE" ? { type: r.discountType, value: r.discountValue } : undefined,
          description: r.description,
        },
        r.state || "Karnataka"
      );

      return {
        id: r.id && !r.id.startsWith("new-") ? r.id : undefined,
        rowOrder: index + 1,
        clientName: r.clientName || "",
        flat: r.flat || "",
        building: r.building || "",
        category: r.category || "",
        state: r.state || "Karnataka",
        factory: r.factory || "Veera Glass",
        status: r.status || "Draft",
        notes: r.notes || "",
        productId: r.productId || null,
        description: r.description || "Custom Item",
        frameHeightMm: calc.frameHeight.toNumber(),
        frameWidthMm: calc.frameWidth.toNumber(),
        quantity: calc.quantity,
        rate: calc.rate.toNumber(),
        discountType: calc.discountType,
        discountValue: calc.discountValue.toNumber(),
        roundedHeightMm: calc.roundedHeight.toNumber(),
        roundedWidthMm: calc.roundedWidth.toNumber(),
        glassCutHeightMm: calc.glassCutHeight.toNumber(),
        glassCutWidthMm: calc.glassCutWidth.toNumber(),
        sqft: calc.sqft.toNumber(),
        runningFeet: calc.runningFeet.toNumber(),
        netAmount: calc.netAmount.toNumber(),
        gstAmount: calc.gstAmount.toNumber(),
        totalAmount: calc.totalAmount.toNumber(),
      };
    });

    // Save in SQLite transaction: delete and replace with current order
    await prisma.$transaction(async (tx) => {
      await tx.masterRow.deleteMany({});
      for (const row of processedRows) {
        await tx.masterRow.create({
          data: row,
        });
      }
    });

    return NextResponse.json({ success: true, count: processedRows.length });
  } catch (error) {
    console.error("POST /api/sheet/rows error:", error);
    return NextResponse.json({ error: "Failed to autosave master sheet rows" }, { status: 500 });
  }
}

