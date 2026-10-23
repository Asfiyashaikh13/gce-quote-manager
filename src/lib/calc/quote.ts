import { Decimal } from "decimal.js";
import {
  CalcSettings,
  DEFAULT_CALC_SETTINGS,
  Discount,
  DiscountType,
  QuoteCalculationResult,
  QuoteInput,
  QuoteItemCalculated,
  QuoteItemInput,
  QuoteTotals,
  ResolvedCalcSettings,
} from "./types";
import { glassCutDimensions, roundUp } from "./round";
import { calculateRunningFeet, calculateSqft } from "./dimensions";
import { formatIndianCurrency, numberToIndianWords } from "./currency";

export function resolveSettings(settings?: CalcSettings): ResolvedCalcSettings {
  return {
    roundStep: settings?.roundStep !== undefined ? new Decimal(settings.roundStep) : DEFAULT_CALC_SETTINGS.roundStep,
    glassDeduction:
      settings?.glassDeduction !== undefined
        ? new Decimal(settings.glassDeduction)
        : DEFAULT_CALC_SETTINGS.glassDeduction,
    gstRate: settings?.gstRate !== undefined ? new Decimal(settings.gstRate) : DEFAULT_CALC_SETTINGS.gstRate,
    homeState: settings?.homeState ?? DEFAULT_CALC_SETTINGS.homeState,
  };
}

function calculateDiscountAmount(
  baseAmount: Decimal,
  discount?: Discount
): { discountType: DiscountType; discountValue: Decimal; discountAmount: Decimal } {
  if (!discount || discount.type === "NONE") {
    return {
      discountType: "NONE",
      discountValue: new Decimal(0),
      discountAmount: new Decimal(0),
    };
  }

  const dVal = new Decimal(discount.value);
  let amount = new Decimal(0);

  if (discount.type === "PERCENT") {
    amount = baseAmount.times(dVal).div(100).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  } else if (discount.type === "FLAT") {
    amount = dVal.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  }

  // Discount cannot exceed base amount
  if (amount.greaterThan(baseAmount)) {
    amount = baseAmount;
  }

  return {
    discountType: discount.type,
    discountValue: dVal,
    discountAmount: amount,
  };
}

/**
 * Calculates a single quote line item without quote-level discount.
 */
export function calculateQuoteItem(
  item: QuoteItemInput,
  destinationState?: string,
  settings?: CalcSettings
): QuoteItemCalculated {
  const resolved = resolveSettings(settings);
  const frameHeight = new Decimal(item.frameHeight);
  const frameWidth = new Decimal(item.frameWidth);
  const rate = new Decimal(item.rate);
  const quantity = item.quantity;

  const roundedHeight = roundUp(frameHeight, resolved.roundStep);
  const roundedWidth = roundUp(frameWidth, resolved.roundStep);
  const { height: glassCutHeight, width: glassCutWidth } = glassCutDimensions(
    frameHeight,
    frameWidth,
    resolved.glassDeduction
  );

  const sqft = calculateSqft(roundedHeight, roundedWidth, quantity);
  const runningFeet = calculateRunningFeet(roundedHeight, roundedWidth, quantity);

  // Line gross = sqft * rate (unrounded intermediate before line discount)
  const grossAmount = sqft.times(rate);

  // Line discount
  const { discountType, discountValue, discountAmount } = calculateDiscountAmount(grossAmount, item.discount);
  const netAmount = grossAmount.minus(discountAmount).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  const taxableAmount = netAmount;

  // GST Calculation
  const isHomeState = destinationState
    ? destinationState.trim().toLowerCase() === resolved.homeState.trim().toLowerCase()
    : true;

  const gstRate = resolved.gstRate;
  const gstAmount = taxableAmount.times(gstRate).div(100).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

  let cgstRate = new Decimal(0);
  let sgstRate = new Decimal(0);
  let igstRate = new Decimal(0);
  let cgstAmount = new Decimal(0);
  let sgstAmount = new Decimal(0);
  let igstAmount = new Decimal(0);

  if (isHomeState) {
    cgstRate = gstRate.div(2);
    sgstRate = gstRate.div(2);
    cgstAmount = gstAmount.div(2).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    sgstAmount = gstAmount.minus(cgstAmount);
  } else {
    igstRate = gstRate;
    igstAmount = gstAmount;
  }

  const totalAmount = netAmount.plus(gstAmount);

  return {
    frameHeight,
    frameWidth,
    quantity,
    rate,
    discountType,
    discountValue,
    roundedHeight,
    roundedWidth,
    glassCutHeight,
    glassCutWidth,
    sqft,
    runningFeet,
    grossAmount,
    discountAmount,
    netAmount,
    taxableAmount,
    cgstRate,
    sgstRate,
    igstRate,
    cgstAmount,
    sgstAmount,
    igstAmount,
    gstAmount,
    totalAmount,
    description: item.description,
    productId: item.productId,
  };
}

/**
 * Calculates a full quote including quote-level discount, freight, GST, and rounded totals.
 */
export function calculateQuote(
  quote: QuoteInput,
  settings?: CalcSettings
): QuoteCalculationResult {
  const resolved = resolveSettings(settings);
  const destinationState = quote.state ?? resolved.homeState;
  const isHomeState = destinationState.trim().toLowerCase() === resolved.homeState.trim().toLowerCase();
  const freight = quote.freight !== undefined ? new Decimal(quote.freight) : new Decimal(0);

  // 1. Initial line item calculations (without quote-level discount)
  const preliminaryItems = quote.items.map((item) => calculateQuoteItem(item, destinationState, settings));

  const itemGrossTotal = preliminaryItems.reduce((acc, it) => acc.plus(it.grossAmount), new Decimal(0));
  const itemDiscountTotal = preliminaryItems.reduce((acc, it) => acc.plus(it.discountAmount), new Decimal(0));
  const itemNetTotal = preliminaryItems.reduce((acc, it) => acc.plus(it.netAmount), new Decimal(0));

  // 2. Quote-level discount
  const { discountType: quoteDiscountType, discountValue: quoteDiscountValue, discountAmount: quoteDiscountAmount } =
    calculateDiscountAmount(itemNetTotal, quote.discount);

  // 3. If there is a quote-level discount, distribute it proportionally across items before calculating GST
  let items: QuoteItemCalculated[];

  if (quoteDiscountAmount.isZero() || itemNetTotal.isZero()) {
    items = preliminaryItems;
  } else {
    let distributedDiscountAcc = new Decimal(0);

    items = preliminaryItems.map((item, index) => {
      let itemQuoteDiscountShare: Decimal;
      if (index === preliminaryItems.length - 1) {
        // Last item absorbs any 1-paisa rounding remainder
        itemQuoteDiscountShare = quoteDiscountAmount.minus(distributedDiscountAcc);
      } else {
        itemQuoteDiscountShare = quoteDiscountAmount
          .times(item.netAmount)
          .div(itemNetTotal)
          .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
        distributedDiscountAcc = distributedDiscountAcc.plus(itemQuoteDiscountShare);
      }

      const taxableAmount = item.netAmount.minus(itemQuoteDiscountShare);
      const gstRate = resolved.gstRate;
      const gstAmount = taxableAmount.times(gstRate).div(100).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

      let cgstRate = new Decimal(0);
      let sgstRate = new Decimal(0);
      let igstRate = new Decimal(0);
      let cgstAmount = new Decimal(0);
      let sgstAmount = new Decimal(0);
      let igstAmount = new Decimal(0);

      if (isHomeState) {
        cgstRate = gstRate.div(2);
        sgstRate = gstRate.div(2);
        cgstAmount = gstAmount.div(2).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
        sgstAmount = gstAmount.minus(cgstAmount);
      } else {
        igstRate = gstRate;
        igstAmount = gstAmount;
      }

      const totalAmount = item.netAmount.plus(gstAmount);

      return {
        ...item,
        taxableAmount,
        cgstRate,
        sgstRate,
        igstRate,
        cgstAmount,
        sgstAmount,
        igstAmount,
        gstAmount,
        totalAmount,
      };
    });
  }

  // 4. Totals
  // subTotal = sum(line net) - quoteDiscount + freight
  const subTotal = itemNetTotal.minus(quoteDiscountAmount).plus(freight);

  const cgstTotal = items.reduce((acc, it) => acc.plus(it.cgstAmount), new Decimal(0));
  const sgstTotal = items.reduce((acc, it) => acc.plus(it.sgstAmount), new Decimal(0));
  const igstTotal = items.reduce((acc, it) => acc.plus(it.igstAmount), new Decimal(0));
  const gstTotal = items.reduce((acc, it) => acc.plus(it.gstAmount), new Decimal(0));

  const grandTotal = subTotal.plus(gstTotal);
  const displayTotal = grandTotal.round();
  const roundOff = displayTotal.minus(grandTotal);

  const totals: QuoteTotals = {
    itemGrossTotal,
    itemDiscountTotal,
    itemNetTotal,
    quoteDiscountType,
    quoteDiscountValue,
    quoteDiscountAmount,
    freight,
    subTotal,
    cgstTotal,
    sgstTotal,
    igstTotal,
    gstTotal,
    grandTotal,
    roundOff,
    displayTotal,
  };

  const displayTotalWords = numberToIndianWords(displayTotal);
  const formattedDisplayTotal = formatIndianCurrency(displayTotal);

  return {
    items,
    totals,
    isInterState: !isHomeState,
    displayTotalWords,
    formattedDisplayTotal,
  };
}

