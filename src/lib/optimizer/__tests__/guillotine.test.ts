import { describe, it, expect } from "vitest";
import {
  optimizeCuttingPlan,
  generateSheetSvg,
  StockSheet,
  PieceToCut,
  PlacedPiece,
} from "../guillotine";

describe("Guillotine Sheet Cutting Optimizer", () => {
  const standardStock: StockSheet = {
    width: 2440,
    height: 1830,
    label: "Standard Float (2440x1830)",
  };

  function checkNoOverlaps(placed: PlacedPiece[]) {
    for (let i = 0; i < placed.length; i++) {
      for (let j = i + 1; j < placed.length; j++) {
        const a = placed[i];
        const b = placed[j];

        const noOverlap =
          a.x + a.width <= b.x ||
          b.x + b.width <= a.x ||
          a.y + a.height <= b.y ||
          b.y + b.height <= a.y;

        expect(
          noOverlap,
          `Pieces ${a.id} [${a.x}, ${a.y}, ${a.width}, ${a.height}] and ${b.id} [${b.x}, ${b.y}, ${b.width}, ${b.height}] overlap!`
        ).toBe(true);
      }
    }
  }

  function checkInsideBounds(placed: PlacedPiece[], sheetW: number, sheetH: number) {
    for (const p of placed) {
      expect(p.x, `Piece ${p.id} x is negative: ${p.x}`).toBeGreaterThanOrEqual(0);
      expect(p.y, `Piece ${p.id} y is negative: ${p.y}`).toBeGreaterThanOrEqual(0);
      expect(p.x + p.width, `Piece ${p.id} exceeds width: ${p.x + p.width} > ${sheetW}`).toBeLessThanOrEqual(sheetW);
      expect(p.y + p.height, `Piece ${p.id} exceeds height: ${p.y + p.height} > ${sheetH}`).toBeLessThanOrEqual(sheetH);
    }
  }

  it("places single piece inside sheet bounds", () => {
    const items: PieceToCut[] = [
      { id: "p1", label: "Window A", width: 1000, height: 800, qty: 1 },
    ];

    const result = optimizeCuttingPlan(standardStock, items);
    expect(result.totalSheets).toBe(1);
    expect(result.totalPiecesPlaced).toBe(1);
    expect(result.sheets[0].placedPieces.length).toBe(1);

    checkInsideBounds(result.sheets[0].placedPieces, 2440, 1830);
    checkNoOverlaps(result.sheets[0].placedPieces);
  });

  it("places all pieces without overlaps and inside bounds", () => {
    const items: PieceToCut[] = [
      { id: "p1", label: "Shutter 1", width: 1843, height: 408, qty: 2 },
      { id: "p2", label: "Shutter 2", width: 288, height: 488, qty: 2 },
      { id: "p3", label: "Shutter 3", width: 288, height: 413, qty: 4 },
      { id: "p4", label: "Window", width: 1293, height: 466, qty: 2 },
      { id: "p5", label: "Mirror", width: 543, height: 543, qty: 2 },
    ];

    const totalQty = items.reduce((sum, i) => sum + i.qty, 0);

    const result = optimizeCuttingPlan(standardStock, items, { allowRotation: true });

    expect(result.totalPiecesRequired).toBe(totalQty);
    expect(result.totalPiecesPlaced).toBe(totalQty);
    expect(result.totalSheets).toBeGreaterThanOrEqual(1);

    for (const sheet of result.sheets) {
      checkInsideBounds(sheet.placedPieces, sheet.sheetWidth, sheet.sheetHeight);
      checkNoOverlaps(sheet.placedPieces);
    }
  });

  it("supports piece rotation to fit pieces that only fit when rotated", () => {
    // Sheet is 2440 x 1830.
    // Piece is 2000 mm in height, 1200 mm in width.
    // Without rotation: height 2000 > 1830 -> DOES NOT FIT unrotated.
    // With rotation: rotated to 1200 x 2000 (width 2000 <= 2440, height 1200 <= 1830) -> FITS.
    const tallPiece: PieceToCut[] = [
      { id: "tall-1", label: "Tall Glass", width: 1200, height: 2000, qty: 1 },
    ];

    // With rotation allowed
    const resultRotated = optimizeCuttingPlan(standardStock, tallPiece, { allowRotation: true });
    expect(resultRotated.totalPiecesPlaced).toBe(1);
    expect(resultRotated.sheets[0].placedPieces[0].rotated).toBe(true);
    expect(resultRotated.sheets[0].placedPieces[0].width).toBe(2000);
    expect(resultRotated.sheets[0].placedPieces[0].height).toBe(1200);

    // Without rotation allowed
    const resultNoRotation = optimizeCuttingPlan(standardStock, tallPiece, { allowRotation: false });
    expect(resultNoRotation.totalPiecesPlaced).toBe(0);
    expect(resultNoRotation.unplacedPieces.length).toBe(1);
  });

  it("calculates accurate sheet count and wastage percentage", () => {
    // 2 pieces of 1220 x 915 on 2440 x 1830
    // Total stock area = 2440 * 1830 = 4,465,200 mm²
    // Each piece area = 1220 * 915 = 1,116,300 mm²
    // 2 pieces area = 2,232,600 mm² = exactly 50% of 1 sheet
    const items: PieceToCut[] = [
      { id: "half-1", label: "Quarter Piece", width: 1220, height: 915, qty: 2 },
    ];

    const result = optimizeCuttingPlan(standardStock, items);
    expect(result.totalSheets).toBe(1);
    expect(result.totalGlassAreaMm2).toBe(2232600);
    expect(result.totalStockAreaMm2).toBe(4465200);
    expect(result.overallWastagePercent).toBe(50.0);
    expect(result.sheets[0].wastagePercent).toBe(50.0);
  });

  it("spans across multiple sheets when items exceed 1 sheet capacity", () => {
    // 4 large pieces of 2000 x 1000
    // Each sheet can fit only one 2000x1000 (since 2 would require 2000 height or 4000 width)
    const items: PieceToCut[] = [
      { id: "large", label: "Large Panel", width: 2000, height: 1000, qty: 4 },
    ];

    const result = optimizeCuttingPlan(standardStock, items, { allowRotation: true });
    expect(result.totalPiecesPlaced).toBe(4);
    expect(result.totalSheets).toBeGreaterThanOrEqual(4);

    for (const sheet of result.sheets) {
      checkInsideBounds(sheet.placedPieces, sheet.sheetWidth, sheet.sheetHeight);
      checkNoOverlaps(sheet.placedPieces);
    }
  });

  it("generates valid SVG layout representation", () => {
    const items: PieceToCut[] = [
      { id: "p1", label: "Glass 1", width: 800, height: 600, qty: 2 },
    ];

    const result = optimizeCuttingPlan(standardStock, items);
    const svg = generateSheetSvg(result.sheets[0], { displayWidth: 600 });

    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
    expect(svg).toContain("data-id=\"p1-1\"");
    expect(svg).toContain("Glass 1");
  });
});

