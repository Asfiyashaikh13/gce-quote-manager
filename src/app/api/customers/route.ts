import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import Decimal from "decimal.js";

export async function GET() {
  try {
    const [dbQuotes, dbRows] = await Promise.all([
      prisma.quote.findMany({
        where: { deletedAt: null },
        include: { payments: { where: { deletedAt: null } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.masterRow.findMany({
        where: { deletedAt: null },
      }),
    ]);

    interface AggregatedCustomer {
      id: string;
      name: string;
      phone: string;
      building: string;
      flat: string;
      state: string;
      quotesCount: number;
      sheetRowsCount: number;
      totalQuoted: number;
      totalPaid: number;
      outstandingBalance: number;
      lastActivityDate: string;
    }

    const map = new Map<string, AggregatedCustomer>();

    // 1. Ingest MasterSheet rows
    dbRows.forEach((r) => {
      const name = (r.clientName || "Unnamed Client").trim();
      const building = (r.building || "").trim();
      const flat = (r.flat || "").trim();
      const key = `${name.toLowerCase()}:::${building.toLowerCase()}:::${flat.toLowerCase()}`;

      if (!map.has(key)) {
        map.set(key, {
          id: `cust-${map.size + 1}`,
          name,
          phone: "7411415842",
          building,
          flat,
          state: r.state || "Karnataka",
          quotesCount: 0,
          sheetRowsCount: 0,
          totalQuoted: 0,
          totalPaid: 0,
          outstandingBalance: 0,
          lastActivityDate: r.updatedAt.toISOString(),
        });
      }

      const c = map.get(key)!;
      c.sheetRowsCount += 1;
    });

    // 2. Ingest Quotes & Payments
    dbQuotes.forEach((q) => {
      const name = (q.customerName || "Unnamed Client").trim();
      const building = (q.customerBuilding || "").trim();
      const flat = (q.customerFlat || "").trim();
      const key = `${name.toLowerCase()}:::${building.toLowerCase()}:::${flat.toLowerCase()}`;

      if (!map.has(key)) {
        map.set(key, {
          id: `cust-${map.size + 1}`,
          name,
          phone: q.customerPhone || "7411415842",
          building,
          flat,
          state: q.customerState || "Karnataka",
          quotesCount: 0,
          sheetRowsCount: 0,
          totalQuoted: 0,
          totalPaid: 0,
          outstandingBalance: 0,
          lastActivityDate: q.updatedAt.toISOString(),
        });
      }

      const c = map.get(key)!;
      c.quotesCount += 1;
      const qVal = q.displayTotal.toNumber();
      c.totalQuoted += qVal;

      const qPaid = q.payments.reduce(
        (sum, p) => sum.plus(p.amount),
        new Decimal(0)
      ).toNumber();

      c.totalPaid += qPaid;
      c.outstandingBalance = Math.max(0, c.totalQuoted - c.totalPaid);

      if (q.customerPhone) c.phone = q.customerPhone;
    });

    const customers = Array.from(map.values()).sort(
      (a, b) => b.totalQuoted - a.totalQuoted
    );

    return NextResponse.json({
      success: true,
      customers,
      totalCount: customers.length,
    });
  } catch (error: unknown) {
    if ((error as { digest?: string })?.digest?.startsWith?.("NEXT_PRERENDER")) {
      throw error;
    }
    console.error("Customers API error:", error);
    return NextResponse.json({ error: "Failed to load customers" }, { status: 500 });
  }
}
