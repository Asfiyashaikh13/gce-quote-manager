import { describe, expect, it } from "vitest";
import { formatQuoteNumber, formatDateForQuoteNumber } from "../numbering";
import { isValidStatusTransition } from "../status";
import { computeQuoteDiff, ItemSnapshot } from "../revisions";
import { generateWhatsAppShareUrl } from "../whatsapp";
import { QuoteStatus } from "@prisma/client";

describe("Quote Numbering", () => {
  it("formats quote numbers as QT-DDMMYY-NN", () => {
    const formatted = formatQuoteNumber("241026", 1);
    expect(formatted).toBe("QT-241026-01");

    const formatted2 = formatQuoteNumber("241026", 12);
    expect(formatted2).toBe("QT-241026-12");
  });

  it("formats date prefix correctly", () => {
    const date = new Date("2026-10-24T12:00:00Z");
    const prefix = formatDateForQuoteNumber(date);
    expect(prefix).toBe("241026");
  });
});

describe("Status Transitions", () => {
  it("allows legal quote transitions", () => {
    expect(isValidStatusTransition(QuoteStatus.DRAFT, QuoteStatus.SENT)).toBe(true);
    expect(isValidStatusTransition(QuoteStatus.SENT, QuoteStatus.APPROVED)).toBe(true);
    expect(isValidStatusTransition(QuoteStatus.APPROVED, QuoteStatus.IN_PRODUCTION)).toBe(true);
    expect(isValidStatusTransition(QuoteStatus.IN_PRODUCTION, QuoteStatus.DELIVERED)).toBe(true);
    expect(isValidStatusTransition(QuoteStatus.DELIVERED, QuoteStatus.PAID)).toBe(true);
    expect(isValidStatusTransition(QuoteStatus.DRAFT, QuoteStatus.CANCELLED)).toBe(true);
  });

  it("blocks illegal status transitions", () => {
    expect(isValidStatusTransition(QuoteStatus.DRAFT, QuoteStatus.PAID)).toBe(false);
    expect(isValidStatusTransition(QuoteStatus.PAID, QuoteStatus.DRAFT)).toBe(false);
    expect(isValidStatusTransition(QuoteStatus.DRAFT, QuoteStatus.DELIVERED)).toBe(false);
  });
});

describe("Quote Revision Diffing", () => {
  it("calculates accurate diff between quote versions", () => {
    const v1Items: ItemSnapshot[] = [
      {
        description: "Al Shutters 565",
        frameHeightMm: 1850,
        frameWidthMm: 415,
        quantity: 1,
        rate: 565,
        netAmount: 5296.88,
        totalAmount: 6250.32,
      },
      {
        description: "8mm plain glass",
        frameHeightMm: 913,
        frameWidthMm: 530,
        quantity: 3,
        rate: 135,
        netAmount: 2126.25,
        totalAmount: 2508.98,
      },
    ];

    const v2Items: ItemSnapshot[] = [
      {
        description: "Al Shutters 565",
        frameHeightMm: 1850,
        frameWidthMm: 415,
        quantity: 1,
        rate: 590, // Rate changed
        netAmount: 5531.25,
        totalAmount: 6526.88,
      },
      // 8mm plain glass removed, new item added
      {
        description: "5mm mirror polished",
        frameHeightMm: 550,
        frameWidthMm: 550,
        quantity: 2,
        rate: 145,
        netAmount: 1160,
        totalAmount: 1368.8,
      },
    ];

    const diff = computeQuoteDiff(v1Items, v2Items, 8759.3, 7895.68);
    expect(diff.modifiedRows).toHaveLength(1);
    expect(diff.modifiedRows[0].description).toBe("Al Shutters 565");
    expect(diff.modifiedRows[0].oldRate).toBe(565);
    expect(diff.modifiedRows[0].newRate).toBe(590);

    expect(diff.removedRows).toHaveLength(1);
    expect(diff.removedRows[0].description).toBe("8mm plain glass");

    expect(diff.addedRows).toHaveLength(1);
    expect(diff.addedRows[0].description).toBe("5mm mirror polished");

    expect(diff.totalDifference).toBeCloseTo(7895.68 - 8759.3, 2);
  });
});

describe("WhatsApp Sharing Link", () => {
  it("generates wa.me link with encoded details", () => {
    const url = generateWhatsAppShareUrl({
      quoteNumber: "QT-241026-01",
      customerName: "Mr. Fayaz",
      displayTotal: 25347,
      itemCount: 7,
    });

    expect(url).toContain("https://wa.me/?text=");
    expect(url).toContain(encodeURIComponent("QT-241026-01"));
    expect(url).toContain(encodeURIComponent("Mr. Fayaz"));
    expect(url).toContain(encodeURIComponent("₹25,347"));
  });
});

