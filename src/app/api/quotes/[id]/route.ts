import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { canEditQuotes } from "@/lib/auth/types";
import { isValidStatusTransition } from "@/lib/quotes/status";
import { calculateQuote } from "@/lib/calc";
import { QuoteStatus, DiscountType } from "@prisma/client";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    const formatted = {
      ...quote,
      subTotal: quote.subTotal.toNumber(),
      cgstTotal: quote.cgstTotal.toNumber(),
      sgstTotal: quote.sgstTotal.toNumber(),
      igstTotal: quote.igstTotal.toNumber(),
      gstTotal: quote.gstTotal.toNumber(),
      grandTotal: quote.grandTotal.toNumber(),
      roundOff: quote.roundOff.toNumber(),
      displayTotal: quote.displayTotal.toNumber(),
      freight: quote.freight.toNumber(),
      discountValue: quote.discountValue.toNumber(),
      items: quote.items.map((it) => ({
        ...it,
        frameHeightMm: it.frameHeightMm.toNumber(),
        frameWidthMm: it.frameWidthMm.toNumber(),
        roundedHeightMm: it.roundedHeightMm.toNumber(),
        roundedWidthMm: it.roundedWidthMm.toNumber(),
        glassCutHeightMm: it.glassCutHeightMm.toNumber(),
        glassCutWidthMm: it.glassCutWidthMm.toNumber(),
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
        ...p,
        amount: p.amount.toNumber(),
      })),
    };

    return NextResponse.json({ quote: formatted });
  } catch (error) {
    console.error("GET /api/quotes/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch quote" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (session && !canEditQuotes(session.role)) {
    return NextResponse.json({ error: "Forbidden: Read-only access" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const existing = await prisma.quote.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!existing || existing.deletedAt !== null) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    // Status transition check
    if (body.status && body.status !== existing.status) {
      const allowed = isValidStatusTransition(existing.status, body.status as QuoteStatus);
      if (!allowed) {
        return NextResponse.json(
          { error: `Invalid status transition from ${existing.status} to ${body.status}` },
          { status: 400 }
        );
      }
    }

    // Check if revision required: editing after status SENT creates a new revision
    const isSentOrLater = existing.status !== QuoteStatus.DRAFT;
    const itemsChanged = Array.isArray(body.items);

    if (isSentOrLater && itemsChanged) {
      // Create new revision v2, v3...
      const nextVersion = existing.version + 1;
      const state = body.destinationState || existing.destinationState;
      const freight = body.freight !== undefined ? body.freight : existing.freight.toNumber();
      const discountType = body.discountType || existing.discountType;
      const discountValue = body.discountValue !== undefined ? body.discountValue : existing.discountValue.toNumber();

      const calc = calculateQuote({
        items: body.items.map((it: { frameHeightMm: number; frameWidthMm: number; quantity: number; rate: number; description?: string }) => ({
          frameHeight: it.frameHeightMm,
          frameWidth: it.frameWidthMm,
          quantity: it.quantity,
          rate: it.rate,
          description: it.description,
        })),
        freight,
        discount: discountType !== "NONE" ? { type: discountType, value: discountValue } : undefined,
        state,
      });

      const revision = await prisma.quote.create({
        data: {
          quoteNumber: existing.quoteNumber,
          version: nextVersion,
          status: QuoteStatus.DRAFT,
          parentQuoteId: existing.id,
          revisionNotes: body.revisionNotes || `Revision ${nextVersion} created after edits`,
          customerId: existing.customerId,
          customerName: body.customerName || existing.customerName,
          customerBuilding: body.customerBuilding ?? existing.customerBuilding,
          customerFlat: body.customerFlat ?? existing.customerFlat,
          customerState: state,
          destinationState: state,
          factoryId: body.factoryId ?? existing.factoryId,
          discountType: discountType as DiscountType,
          discountValue,
          freight,
          validUntil: body.validUntil ? new Date(body.validUntil) : existing.validUntil,
          subTotal: calc.totals.subTotal.toNumber(),
          cgstTotal: calc.totals.cgstTotal.toNumber(),
          sgstTotal: calc.totals.sgstTotal.toNumber(),
          igstTotal: calc.totals.igstTotal.toNumber(),
          gstTotal: calc.totals.gstTotal.toNumber(),
          grandTotal: calc.totals.grandTotal.toNumber(),
          roundOff: calc.totals.roundOff.toNumber(),
          displayTotal: calc.totals.displayTotal.toNumber(),
          displayTotalWords: calc.displayTotalWords,
          createdById: session?.id || null,
          items: {
            create: calc.items.map((it, idx) => ({
              itemOrder: idx + 1,
              description: it.description || "Custom Item",
              frameHeightMm: it.frameHeight.toNumber(),
              frameWidthMm: it.frameWidth.toNumber(),
              quantity: it.quantity,
              rate: it.rate.toNumber(),
              roundedHeightMm: it.roundedHeight.toNumber(),
              roundedWidthMm: it.roundedWidth.toNumber(),
              glassCutHeightMm: it.glassCutHeight.toNumber(),
              glassCutWidthMm: it.glassCutWidth.toNumber(),
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
          },
        },
      });

      return NextResponse.json({ quote: revision, revisionCreated: true });
    }

    // Otherwise standard update
    const updateData: Record<string, unknown> = {
      updatedById: session?.id || null,
    };

    if (body.status) updateData.status = body.status as QuoteStatus;
    if (body.customerName) updateData.customerName = body.customerName;
    if (body.customerBuilding !== undefined) updateData.customerBuilding = body.customerBuilding;
    if (body.customerFlat !== undefined) updateData.customerFlat = body.customerFlat;
    if (body.freight !== undefined) updateData.freight = body.freight;
    if (body.discountType) updateData.discountType = body.discountType;
    if (body.discountValue !== undefined) updateData.discountValue = body.discountValue;
    if (body.validUntil) updateData.validUntil = new Date(body.validUntil);
    if (body.notes !== undefined) updateData.notes = body.notes;

    // If items updated in DRAFT mode, recalculate
    if (Array.isArray(body.items)) {
      const state = body.destinationState || existing.destinationState;
      const freight = body.freight !== undefined ? body.freight : existing.freight.toNumber();
      const discountType = body.discountType || existing.discountType;
      const discountValue = body.discountValue !== undefined ? body.discountValue : existing.discountValue.toNumber();

      const calc = calculateQuote({
        items: body.items.map((it: { frameHeightMm: number; frameWidthMm: number; quantity: number; rate: number; description?: string }) => ({
          frameHeight: it.frameHeightMm,
          frameWidth: it.frameWidthMm,
          quantity: it.quantity,
          rate: it.rate,
          description: it.description,
        })),
        freight,
        discount: discountType !== "NONE" ? { type: discountType, value: discountValue } : undefined,
        state,
      });

      updateData.subTotal = calc.totals.subTotal.toNumber();
      updateData.cgstTotal = calc.totals.cgstTotal.toNumber();
      updateData.sgstTotal = calc.totals.sgstTotal.toNumber();
      updateData.igstTotal = calc.totals.igstTotal.toNumber();
      updateData.gstTotal = calc.totals.gstTotal.toNumber();
      updateData.grandTotal = calc.totals.grandTotal.toNumber();
      updateData.roundOff = calc.totals.roundOff.toNumber();
      updateData.displayTotal = calc.totals.displayTotal.toNumber();
      updateData.displayTotalWords = calc.displayTotalWords;

      // Replace items
      await prisma.quoteItem.deleteMany({ where: { quoteId: id } });
      await prisma.quoteItem.createMany({
        data: calc.items.map((it, idx) => ({
          quoteId: id,
          itemOrder: idx + 1,
          description: it.description || "Custom Item",
          frameHeightMm: it.frameHeight.toNumber(),
          frameWidthMm: it.frameWidth.toNumber(),
          quantity: it.quantity,
          rate: it.rate.toNumber(),
          roundedHeightMm: it.roundedHeight.toNumber(),
          roundedWidthMm: it.roundedWidth.toNumber(),
          glassCutHeightMm: it.glassCutHeight.toNumber(),
          glassCutWidthMm: it.glassCutWidth.toNumber(),
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
      });
    }

    const updated = await prisma.quote.update({
      where: { id },
      data: updateData,
      include: { items: true },
    });

    return NextResponse.json({ quote: updated });
  } catch (error) {
    console.error("PATCH /api/quotes/[id] error:", error);
    return NextResponse.json({ error: "Failed to update quote" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (session && !canEditQuotes(session.role)) {
    return NextResponse.json({ error: "Forbidden: Read-only access" }, { status: 403 });
  }

  try {
    const { id } = await params;
    await prisma.quote.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedById: session?.id || null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/quotes/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete quote" }, { status: 500 });
  }
}

