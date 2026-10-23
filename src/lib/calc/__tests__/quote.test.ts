import { describe, expect, it } from "vitest";
import fc from "fast-check";
import Decimal from "decimal.js";
import { calculateQuote, calculateQuoteItem } from "../quote";
import { QuoteItemInput } from "../types";

describe("calculateQuoteItem", () => {
  it("calculates netAmount = sqft * rate rounded to 2 decimals half-up per line (9.375 * 565 -> 5296.88)", () => {
    const item = calculateQuoteItem({
      frameHeight: 1850,
      frameWidth: 415,
      quantity: 1,
      rate: 565,
    });

    expect(item.roundedHeight.toNumber()).toBe(1905);
    expect(item.roundedWidth.toNumber()).toBe(457.2);
    expect(item.sqft.toNumber()).toBe(9.375);
    expect(item.netAmount.toString()).toBe("5296.88");
  });

  it("calculates Karnataka state GST split into CGST 9% + SGST 9%", () => {
    const item = calculateQuoteItem(
      {
        frameHeight: 1850,
        frameWidth: 415,
        quantity: 1,
        rate: 565,
      },
      "Karnataka"
    );

    // 5296.88 * 18% = 953.4384 -> 953.44 total gst
    // split into CGST 476.72 + SGST 476.72
    expect(item.gstAmount.toString()).toBe("953.44");
    expect(item.cgstAmount.toString()).toBe("476.72");
    expect(item.sgstAmount.toString()).toBe("476.72");
    expect(item.igstAmount.toString()).toBe("0");
    expect(item.cgstRate.toString()).toBe("9");
    expect(item.sgstRate.toString()).toBe("9");
    expect(item.igstRate.toString()).toBe("0");
  });

  it("calculates non-Karnataka state GST as IGST 18%", () => {
    const item = calculateQuoteItem(
      {
        frameHeight: 1850,
        frameWidth: 415,
        quantity: 1,
        rate: 565,
      },
      "Maharashtra"
    );

    expect(item.gstAmount.toString()).toBe("953.44");
    expect(item.cgstAmount.toString()).toBe("0");
    expect(item.sgstAmount.toString()).toBe("0");
    expect(item.igstAmount.toString()).toBe("953.44");
    expect(item.igstRate.toString()).toBe("18");
  });

  it("supports line discount (percent and flat)", () => {
    // Percent discount: 10% off
    const percentItem = calculateQuoteItem({
      frameHeight: 304.8,
      frameWidth: 304.8,
      quantity: 1,
      rate: 1000,
      discount: { type: "PERCENT", value: 10 },
    });
    // sqft = 1, gross = 1000, discount = 100, net = 900
    expect(percentItem.grossAmount.toString()).toBe("1000");
    expect(percentItem.discountAmount.toString()).toBe("100");
    expect(percentItem.netAmount.toString()).toBe("900");

    // Flat discount: 150 off
    const flatItem = calculateQuoteItem({
      frameHeight: 304.8,
      frameWidth: 304.8,
      quantity: 1,
      rate: 1000,
      discount: { type: "FLAT", value: 150 },
    });
    expect(flatItem.discountAmount.toString()).toBe("150");
    expect(flatItem.netAmount.toString()).toBe("850");
  });
});

describe("calculateQuote", () => {
  it("passes the seed-check test with exact expected totals for the 7 lines", () => {
    const lines: QuoteItemInput[] = [
      { frameHeight: 1850, frameWidth: 415, quantity: 1, rate: 565 },
      { frameHeight: 290, frameWidth: 495, quantity: 1, rate: 565 },
      { frameHeight: 295, frameWidth: 420, quantity: 2, rate: 430 },
      { frameHeight: 295, frameWidth: 585, quantity: 2, rate: 430 },
      { frameHeight: 1300, frameWidth: 473, quantity: 2, rate: 565 },
      { frameHeight: 913, frameWidth: 530, quantity: 3, rate: 135 },
      { frameHeight: 550, frameWidth: 550, quantity: 2, rate: 145 },
    ];

    const result = calculateQuote({
      items: lines,
      state: "Karnataka",
    });

    // Expected: Sub Total 21,480.63, GST 3,866.53, Grand Total 25,347.16, displayed 25,347
    expect(result.totals.subTotal.toString()).toBe("21480.63");
    expect(result.totals.gstTotal.toString()).toBe("3866.53");
    expect(result.totals.grandTotal.toString()).toBe("25347.16");
    expect(result.totals.displayTotal.toString()).toBe("25347");
    expect(result.totals.roundOff.toString()).toBe("-0.16");
    expect(result.displayTotalWords).toBe(
      "Indian Rupee Twenty Five Thousand Three Hundred And Forty Seven Only"
    );
    expect(result.formattedDisplayTotal).toBe("₹25,347");
  });

  it("applies quote-level discount before GST and includes freight in subtotal", () => {
    const result = calculateQuote({
      items: [{ frameHeight: 304.8, frameWidth: 304.8, quantity: 1, rate: 1000 }],
      discount: { type: "PERCENT", value: 10 }, // 10% off 1000 = 100
      freight: 50,
      state: "Karnataka",
    });

    // Item net: 1000. Quote discount: 100. Taxable: 900.
    // Freight: 50. Sub Total: 900 + 50 = 950.
    // GST (18% of 900) = 162.00 (CGST 81, SGST 81).
    // Grand Total: 950 + 162 = 1112.00. Display: 1112.
    expect(result.totals.itemNetTotal.toString()).toBe("1000");
    expect(result.totals.quoteDiscountAmount.toString()).toBe("100");
    expect(result.totals.freight.toString()).toBe("50");
    expect(result.totals.subTotal.toString()).toBe("950");
    expect(result.totals.gstTotal.toString()).toBe("162");
    expect(result.totals.grandTotal.toString()).toBe("1112");
    expect(result.totals.displayTotal.toString()).toBe("1112");
  });

  it("satisfies property-based invariant: sum of lines equals totals (fast-check)", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            frameHeight: fc.integer({ min: 100, max: 3000 }),
            frameWidth: fc.integer({ min: 100, max: 3000 }),
            quantity: fc.integer({ min: 1, max: 20 }),
            rate: fc.integer({ min: 50, max: 2000 }),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        fc.integer({ min: 0, max: 1000 }), // freight
        fc.boolean(), // isKarnataka
        (rawItems, freight, isKarnataka) => {
          const quote = calculateQuote({
            items: rawItems,
            freight,
            state: isKarnataka ? "Karnataka" : "Tamil Nadu",
          });

          const { totals, items } = quote;

          // 1. sum(line net) + freight === subTotal
          const sumLineNet = items.reduce((acc, it) => acc.plus(it.netAmount), new Decimal(0));
          expect(sumLineNet.plus(freight).toString()).toBe(totals.subTotal.toString());

          // 2. sum(line gst) === gstTotal
          const sumLineGst = items.reduce((acc, it) => acc.plus(it.gstAmount), new Decimal(0));
          expect(sumLineGst.toString()).toBe(totals.gstTotal.toString());

          // 3. subTotal + gstTotal === grandTotal
          expect(totals.subTotal.plus(totals.gstTotal).toString()).toBe(totals.grandTotal.toString());

          // 4. grandTotal + roundOff === displayTotal
          expect(totals.grandTotal.plus(totals.roundOff).toString()).toBe(totals.displayTotal.toString());

          // 5. displayTotal has zero decimal places
          expect(totals.displayTotal.decimalPlaces()).toBe(0);

          // 6. CGST + SGST + IGST === gstTotal
          expect(totals.cgstTotal.plus(totals.sgstTotal).plus(totals.igstTotal).toString()).toBe(
            totals.gstTotal.toString()
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});

