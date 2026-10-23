import { Decimal } from "decimal.js";

export type DiscountType = "PERCENT" | "FLAT" | "NONE";

export interface Discount {
  type: DiscountType;
  value: Decimal | number | string;
}

export interface CalcSettings {
  roundStep?: Decimal | number | string;
  glassDeduction?: Decimal | number | string;
  gstRate?: Decimal | number | string;
  homeState?: string;
}

export interface ResolvedCalcSettings {
  roundStep: Decimal;
  glassDeduction: Decimal;
  gstRate: Decimal;
  homeState: string;
}

export const DEFAULT_CALC_SETTINGS: ResolvedCalcSettings = {
  roundStep: new Decimal(76.2),
  glassDeduction: new Decimal(7),
  gstRate: new Decimal(18),
  homeState: "Karnataka",
};

export interface QuoteItemInput {
  frameHeight: Decimal | number | string;
  frameWidth: Decimal | number | string;
  quantity: number;
  rate: Decimal | number | string;
  discount?: Discount;
  description?: string;
  productId?: string;
}

export interface QuoteItemCalculated {
  frameHeight: Decimal;
  frameWidth: Decimal;
  quantity: number;
  rate: Decimal;
  discountType: DiscountType;
  discountValue: Decimal;
  roundedHeight: Decimal;
  roundedWidth: Decimal;
  glassCutHeight: Decimal;
  glassCutWidth: Decimal;
  sqft: Decimal;
  runningFeet: Decimal;
  grossAmount: Decimal;
  discountAmount: Decimal;
  netAmount: Decimal;
  taxableAmount: Decimal;
  cgstRate: Decimal;
  sgstRate: Decimal;
  igstRate: Decimal;
  cgstAmount: Decimal;
  sgstAmount: Decimal;
  igstAmount: Decimal;
  gstAmount: Decimal;
  totalAmount: Decimal;
  description?: string;
  productId?: string;
}

export interface QuoteTotals {
  itemGrossTotal: Decimal;
  itemDiscountTotal: Decimal;
  itemNetTotal: Decimal;
  quoteDiscountType: DiscountType;
  quoteDiscountValue: Decimal;
  quoteDiscountAmount: Decimal;
  freight: Decimal;
  subTotal: Decimal;
  cgstTotal: Decimal;
  sgstTotal: Decimal;
  igstTotal: Decimal;
  gstTotal: Decimal;
  grandTotal: Decimal;
  roundOff: Decimal;
  displayTotal: Decimal;
}

export interface QuoteInput {
  items: QuoteItemInput[];
  freight?: Decimal | number | string;
  discount?: Discount;
  state?: string;
}

export interface QuoteCalculationResult {
  items: QuoteItemCalculated[];
  totals: QuoteTotals;
  isInterState: boolean;
  displayTotalWords: string;
  formattedDisplayTotal: string;
}

