import { FactoryCutItem, FactoryGroup, GlassTypeGroup } from "./types";
import { MasterSheetRowData } from "../sheet/types";

export function groupRowsForFactory(rows: MasterSheetRowData[]): FactoryGroup[] {
  const factoryMap = new Map<string, Map<string, FactoryCutItem[]>>();

  for (const r of rows) {
    if (!r.frameHeightMm || !r.frameWidthMm) continue;

    const factory = (r.factory || "Unassigned").trim();
    const glassType = (r.description || "Glass / Shutter").trim();

    if (!factoryMap.has(factory)) {
      factoryMap.set(factory, new Map<string, FactoryCutItem[]>());
    }

    const typeMap = factoryMap.get(factory)!;
    if (!typeMap.has(glassType)) {
      typeMap.set(glassType, []);
    }

    typeMap.get(glassType)!.push({
      id: r.id,
      clientName: r.clientName || "Client",
      flat: r.flat || "",
      building: r.building || "",
      productName: glassType,
      glassCutHeightMm: r.glassCutHeightMm || Math.max(0, r.frameHeightMm - 7),
      glassCutWidthMm: r.glassCutWidthMm || Math.max(0, r.frameWidthMm - 7),
      frameHeightMm: r.frameHeightMm,
      frameWidthMm: r.frameWidthMm,
      quantity: r.quantity || 1,
      sqft: r.sqft || 0,
      status: r.status || "Draft",
      notes: r.notes || "",
    });
  }

  const result: FactoryGroup[] = [];

  for (const [factoryName, typeMap] of factoryMap.entries()) {
    const glassTypes: GlassTypeGroup[] = [];
    let factoryPieces = 0;
    let factorySqft = 0;

    for (const [glassType, items] of typeMap.entries()) {
      const typePieces = items.reduce((acc, i) => acc + i.quantity, 0);
      const typeSqft = items.reduce((acc, i) => acc + i.sqft, 0);

      factoryPieces += typePieces;
      factorySqft += typeSqft;

      glassTypes.push({
        glassType,
        items,
        totalPieces: typePieces,
        totalSqft: Number(typeSqft.toFixed(2)),
      });
    }

    result.push({
      factoryName,
      glassTypes,
      totalPieces: factoryPieces,
      totalSqft: Number(factorySqft.toFixed(2)),
    });
  }

  // Sort factories by name
  return result.sort((a, b) => a.factoryName.localeCompare(b.factoryName));
}

/**
 * Generates plain-text WhatsApp formatted message for factory cutting order
 */
export function formatFactoryWhatsAppText(factory: FactoryGroup): string {
  const dateStr = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  let text = `*FACTORY CUTTING ORDER*\n`;
  text += `*Factory:* ${factory.factoryName}\n`;
  text += `*Date:* ${dateStr}\n`;
  text += `*Total Pieces:* ${factory.totalPieces} | *Total Area:* ${factory.totalSqft} sq.ft\n`;
  text += `------------------------------------\n\n`;

  factory.glassTypes.forEach((gt) => {
    text += `*GLASS TYPE / PRODUCT: ${gt.glassType.toUpperCase()}*\n`;
    text += `Subtotal: ${gt.totalPieces} pcs (${gt.totalSqft} sqft)\n\n`;

    gt.items.forEach((item, idx) => {
      const location = [item.clientName, item.building, item.flat ? `Flat ${item.flat}` : ""]
        .filter(Boolean)
        .join(" - ");

      text += `${idx + 1}) *${item.glassCutHeightMm} x ${item.glassCutWidthMm} mm* (Qty: ${item.quantity})\n`;
      text += `   Frame: ${item.frameHeightMm} x ${item.frameWidthMm} mm\n`;
      if (location) {
        text += `   Tag: ${location}\n`;
      }
      if (item.notes) {
        text += `   Notes: ${item.notes}\n`;
      }
      text += `\n`;
    });

    text += `------------------------------------\n\n`;
  });

  text += `*Glass Care Enterprises - Cutting Indent*`;
  return text;
}
