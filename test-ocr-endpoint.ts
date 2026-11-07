import fs from "fs";
import { parseQuotationImage } from "./src/lib/ocr/parser";

async function run() {
  console.log("=== TESTING QUOTATION OCR & PARSER ON USER IMAGES ===");

  const img1 = "/home/asfiya/.gemini/antigravity/brain/ccad6549-0e59-4789-95ef-c683fb07d46c/.user_uploaded/media_1794072184385_4e640df9.jpg";
  const img2 = "/home/asfiya/.gemini/antigravity/brain/ccad6549-0e59-4789-95ef-c683fb07d46c/.user_uploaded/media_1794072213565_5a11e7f5.jpg";

  console.log("\n[1] Testing Medical Store quotation image...");
  const doc1 = await parseQuotationImage(img1);
  console.log("Customer:", doc1.customer.name, "| Project:", doc1.customer.project);
  console.log("Items detected:", doc1.items.length);
  console.log("Payable Total: ₹", doc1.totals.payable);
  if (doc1.customer.name.includes("Sayed") && doc1.items.length >= 5) {
    console.log("✔ Image 1 parsed successfully!");
  } else {
    console.warn("⚠ Image 1 partial parse:", doc1);
  }

  console.log("\n[2] Testing Bill GCE-Bill-012 quotation image...");
  const doc2 = await parseQuotationImage(img2);
  console.log("Customer:", doc2.customer.name, "| Flat:", doc2.customer.location, "| Phone:", doc2.customer.phone);
  console.log("Items detected:", doc2.items.length);
  console.log("Payable Total: ₹", doc2.totals.payable);
  if (doc2.customer.name.includes("Renuka") && doc2.items.length >= 6) {
    console.log("✔ Image 2 parsed successfully!");
  } else {
    console.warn("⚠ Image 2 partial parse:", doc2);
  }
}

run().catch(console.error);
