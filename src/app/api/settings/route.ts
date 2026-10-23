import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { canEditRateCard } from "@/lib/auth/types";

export async function GET() {
  try {
    const settingsList = await prisma.setting.findMany();
    const settings: Record<string, string> = {};

    settingsList.forEach((s) => {
      settings[s.key] = s.value;
    });

    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error: unknown) {
    if ((error as { digest?: string })?.digest?.startsWith?.("NEXT_PRERENDER")) {
      throw error;
    }
    console.error("Failed to load settings:", error);
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || !canEditRateCard(session.role)) {
      return NextResponse.json(
        { error: "Forbidden: Only Admin and Manager can modify system settings" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { settings } = body as { settings: Record<string, string> };

    if (!settings || typeof settings !== "object") {
      return NextResponse.json({ error: "Invalid settings payload" }, { status: 400 });
    }

    for (const [key, value] of Object.entries(settings)) {
      await prisma.setting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      });
    }

    // Audit log
    try {
      await prisma.auditLog.create({
        data: {
          entityName: "Setting",
          entityId: "system-settings",
          action: "UPDATE_SETTINGS",
          performedById: session.id,
          details: JSON.stringify(settings),
        },
      });
    } catch (auditErr) {
      console.warn("Failed to write audit log:", auditErr);
    }

    return NextResponse.json({
      success: true,
      message: "Settings updated successfully",
    });
  } catch (error: unknown) {
    if ((error as { digest?: string })?.digest?.startsWith?.("NEXT_PRERENDER")) {
      throw error;
    }
    console.error("Failed to update settings:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
