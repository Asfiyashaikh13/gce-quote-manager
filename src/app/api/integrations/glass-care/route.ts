import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { QuoteStatus, DiscountType, PaymentMode } from "@prisma/client";
import { roundUp, numberToIndianWords } from "@/lib/calc";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: CORS_HEADERS,
  });
}

export async function GET() {
  return NextResponse.json(
    {
      success: true,
      service: "Glass Care Enterprises Quotation Sync API",
      status: "active",
      timestamp: new Date().toISOString(),
    },
    { headers: CORS_HEADERS }
  );
}

interface GlassCareItem {
  id?: string;
  category?: string;
  itemName?: string;
  description?: string;
  unit?: string;
  height?: number;
  width?: number;
  thickness?: number;
  quantity?: number;
  rate?: number;
  discountPercent?: number;
  gstRate?: number;
  taxableAmount?: number;
  taxAmount?: number;
  lineTotal?: number;
  measure?: number;
  sqft?: number;
  measureOverride?: number;
  taxableAmountOverride?: number;
  taxAmountOverride?: number;
}

interface GlassCareDocument {
  id: string;
  type?: string; // "Bill" | "Invoice" | "Estimate"
  number?: string;
  calculationNumber?: string;
  date?: string;
  state?: string;
  customer?: {
    name?: string;
    location?: string; // flat
    project?: string; // building
    phone?: string;
    gstin?: string;
  };
  paymentMode?: string;
  paidAmount?: number;
  items?: GlassCareItem[];
  totals?: {
    grossSubtotal?: number;
    discountTotal?: number;
    subtotal?: number;
    cgst?: number;
    sgst?: number;
    igst?: number;
    taxTotal?: number;
    payable?: number;
    unroundedTotal?: number;
    roundOff?: number;
    lines?: Array<{
      grossAmount?: number;
      taxableAmount?: number;
      cgst?: number;
      sgst?: number;
      igst?: number;
      taxAmount?: number;
      lineTotal?: number;
    }>;
  };
  createdAt?: string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Extract list of documents from various formats (single, array, backup export)
    let rawDocs: GlassCareDocument[] = [];
    if (Array.isArray(body)) {
      rawDocs = body;
    } else if (body.document) {
      rawDocs = [body.document];
    } else if (Array.isArray(body.documents)) {
      rawDocs = body.documents;
    } else if (body.backup?.documents && Array.isArray(body.backup.documents)) {
      rawDocs = body.backup.documents;
    } else if (body.id && (body.type || body.items || body.customer)) {
      rawDocs = [body];
    }

    if (rawDocs.length === 0) {
      return NextResponse.json(
        { error: "No valid Glass Care documents found in request body" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // Default factory
    const defaultFactory = await prisma.factory.findFirst({
      where: { name: { contains: "Veera" } },
    });
    const factoryId = defaultFactory?.id || null;

    const processedQuotes = [];

    for (const doc of rawDocs) {
      const docType = doc.type || "Estimate";
      const docNumber = doc.number || `GCE-${docType}-${Date.now().toString().slice(-4)}`;
      const customerName = doc.customer?.name?.trim() || "Valued Client";
      const customerBuilding = doc.customer?.project?.trim() || "";
      const customerFlat = doc.customer?.location?.trim() || "";
      const customerPhone = doc.customer?.phone?.trim() || "";
      const state = doc.state || "Karnataka";
      const items = Array.isArray(doc.items) ? doc.items : [];

      // Determine initial status based on Document Type & Payment
      let status: QuoteStatus = QuoteStatus.DRAFT;
      if (docType === "Bill") {
        status = doc.paymentMode === "Paid" ? QuoteStatus.PAID : QuoteStatus.APPROVED;
      } else if (docType === "Invoice") {
        status = doc.paymentMode === "Paid" ? QuoteStatus.PAID : QuoteStatus.IN_PRODUCTION;
      } else if (docType === "Estimate") {
        status = QuoteStatus.SENT;
      }

      // Compute or extract totals
      const subTotal = Number(doc.totals?.subtotal ?? doc.totals?.grossSubtotal ?? 0);
      const cgstTotal = Number(doc.totals?.cgst ?? 0);
      const sgstTotal = Number(doc.totals?.sgst ?? 0);
      const igstTotal = Number(doc.totals?.igst ?? 0);
      const gstTotal = Number(doc.totals?.taxTotal ?? cgstTotal + sgstTotal + igstTotal);
      const grandTotal = Number(doc.totals?.payable ?? doc.totals?.unroundedTotal ?? subTotal + gstTotal);
      const displayTotal = Math.round(grandTotal);
      const roundOff = displayTotal - grandTotal;
      const displayTotalWords = numberToIndianWords(displayTotal);

      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 60);

      // Check if quote already exists
      const existing = await prisma.quote.findFirst({
        where: {
          OR: [
            { quoteNumber: docNumber },
            { notes: { contains: `SourceId: ${doc.id}` } },
          ],
        },
      });

      const noteStr = `Imported from Glass Care (${docType} #${docNumber}). SourceId: ${doc.id}. Payment: ${doc.paymentMode || "Pending"}`;

      let quote;

      if (existing) {
        // Update existing quote & replace line items
        await prisma.quoteItem.deleteMany({ where: { quoteId: existing.id } });

        quote = await prisma.quote.update({
          where: { id: existing.id },
          data: {
            quoteNumber: docNumber,
            customerName,
            customerBuilding,
            customerFlat,
            customerPhone,
            customerAddress: customerFlat ? `${customerFlat}, ${customerBuilding}` : customerBuilding,
            customerState: state,
            destinationState: state,
            factoryId: existing.factoryId || factoryId,
            status,
            subTotal,
            cgstTotal,
            sgstTotal,
            igstTotal,
            gstTotal,
            grandTotal,
            roundOff,
            displayTotal,
            displayTotalWords,
            notes: noteStr,
            items: {
              create: items.map((it, idx) => {
                const desc = [it.category, it.itemName, it.description].filter(Boolean).join(" - ") || "Glass / Shutter Line";
                const hMm = Number(it.height) || 0;
                const wMm = Number(it.width) || 0;
                const qty = Number(it.quantity) || 1;
                const rate = Number(it.rate) || 0;
                const roundedH = hMm > 0 ? roundUp(hMm, 76.2).toNumber() : 0;
                const roundedW = wMm > 0 ? roundUp(wMm, 76.2).toNumber() : 0;
                const glassCutH = hMm > 7 ? hMm - 7 : hMm; // -7mm deduction rule
                const glassCutW = wMm > 7 ? wMm - 7 : wMm; // -7mm deduction rule
                const sqft = Number(it.sqft || it.measure || (roundedH * roundedW > 0 ? (roundedH * roundedW / 92903.04) * qty : 0));
                const rft = (2 * (hMm + wMm) / 304.8) * qty;
                const lineTaxable = Number(it.taxableAmount ?? (rate * qty));
                const lineTax = Number(it.taxAmount ?? (lineTaxable * 0.18));
                const lineTotal = Number(it.lineTotal ?? (lineTaxable + lineTax));

                return {
                  itemOrder: idx + 1,
                  description: desc,
                  frameHeightMm: hMm,
                  frameWidthMm: wMm,
                  quantity: qty,
                  rate,
                  discountType: DiscountType.NONE,
                  discountValue: 0,
                  roundedHeightMm: roundedH,
                  roundedWidthMm: roundedW,
                  glassCutHeightMm: glassCutH,
                  glassCutWidthMm: glassCutW,
                  sqft,
                  runningFeet: rft,
                  grossAmount: lineTaxable,
                  discountAmount: 0,
                  netAmount: lineTaxable,
                  taxableAmount: lineTaxable,
                  cgstRate: state === "Karnataka" ? 9 : 0,
                  sgstRate: state === "Karnataka" ? 9 : 0,
                  igstRate: state === "Karnataka" ? 0 : 18,
                  cgstAmount: state === "Karnataka" ? lineTax / 2 : 0,
                  sgstAmount: state === "Karnataka" ? lineTax / 2 : 0,
                  igstAmount: state === "Karnataka" ? 0 : lineTax,
                  gstAmount: lineTax,
                  totalAmount: lineTotal,
                };
              }),
            },
          },
        });
      } else {
        // Create new quote
        quote = await prisma.quote.create({
          data: {
            quoteNumber: docNumber,
            version: 1,
            status,
            customerName,
            customerBuilding,
            customerFlat,
            customerPhone,
            customerAddress: customerFlat ? `${customerFlat}, ${customerBuilding}` : customerBuilding,
            customerState: state,
            destinationState: state,
            factoryId,
            discountType: DiscountType.NONE,
            discountValue: 0,
            freight: 0,
            validUntil,
            subTotal,
            cgstTotal,
            sgstTotal,
            igstTotal,
            gstTotal,
            grandTotal,
            roundOff,
            displayTotal,
            displayTotalWords,
            notes: noteStr,
            items: {
              create: items.map((it, idx) => {
                const desc = [it.category, it.itemName, it.description].filter(Boolean).join(" - ") || "Glass / Shutter Line";
                const hMm = Number(it.height) || 0;
                const wMm = Number(it.width) || 0;
                const qty = Number(it.quantity) || 1;
                const rate = Number(it.rate) || 0;
                const roundedH = hMm > 0 ? roundUp(hMm, 76.2).toNumber() : 0;
                const roundedW = wMm > 0 ? roundUp(wMm, 76.2).toNumber() : 0;
                const glassCutH = hMm > 7 ? hMm - 7 : hMm; // -7mm deduction rule
                const glassCutW = wMm > 7 ? wMm - 7 : wMm; // -7mm deduction rule
                const sqft = Number(it.sqft || it.measure || (roundedH * roundedW > 0 ? (roundedH * roundedW / 92903.04) * qty : 0));
                const rft = (2 * (hMm + wMm) / 304.8) * qty;
                const lineTaxable = Number(it.taxableAmount ?? (rate * qty));
                const lineTax = Number(it.taxAmount ?? (lineTaxable * 0.18));
                const lineTotal = Number(it.lineTotal ?? (lineTaxable + lineTax));

                return {
                  itemOrder: idx + 1,
                  description: desc,
                  frameHeightMm: hMm,
                  frameWidthMm: wMm,
                  quantity: qty,
                  rate,
                  discountType: DiscountType.NONE,
                  discountValue: 0,
                  roundedHeightMm: roundedH,
                  roundedWidthMm: roundedW,
                  glassCutHeightMm: glassCutH,
                  glassCutWidthMm: glassCutW,
                  sqft,
                  runningFeet: rft,
                  grossAmount: lineTaxable,
                  discountAmount: 0,
                  netAmount: lineTaxable,
                  taxableAmount: lineTaxable,
                  cgstRate: state === "Karnataka" ? 9 : 0,
                  sgstRate: state === "Karnataka" ? 9 : 0,
                  igstRate: state === "Karnataka" ? 0 : 18,
                  cgstAmount: state === "Karnataka" ? lineTax / 2 : 0,
                  sgstAmount: state === "Karnataka" ? lineTax / 2 : 0,
                  igstAmount: state === "Karnataka" ? 0 : lineTax,
                  gstAmount: lineTax,
                  totalAmount: lineTotal,
                };
              }),
            },
          },
        });
      }

      // TAB 3: Payment Tracker automatic sync
      // If paymentMode is "Paid" or a positive paidAmount is specified, record payment automatically
      const isPaid = doc.paymentMode === "Paid" || (doc.paidAmount != null && Number(doc.paidAmount) > 0);
      if (isPaid) {
        const paymentAmount = doc.paidAmount != null && Number(doc.paidAmount) > 0
          ? Number(doc.paidAmount)
          : displayTotal;

        const receiptNumber = `RCP-${docNumber}`;
        const existingPayment = await prisma.payment.findFirst({
          where: {
            OR: [
              { receiptNumber },
              { reference: `Glass Care ${docType} ${docNumber}` },
            ],
          },
        });

        const payModeEnum = doc.paymentMode === "Cash" ? PaymentMode.CASH : (doc.paymentMode === "UPI" ? PaymentMode.UPI : PaymentMode.BANK);

        if (!existingPayment) {
          await prisma.payment.create({
            data: {
              receiptNumber,
              quoteId: quote.id,
              milestone: docType === "Bill" ? "Full payment upon Bill generation" : "Initial payment (70% on ordering)",
              amount: paymentAmount,
              mode: payModeEnum,
              reference: `Glass Care ${docType} ${docNumber}`,
              notes: `Automatic payment sync from glass-care web app for ${customerName}`,
              paymentDate: doc.date ? new Date(doc.date) : new Date(),
            },
          });
        }
      }

      // TAB 7: Inventory / Stock update
      // Update consumed stock for glass / aluminum items
      for (const it of items) {
        const categoryName = (it.category || "").toUpperCase().includes("ALUM") ? "ALUMINIUM" : "GLASS";
        const totalSqft = Number(it.sqft || it.measure || 0);
        if (totalSqft > 0) {
          const stock = await prisma.inventoryStock.findFirst({
            where: { category: categoryName, deletedAt: null },
          });
          if (stock) {
            const newUsed = stock.stockUsed.toNumber() + totalSqft;
            const newBal = Math.max(0, stock.stockIn.toNumber() - newUsed);
            await prisma.inventoryStock.update({
              where: { id: stock.id },
              data: {
                stockUsed: newUsed,
                stockBalance: newBal,
              },
            });
          }
        }
      }

      processedQuotes.push({
        id: quote.id,
        quoteNumber: quote.quoteNumber,
        customerName: quote.customerName,
        displayTotal: quote.displayTotal.toNumber(),
        action: existing ? "updated" : "created",
      });
    }

    return NextResponse.json(
      {
        success: true,
        message: `Successfully synced ${processedQuotes.length} document(s) from Glass Care into 7 Tabs`,
        processedCount: processedQuotes.length,
        quotes: processedQuotes,
      },
      { headers: CORS_HEADERS }
    );
  } catch (error) {
    console.error("POST /api/integrations/glass-care error:", error);
    return NextResponse.json(
      { error: "Failed to process Glass Care document", details: String(error) },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
