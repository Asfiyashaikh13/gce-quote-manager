import { calculateQuote } from "../calc";
import { GroupedQuote, MasterSheetRowData } from "./types";

export function makeGroupKey(client: string, flat: string, building: string): string {
  const c = (client || "").trim().toLowerCase();
  const f = (flat || "").trim().toLowerCase();
  const b = (building || "").trim().toLowerCase();
  return `${c}:::${f}:::${b}`;
}

export function groupRowsByCustomer(rows: MasterSheetRowData[]): GroupedQuote[] {
  const map = new Map<string, MasterSheetRowData[]>();

  for (const row of rows) {
    // Group only valid rows that have at least client or dimensions
    const client = (row.clientName || "Unnamed Client").trim();
    const flat = (row.flat || "").trim();
    const building = (row.building || "").trim();
    const key = makeGroupKey(client, flat, building);

    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key)!.push(row);
  }

  const result: GroupedQuote[] = [];

  for (const [key, groupRows] of map.entries()) {
    if (groupRows.length === 0) continue;

    const first = groupRows[0];
    const clientName = first.clientName || "Unnamed Client";
    const flat = first.flat || "";
    const building = first.building || "";
    const state = first.state || "Karnataka";
    const factory = first.factory || "Veera Glass";
    const status = first.status || "Draft";

    // Compute quote totals using calculation engine
    const quoteCalc = calculateQuote({
      items: groupRows.map((r) => ({
        frameHeight: r.frameHeightMm,
        frameWidth: r.frameWidthMm,
        quantity: r.quantity,
        rate: r.rate,
        discount: r.discountType !== "NONE" ? { type: r.discountType, value: r.discountValue } : undefined,
        description: r.description,
      })),
      state,
    });

    result.push({
      groupKey: key,
      clientName,
      flat,
      building,
      state,
      factory,
      status,
      rowCount: groupRows.length,
      rows: groupRows,
      subTotal: quoteCalc.totals.subTotal,
      cgstTotal: quoteCalc.totals.cgstTotal,
      sgstTotal: quoteCalc.totals.sgstTotal,
      igstTotal: quoteCalc.totals.igstTotal,
      gstTotal: quoteCalc.totals.gstTotal,
      grandTotal: quoteCalc.totals.grandTotal,
      roundOff: quoteCalc.totals.roundOff,
      displayTotal: quoteCalc.totals.displayTotal,
      displayTotalWords: quoteCalc.displayTotalWords,
    });
  }

  return result;
}

