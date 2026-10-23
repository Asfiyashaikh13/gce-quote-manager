import { Decimal } from "decimal.js";
import { DEFAULT_CALC_SETTINGS } from "./types";

/**
 * Rounds up a dimension to the nearest multiple of roundStep (default: 76.2 mm).
 * roundUp(frameMm) = ceil(frame / roundStep) * roundStep
 */
export function roundUp(
  frameMm: Decimal | number | string,
  roundStep: Decimal | number | string = DEFAULT_CALC_SETTINGS.roundStep
): Decimal {
  const dFrame = new Decimal(frameMm);
  const dStep = new Decimal(roundStep);

  if (dStep.isZero()) {
    return dFrame;
  }

  return dFrame.div(dStep).ceil().times(dStep);
}

/**
 * Calculates glass cut size: frame - glassDeduction (default: 7 mm).
 */
export function glassCut(
  frameMm: Decimal | number | string,
  deduction: Decimal | number | string = DEFAULT_CALC_SETTINGS.glassDeduction
): Decimal {
  const dFrame = new Decimal(frameMm);
  const dDeduction = new Decimal(deduction);
  return dFrame.minus(dDeduction);
}

/**
 * Calculates glass cut dimensions for height and width.
 */
export function glassCutDimensions(
  heightMm: Decimal | number | string,
  widthMm: Decimal | number | string,
  deduction: Decimal | number | string = DEFAULT_CALC_SETTINGS.glassDeduction
): { height: Decimal; width: Decimal } {
  return {
    height: glassCut(heightMm, deduction),
    width: glassCut(widthMm, deduction),
  };
}

