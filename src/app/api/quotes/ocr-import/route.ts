import { NextResponse } from "next/server";
import { parseQuotationImage } from "@/lib/ocr/parser";
import fs from "fs";
import path from "path";
import os from "os";

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";

    let buffer: Buffer | null = null;
    let fileName = `upload_${Date.now()}.jpg`;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json({ error: "No image file provided" }, { status: 400 });
      }
      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
      fileName = file.name || fileName;
    } else {
      const body = await request.json().catch(() => null);
      if (body?.imageBase64) {
        const base64Data = body.imageBase64.replace(/^data:image\/\w+;base64,/, "");
        buffer = Buffer.from(base64Data, "base64");
      }
    }

    if (!buffer) {
      return NextResponse.json(
        { error: "Invalid request. Please provide an image file or imageBase64 string." },
        { status: 400 }
      );
    }

    // Save to temp file
    const tempFilePath = path.join(os.tmpdir(), `ocr_import_${Date.now()}_${fileName}`);
    fs.writeFileSync(tempFilePath, buffer);

    try {
      const quotation = await parseQuotationImage(tempFilePath);

      return NextResponse.json({
        success: true,
        message: "Quotation successfully parsed from image",
        quotation,
      });
    } finally {
      // Clean up temp file
      try {
        if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
      } catch (err) {
        console.warn("Failed to delete temp file:", err);
      }
    }
  } catch (error) {
    console.error("OCR import error:", error);
    return NextResponse.json(
      { error: "Failed to process quotation image", details: String(error) },
      { status: 500 }
    );
  }
}
