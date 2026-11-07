import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const dbFactories = await prisma.factory.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
    });

    const dbVendors = await prisma.vendor.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, mobile: true },
      orderBy: { name: "asc" },
    });

    // Merge names so all factories & vendors are accessible as processing factories
    const factoryMap = new Map<string, { id: string; name: string; phone?: string | null }>();

    for (const f of dbFactories) {
      factoryMap.set(f.name.toLowerCase().trim(), {
        id: f.id,
        name: f.name.trim(),
        phone: f.phone,
      });
    }

    for (const v of dbVendors) {
      const key = v.name.toLowerCase().trim();
      if (!factoryMap.has(key)) {
        factoryMap.set(key, {
          id: `vendor-${v.id}`,
          name: v.name.trim(),
          phone: v.mobile,
        });
      }
    }

    // Ensure defaults exist if list is empty
    if (!factoryMap.has("veera glass")) {
      factoryMap.set("veera glass", { id: "factory-veera-glass", name: "Veera Glass" });
    }
    if (!factoryMap.has("vendor sachin")) {
      factoryMap.set("vendor sachin", { id: "factory-vendor-sachin", name: "Vendor Sachin" });
    }

    const factories = Array.from(factoryMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    return NextResponse.json({
      success: true,
      factories,
    });
  } catch (error) {
    console.error("Failed to fetch factories:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch factories" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, phone, address } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ success: false, error: "Factory/Vendor name is required" }, { status: 400 });
    }

    const trimmedName = name.trim();

    // Check existing factory
    let factory = await prisma.factory.findFirst({
      where: {
        name: { equals: trimmedName },
        deletedAt: null,
      },
    });

    if (!factory) {
      // Generate short code
      const code = trimmedName
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 4) || "VND";

      factory = await prisma.factory.create({
        data: {
          name: trimmedName,
          code,
          phone: phone?.trim() || null,
          address: address?.trim() || null,
        },
      });
    }

    // Also ensure Vendor record exists for Tab 4 and payables tracking
    const vendorExists = await prisma.vendor.findFirst({
      where: {
        name: { equals: trimmedName },
        deletedAt: null,
      },
    });

    if (!vendorExists) {
      await prisma.vendor.create({
        data: {
          name: trimmedName,
          mobile: phone?.trim() || null,
          workType: "Factory Processing / Material Supply",
          rate: "As per order",
          balanceDue: 0,
          status: "RECEIVED",
          notes: "Added via Quotation Manager",
        },
      });
    }

    return NextResponse.json({
      success: true,
      factory: {
        id: factory.id,
        name: factory.name,
        code: factory.code,
      },
    });
  } catch (error) {
    console.error("Failed to save factory:", error);
    return NextResponse.json({ success: false, error: "Failed to save factory" }, { status: 500 });
  }
}
