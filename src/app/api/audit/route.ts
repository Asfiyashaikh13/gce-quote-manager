import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getSession } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/types";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session || !isAdmin(session.role)) {
      return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "100", 10);
    const action = searchParams.get("action");

    const where: Prisma.AuditLogWhereInput = {};
    if (action && action !== "ALL") {
      where.action = action;
    }

    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        performedBy: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    const formatted = logs.map((l) => ({
      id: l.id,
      entityName: l.entityName,
      entityId: l.entityId,
      action: l.action,
      details: l.details,
      ipAddress: l.ipAddress,
      createdAt: l.createdAt,
      performedBy: l.performedBy?.email || "System / Anonymous",
      role: l.performedBy?.role || "SYSTEM",
    }));

    return NextResponse.json({
      success: true,
      logs: formatted,
      count: formatted.length,
    });
  } catch (error: unknown) {
    const digest = (error as { digest?: string })?.digest;
    if (digest?.startsWith?.("NEXT_PRERENDER") || digest === "HANGING_PROMISE_REJECTION") {
      throw error;
    }
    console.error("Audit log error:", error);
    return NextResponse.json({ error: "Failed to fetch audit logs" }, { status: 500 });
  }
}
