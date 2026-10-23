import { Decimal } from "decimal.js";

const MM_PER_FOOT = new Decimal(304.8);

/**
 * Calculates square feet for a line:
 * sqft = (roundedH / 304.8) * (roundedW / 304.8) * qty
 */
export function calculateSqft(
  roundedHeightMm: Decimal | number | string,
  roundedWidthMm: Decimal | number | string,
  quantity: number
): Decimal {
  const hFeet = new Decimal(roundedHeightMm).div(MM_PER_FOOT);
  const wFeet = new Decimal(roundedWidthMm).div(MM_PER_FOOT);
  return hFeet.times(wFeet).times(quantity);
}

/**
 * Calculates running feet for a line:
 * runningFeet = ((roundedH / 304.8) + (roundedW / 304.8)) * 2 * qty
 */
export function calculateRunningFeet(
  roundedHeightMm: Decimal | number | string,
  roundedWidthMm: Decimal | number | string,
  quantity: number
): Decimal {
  const hFeet = new Decimal(roundedHeightMm).div(MM_PER_FOOT);
  const wFeet = new Decimal(roundedWidthMm).div(MM_PER_FOOT);
  return hFeet.plus(wFeet).times(2).times(quantity);
}

