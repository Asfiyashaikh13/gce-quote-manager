import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/types";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !isAdmin(session.role)) {
      return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 403 });
    }

    const [
      users,
      customers,
      products,
      factories,
      settings,
      masterRows,
      quotes,
      quoteItems,
      payments,
      auditLogs,
    ] = await Promise.all([
      prisma.user.findMany({ select: { id: true, email: true, name: true, role: true, mustChangePassword: true, createdAt: true } }),
      prisma.customer.findMany(),
      prisma.product.findMany(),
      prisma.factory.findMany(),
      prisma.setting.findMany(),
      prisma.masterRow.findMany({ where: { deletedAt: null } }),
      prisma.quote.findMany({ where: { deletedAt: null } }),
      prisma.quoteItem.findMany({ where: { deletedAt: null } }),
      prisma.payment.findMany({ where: { deletedAt: null } }),
      prisma.auditLog.findMany({ take: 200, orderBy: { createdAt: "desc" } }),
    ]);

    const backupData = {
      app: "gce-quote-manager",
      version: "1.0.0",
      exportedAt: new Date().toISOString(),
      exportedBy: session.email,
      counts: {
        users: users.length,
        customers: customers.length,
        products: products.length,
        factories: factories.length,
        settings: settings.length,
        masterRows: masterRows.length,
        quotes: quotes.length,
        quoteItems: quoteItems.length,
        payments: payments.length,
        auditLogs: auditLogs.length,
      },
      data: {
        users,
        customers,
        products,
        factories,
        settings,
        masterRows,
        quotes,
        quoteItems,
        payments,
        auditLogs,
      },
    };

    const filename = `gce_backup_${new Date().toISOString().replace(/[:.]/g, "-")}.json`;

    return new NextResponse(JSON.stringify(backupData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: unknown) {
    const digest = (error as { digest?: string })?.digest;
    if (digest?.startsWith?.("NEXT_PRERENDER") || digest === "HANGING_PROMISE_REJECTION") {
      throw error;
    }
    console.error("Backup export error:", error);
    return NextResponse.json({ error: "Failed to generate backup" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || !isAdmin(session.role)) {
      return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 403 });
    }

    const payload = await request.json();
    if (!payload || !payload.data) {
      return NextResponse.json({ error: "Invalid backup file format" }, { status: 400 });
    }

    const { settings = [], products = [], factories = [] } = payload.data;

    // Restore settings
    for (const s of settings) {
      if (s.key && s.value !== undefined) {
        await prisma.setting.upsert({
          where: { key: s.key },
          update: { value: String(s.value), description: s.description },
          create: { key: s.key, value: String(s.value), description: s.description },
        });
      }
    }

    // Restore products
    for (const p of products) {
      if (p.name) {
        await prisma.product.upsert({
          where: { id: p.id },
          update: { name: p.name, rate: p.rate, code: p.code, gstRate: p.gstRate },
          create: { id: p.id, name: p.name, rate: p.rate, code: p.code, gstRate: p.gstRate },
        });
      }
    }

    // Restore factories
    for (const f of factories) {
      if (f.name) {
        await prisma.factory.upsert({
          where: { id: f.id },
          update: { name: f.name, code: f.code },
          create: { id: f.id, name: f.name, code: f.code },
        });
      }
    }

    // Log the restore event
    await prisma.auditLog.create({
      data: {
        entityName: "System",
        entityId: "backup-restore",
        action: "RESTORE_DATABASE",
        performedById: session.id,
        details: JSON.stringify({
          restoredAt: new Date().toISOString(),
          sourceExportedAt: payload.exportedAt,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Database restore completed successfully",
    });
  } catch (error: unknown) {
    if ((error as { digest?: string })?.digest?.startsWith?.("NEXT_PRERENDER")) {
      throw error;
    }
    console.error("Backup restore error:", error);
    return NextResponse.json({ error: "Failed to restore backup" }, { status: 500 });
  }
}
