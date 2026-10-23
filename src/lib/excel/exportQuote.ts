import * as XLSX from "xlsx";

export interface ExcelQuoteExportData {
  quoteNumber: string;
  customerName: string;
  date: string;
  subTotal: number;
  gstTotal: number;
  grandTotal: number;
  displayTotal: number;
  items: Array<{
    itemOrder: number;
    description: string;
    frameHeightMm: number;
    frameWidthMm: number;
    roundedHeightMm: number;
    roundedWidthMm: number;
    glassCutHeightMm: number;
    glassCutWidthMm: number;
    quantity: number;
    rate: number;
    sqft: number;
    runningFeet: number;
    netAmount: number;
    gstAmount: number;
    totalAmount: number;
  }>;
}

export function generateQuoteExcelBuffer(data: ExcelQuoteExportData): Buffer {
  const rows = [
    ["GLASS CARE ENTERPRISES - QUOTATION"],
    ["Quote Number:", data.quoteNumber, "Date:", data.date],
    ["Customer:", data.customerName],
    [],
    [
      "#",
      "Item Description",
      "Frame H (mm)",
      "Frame W (mm)",
      "Glass Cut H (mm)",
      "Glass Cut W (mm)",
      "Round H (mm)",
      "Round W (mm)",
      "Qty",
      "Sqft",
      "Running Feet",
      "Rate (₹)",
      "Net Amount (₹)",
      "GST (₹)",
      "Total (₹)",
    ],
    ...data.items.map((it) => [
      it.itemOrder,
      it.description,
      it.frameHeightMm,
      it.frameWidthMm,
      it.glassCutHeightMm,
      it.glassCutWidthMm,
      it.roundedHeightMm,
      it.roundedWidthMm,
      it.quantity,
      it.sqft,
      it.runningFeet,
      it.rate,
      it.netAmount,
      it.gstAmount,
      it.totalAmount,
    ]),
    [],
    ["", "", "", "", "", "", "", "", "", "", "", "Sub Total (₹):", data.subTotal],
    ["", "", "", "", "", "", "", "", "", "", "", "Total GST (₹):", data.gstTotal],
    ["", "", "", "", "", "", "", "", "", "", "", "Grand Total (₹):", data.grandTotal],
    ["", "", "", "", "", "", "", "", "", "", "", "Final Display Total (₹):", data.displayTotal],
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Quotation");

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return buffer;
}

