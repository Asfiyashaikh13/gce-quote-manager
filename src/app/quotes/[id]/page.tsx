import prisma from "@/lib/prisma";
import Link from "next/link";
import { QuoteDetailClient, QuoteDetail } from "./QuoteDetailClient";

export const dynamic = "force-dynamic";

async function getQuote(id: string): Promise<QuoteDetail | null> {
  const quote = await prisma.quote.findUnique({
    where: { id },
    include: {
      items: { orderBy: { itemOrder: "asc" } },
      payments: { where: { deletedAt: null }, orderBy: { paymentDate: "desc" } },
      revisions: {
        select: {
          id: true,
          quoteNumber: true,
          version: true,
          status: true,
          grandTotal: true,
          createdAt: true,
        },
        orderBy: { version: "desc" },
      },
      parentQuote: {
        select: {
          id: true,
          quoteNumber: true,
          version: true,
          grandTotal: true,
        },
      },
    },
  });

  if (!quote || quote.deletedAt !== null) {
    return null;
  }

  return {
    id: quote.id,
    quoteNumber: quote.quoteNumber,
    version: quote.version,
    status: quote.status,
    customerName: quote.customerName,
    customerBuilding: quote.customerBuilding || "",
    customerFlat: quote.customerFlat || "",
    customerPhone: quote.customerPhone || "",
    customerAddress: quote.customerAddress || "",
    destinationState: quote.destinationState,
    subTotal: quote.subTotal.toNumber(),
    cgstTotal: quote.cgstTotal.toNumber(),
    sgstTotal: quote.sgstTotal.toNumber(),
    igstTotal: quote.igstTotal.toNumber(),
    gstTotal: quote.gstTotal.toNumber(),
    grandTotal: quote.grandTotal.toNumber(),
    roundOff: quote.roundOff.toNumber(),
    displayTotal: quote.displayTotal.toNumber(),
    displayTotalWords: quote.displayTotalWords || "",
    freight: quote.freight.toNumber(),
    discountType: (quote.discountType as "PERCENT" | "FLAT" | "NONE") || "NONE",
    discountValue: quote.discountValue.toNumber(),
    validUntil: quote.validUntil ? quote.validUntil.toISOString() : null,
    createdAt: quote.createdAt.toISOString(),
    notes: quote.notes,
    items: quote.items.map((it) => ({
      id: it.id,
      itemOrder: it.itemOrder,
      description: it.description || "",
      frameHeightMm: it.frameHeightMm.toNumber(),
      frameWidthMm: it.frameWidthMm.toNumber(),
      roundedHeightMm: it.roundedHeightMm.toNumber(),
      roundedWidthMm: it.roundedWidthMm.toNumber(),
      glassCutHeightMm: it.glassCutHeightMm.toNumber(),
      glassCutWidthMm: it.glassCutWidthMm.toNumber(),
      quantity: it.quantity,
      rate: it.rate.toNumber(),
      sqft: it.sqft.toNumber(),
      runningFeet: it.runningFeet.toNumber(),
      grossAmount: it.grossAmount.toNumber(),
      discountAmount: it.discountAmount.toNumber(),
      netAmount: it.netAmount.toNumber(),
      taxableAmount: it.taxableAmount.toNumber(),
      cgstAmount: it.cgstAmount.toNumber(),
      sgstAmount: it.sgstAmount.toNumber(),
      igstAmount: it.igstAmount.toNumber(),
      gstAmount: it.gstAmount.toNumber(),
      totalAmount: it.totalAmount.toNumber(),
    })),
    payments: quote.payments.map((p) => ({
      id: p.id,
      receiptNumber: p.receiptNumber,
      amount: p.amount.toNumber(),
      milestone: p.milestone,
      mode: p.mode,
      reference: p.reference || undefined,
      paymentDate: p.paymentDate.toISOString(),
    })),
    revisions: quote.revisions.map((r) => ({
      id: r.id,
      quoteNumber: r.quoteNumber,
      version: r.version,
      status: r.status,
      grandTotal: r.grandTotal.toNumber(),
      createdAt: r.createdAt.toISOString(),
    })),
    parentQuote: quote.parentQuote
      ? {
          id: quote.parentQuote.id,
          quoteNumber: quote.parentQuote.quoteNumber,
          version: quote.parentQuote.version,
          grandTotal: quote.parentQuote.grandTotal.toNumber(),
        }
      : null,
  };
}

export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const quote = await getQuote(id);

  if (!quote) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-8 gap-4">
        <div className="text-red-500 font-semibold text-base">Quotation not found.</div>
        <p className="text-xs text-slate-500">The requested quotation ID does not exist or may have been deleted.</p>
        <Link
          href="/quotes"
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
        >
          ← Back to All Quotes
        </Link>
      </div>
    );
  }

  return <QuoteDetailClient initialQuote={quote} />;
}
