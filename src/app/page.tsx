import { Suspense } from "react";
import prisma from "@/lib/prisma";
import { MasterSheet } from "./MasterSheet";
import { MasterSheetRowData } from "@/lib/sheet/types";

async function MasterSheetData() {
  let rows: MasterSheetRowData[] = [];
  let products: Array<{ id: string; name: string; code: string | null; rate: number }> = [];
  let factories: Array<{ id: string; name: string }> = [];

  try {
    const dbRows = await prisma.masterRow.findMany({
      where: { deletedAt: null },
      orderBy: { rowOrder: "asc" },
    });

    rows = dbRows.map((r) => ({
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

    const dbProducts = await prisma.product.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
    });
    products = dbProducts.map((p) => ({
      id: p.id,
      name: p.name,
      code: p.code,
      rate: p.rate.toNumber(),
    }));

    const dbFactories = await prisma.factory.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
    });
    factories = dbFactories.map((f) => ({
      id: f.id,
      name: f.name,
    }));
  } catch (err) {
    console.error("Failed to load DB entities:", err);
  }

  // Fallbacks if database is empty
  if (products.length === 0) {
    products = [
      { id: "p1", code: "AL-SHUTTER-565", name: "Al Shutters 565", rate: 565 },
      { id: "p2", code: "AL-SHUTTER-430", name: "Al Shutters 430", rate: 430 },
      { id: "p3", code: "GLASS-PLAIN-8MM", name: "8mm plain glass", rate: 135 },
      { id: "p4", code: "MIRROR-POLISHED-5MM", name: "5mm mirror polished", rate: 145 },
    ];
  }

  if (factories.length === 0) {
    factories = [
      { id: "f1", name: "Veera Glass" },
      { id: "f2", name: "Wender Sachin" },
    ];
  }

  return (
    <MasterSheet
      initialRows={rows}
      products={products}
      factories={factories}
    />
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-8">
          <div className="text-slate-600 font-medium animate-pulse">Loading Master Sheet...</div>
        </div>
      }
    >
      <MasterSheetData />
    </Suspense>
  );
}
