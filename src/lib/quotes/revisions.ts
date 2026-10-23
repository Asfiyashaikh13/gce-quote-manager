import { Decimal } from "decimal.js";

export interface ItemSnapshot {
  id?: string;
  description: string;
  frameHeightMm: number;
  frameWidthMm: number;
  quantity: number;
  rate: number;
  netAmount: number;
  totalAmount: number;
}

export interface QuoteDiffResult {
  addedRows: ItemSnapshot[];
  removedRows: ItemSnapshot[];
  modifiedRows: Array<{
    description: string;
    oldRate: number;
    newRate: number;
    oldQty: number;
    newQty: number;
    oldTotal: number;
    newTotal: number;
  }>;
  totalDifference: number;
  oldTotal: number;
  newTotal: number;
}

export function computeQuoteDiff(
  oldItems: ItemSnapshot[],
  newItems: ItemSnapshot[],
  oldGrandTotal: number | Decimal,
  newGrandTotal: number | Decimal
): QuoteDiffResult {
  const addedRows: ItemSnapshot[] = [];
  const removedRows: ItemSnapshot[] = [];
  const modifiedRows: QuoteDiffResult["modifiedRows"] = [];

  const oldMap = new Map(oldItems.map((it, idx) => [`${it.description}-${idx}`, it]));
  const newMap = new Map(newItems.map((it, idx) => [`${it.description}-${idx}`, it]));

  // Find added and modified
  newItems.forEach((newItem, idx) => {
    const key = `${newItem.description}-${idx}`;
    const oldItem = oldMap.get(key);

    if (!oldItem) {
      addedRows.push(newItem);
    } else {
      if (
        oldItem.rate !== newItem.rate ||
        oldItem.quantity !== newItem.quantity ||
        oldItem.frameHeightMm !== newItem.frameHeightMm ||
        oldItem.frameWidthMm !== newItem.frameWidthMm
      ) {
        modifiedRows.push({
          description: newItem.description,
          oldRate: oldItem.rate,
          newRate: newItem.rate,
          oldQty: oldItem.quantity,
          newQty: newItem.quantity,
          oldTotal: oldItem.totalAmount,
          newTotal: newItem.totalAmount,
        });
      }
    }
  });

  // Find removed
  oldItems.forEach((oldItem, idx) => {
    const key = `${oldItem.description}-${idx}`;
    if (!newMap.has(key)) {
      removedRows.push(oldItem);
    }
  });

  const dOld = new Decimal(oldGrandTotal);
  const dNew = new Decimal(newGrandTotal);
  const totalDifference = dNew.minus(dOld).toNumber();

  return {
    addedRows,
    removedRows,
    modifiedRows,
    totalDifference,
    oldTotal: dOld.toNumber(),
    newTotal: dNew.toNumber(),
  };
}

