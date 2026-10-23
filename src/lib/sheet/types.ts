import { Decimal } from "decimal.js";

export interface MasterSheetRowData {
  id: string;
  rowOrder: number;
  clientName: string;
  flat: string;
  building: string;
  state: string;
  factory: string;
  status: string;
  notes: string;
  productId: string;
  description: string;
  frameHeightMm: number;
  frameWidthMm: number;
  quantity: number;
  rate: number;
  discountType: "PERCENT" | "FLAT" | "NONE";
  discountValue: number;

  // Computed
  roundedHeightMm: number;
  roundedWidthMm: number;
  glassCutHeightMm: number;
  glassCutWidthMm: number;
  sqft: number;
  runningFeet: number;
  netAmount: number;
  gstAmount: number;
  totalAmount: number;
}

export interface GroupedQuote {
  groupKey: string;
  clientName: string;
  flat: string;
  building: string;
  state: string;
  factory: string;
  status: string;
  rowCount: number;
  rows: MasterSheetRowData[];
  subTotal: Decimal;
  cgstTotal: Decimal;
  sgstTotal: Decimal;
  igstTotal: Decimal;
  gstTotal: Decimal;
  grandTotal: Decimal;
  roundOff: Decimal;
  displayTotal: Decimal;
  displayTotalWords: string;
}

