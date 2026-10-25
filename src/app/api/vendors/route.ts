import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const vendors = await prisma.vendor.findMany({
      where: { deletedAt: null },
      orderBy: { balanceDue: "desc" },
      include: {
        _count: {
          select: { expenses: true },
        },
      },
    });

    const serialized = vendors.map((v) => ({
      id: v.id,
      name: v.name,
      mobile: v.mobile || "",
      workType: v.workType || "Fabrication & Glass",
      rate: v.rate || "As per order",
      balanceDue: v.balanceDue.toNumber(),
      status: v.status || "PENDING",
      notes: v.notes || "",
      expensesCount: v._count.expenses,
      createdAt: v.createdAt.toISOString(),
      updatedAt: v.updatedAt.toISOString(),
    }));

    const totalBalanceDue = serialized.reduce((sum, v) => sum + v.balanceDue, 0);

    return NextResponse.json({
      success: true,
      vendors: serialized,
      summary: {
        totalVendors: serialized.length,
        totalBalanceDue,
        pendingCount: serialized.filter((v) => v.status === "PENDING").length,
        followUpCount: serialized.filter((v) => v.status === "FOLLOW_UP").length,
        receivedCount: serialized.filter((v) => v.status === "RECEIVED").length,
      },
    });
  } catch (error) {
    console.error("Failed to fetch vendors:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch vendors" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, name, mobile, workType, rate, balanceDue, status, notes } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ success: false, error: "Vendor name is required" }, { status: 400 });
    }

    const data = {
      name: name.trim(),
      mobile: mobile?.trim() || null,
      workType: workType?.trim() || null,
      rate: rate?.trim() || null,
      balanceDue: balanceDue !== undefined && balanceDue !== null ? Number(balanceDue) : 0,
      status: status || "PENDING",
      notes: notes?.trim() || null,
    };

    let vendor;
    if (id) {
      vendor = await prisma.vendor.update({
        where: { id },
        data,
      });
    } else {
      vendor = await prisma.vendor.create({
        data,
      });
    }

    return NextResponse.json({
      success: true,
      vendor: {
        ...vendor,
        balanceDue: vendor.balanceDue.toNumber(),
      },
    });
  } catch (error) {
    console.error("Failed to save vendor:", error);
    return NextResponse.json({ success: false, error: "Failed to save vendor" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, error: "Vendor ID required" }, { status: 400 });
    }

    await prisma.vendor.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ success: true, message: "Vendor deleted successfully" });
  } catch (error) {
    console.error("Failed to delete vendor:", error);
    return NextResponse.json({ success: false, error: "Failed to delete vendor" }, { status: 500 });
  }
}
