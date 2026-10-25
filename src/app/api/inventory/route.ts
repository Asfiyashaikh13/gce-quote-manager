import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const items = await prisma.inventoryStock.findMany({
      where: { deletedAt: null },
      orderBy: { itemName: "asc" },
    });

    const serialized = items.map((i) => {
      const stockIn = i.stockIn.toNumber();
      const stockUsed = i.stockUsed.toNumber();
      const stockBalance = stockIn - stockUsed;

      return {
        id: i.id,
        itemName: i.itemName,
        category: i.category || "GLASS",
        stockIn,
        stockUsed,
        stockBalance,
        unit: i.unit || "SQFT",
        status:
          stockBalance <= 0
            ? "OUT_OF_STOCK"
            : stockBalance < 100
            ? "LOW_STOCK"
            : "IN_STOCK",
        notes: i.notes || "",
        updatedAt: i.updatedAt.toISOString(),
      };
    });

    const totalStockIn = serialized.reduce((sum, i) => sum + i.stockIn, 0);
    const totalStockUsed = serialized.reduce((sum, i) => sum + i.stockUsed, 0);
    const totalStockBalance = serialized.reduce((sum, i) => sum + i.stockBalance, 0);

    return NextResponse.json({
      success: true,
      items: serialized,
      summary: {
        totalItemTypes: serialized.length,
        totalStockIn,
        totalStockUsed,
        totalStockBalance,
        lowStockCount: serialized.filter((i) => i.status === "LOW_STOCK" || i.status === "OUT_OF_STOCK").length,
      },
    });
  } catch (error) {
    console.error("Failed to fetch inventory:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch inventory" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, itemName, category, stockIn, stockUsed, unit, status, notes } = body;

    if (!itemName || typeof itemName !== "string" || !itemName.trim()) {
      return NextResponse.json({ success: false, error: "Item name is required" }, { status: 400 });
    }

    const sIn = Number(stockIn) || 0;
    const sUsed = Number(stockUsed) || 0;
    const balance = sIn - sUsed;

    const data = {
      itemName: itemName.trim(),
      category: category?.trim() || "GLASS",
      stockIn: sIn,
      stockUsed: sUsed,
      stockBalance: balance,
      unit: unit || "SQFT",
      status: status || (balance <= 0 ? "OUT_OF_STOCK" : balance < 100 ? "LOW_STOCK" : "IN_STOCK"),
      notes: notes?.trim() || null,
    };

    let item;
    if (id) {
      item = await prisma.inventoryStock.update({
        where: { id },
        data,
      });
    } else {
      item = await prisma.inventoryStock.upsert({
        where: { itemName: data.itemName },
        update: data,
        create: data,
      });
    }

    return NextResponse.json({
      success: true,
      item: {
        ...item,
        stockIn: item.stockIn.toNumber(),
        stockUsed: item.stockUsed.toNumber(),
        stockBalance: item.stockBalance.toNumber(),
      },
    });
  } catch (error) {
    console.error("Failed to save inventory item:", error);
    return NextResponse.json({ success: false, error: "Failed to save inventory item" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, error: "Item ID required" }, { status: 400 });
    }

    await prisma.inventoryStock.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ success: true, message: "Inventory item deleted successfully" });
  } catch (error) {
    console.error("Failed to delete inventory item:", error);
    return NextResponse.json({ success: false, error: "Failed to delete inventory item" }, { status: 500 });
  }
}

