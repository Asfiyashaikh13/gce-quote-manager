import { NextResponse } from "next/server";
import { optimizeCuttingPlan, generateSheetSvg, StockSheet, PieceToCut } from "@/lib/optimizer/guillotine";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      stockSheet = { width: 2440, height: 1830, label: "Standard Float (2440x1830)" },
      items = [],
      allowRotation = true,
      kerfMm = 0,
    } = body as {
      stockSheet: StockSheet;
      items: PieceToCut[];
      allowRotation?: boolean;
      kerfMm?: number;
    };

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "No pieces provided for optimization" }, { status: 400 });
    }

    const result = optimizeCuttingPlan(stockSheet, items, {
      allowRotation,
      kerfMm,
    });

    const sheetsWithSvg = result.sheets.map((s) => ({
      ...s,
      svg: generateSheetSvg(s, { displayWidth: 800 }),
    }));

    return NextResponse.json({
      success: true,
      result: {
        ...result,
        sheets: sheetsWithSvg,
      },
    });
  } catch (error) {
    console.error("Cutting optimization error:", error);
    return NextResponse.json({ error: "Failed to run optimization" }, { status: 500 });
  }
}

