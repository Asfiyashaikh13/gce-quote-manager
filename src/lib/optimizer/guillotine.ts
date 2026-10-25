/**
 * Guillotine 2D Bin Packing Heuristic for Glass Cutting Optimization
 * 
 * Flat glass cutting requires guillotine cuts (straight line cut from one edge
 * of the plate completely across to the opposite edge).
 */

export interface StockSheet {
  width: number;  // mm
  height: number; // mm
  label?: string;
}

export interface PieceToCut {
  id: string;
  label: string;
  width: number;  // mm
  height: number; // mm
  qty: number;
}

export interface PlacedPiece {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotated: boolean;
  area: number;
}

export interface FreeRectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface OptimizedSheet {
  sheetIndex: number;
  sheetWidth: number;
  sheetHeight: number;
  placedPieces: PlacedPiece[];
  freeRectangles: FreeRectangle[];
  usedAreaMm2: number;
  totalAreaMm2: number;
  wastagePercent: number;
}

export interface OptimizationResult {
  stockSheet: StockSheet;
  sheets: OptimizedSheet[];
  totalSheets: number;
  totalPiecesRequired: number;
  totalPiecesPlaced: number;
  totalGlassAreaMm2: number;
  totalStockAreaMm2: number;
  overallWastagePercent: number;
  unplacedPieces: Array<{ id: string; label: string; width: number; height: number }>;
}

export interface OptimizerOptions {
  allowRotation?: boolean;
  kerfMm?: number; // blade cut thickness (default 0 for glass scoring)
}

/**
 * Optimizes cutting plan for glass sheets using Guillotine bin packing
 */
export function optimizeCuttingPlan(
  stockSheet: StockSheet,
  items: PieceToCut[],
  options: OptimizerOptions = {}
): OptimizationResult {
  const allowRotation = options.allowRotation ?? true;
  const kerf = options.kerfMm ?? 0;

  // Flatten items by quantity
  interface SinglePiece {
    id: string;
    label: string;
    width: number;
    height: number;
  }

  const individualPieces: SinglePiece[] = [];
  for (const item of items) {
    for (let q = 0; q < item.qty; q++) {
      individualPieces.push({
        id: `${item.id}-${q + 1}`,
        label: item.label,
        width: Math.round(item.width),
        height: Math.round(item.height),
      });
    }
  }

  // Sort pieces by area descending (First-Fit Decreasing heuristic)
  // Tie-breaker: max dimension descending
  individualPieces.sort((a, b) => {
    const areaA = a.width * a.height;
    const areaB = b.width * b.height;
    if (areaB !== areaA) return areaB - areaA;
    return Math.max(b.width, b.height) - Math.max(a.width, a.height);
  });

  const sheets: OptimizedSheet[] = [];
  const unplacedPieces: SinglePiece[] = [];

  let currentSheetIndex = 0;
  const remainingPieces = [...individualPieces];

  while (remainingPieces.length > 0) {
    const sheetWidth = stockSheet.width;
    const sheetHeight = stockSheet.height;
    const freeRects: FreeRectangle[] = [
      { x: 0, y: 0, width: sheetWidth, height: sheetHeight },
    ];
    const placedPieces: PlacedPiece[] = [];

    let piecePlacedInCurrentSheet = false;

    // Iterate through remaining pieces and try to place them in current sheet
    for (let i = 0; i < remainingPieces.length; ) {
      const piece = remainingPieces[i];

      // Find the best free rectangle for this piece (Best Short Side Fit)
      let bestRectIdx = -1;
      let bestRotated = false;
      let bestShortSideFit = Infinity;

      for (let r = 0; r < freeRects.length; r++) {
        const fr = freeRects[r];

        // 1. Check unrotated fit
        if (piece.width <= fr.width && piece.height <= fr.height) {
          const shortSideFit = Math.min(fr.width - piece.width, fr.height - piece.height);
          if (shortSideFit < bestShortSideFit) {
            bestShortSideFit = shortSideFit;
            bestRectIdx = r;
            bestRotated = false;
          }
        }

        // 2. Check rotated fit if allowed
        if (
          allowRotation &&
          piece.height <= fr.width &&
          piece.width <= fr.height
        ) {
          const shortSideFit = Math.min(fr.width - piece.height, fr.height - piece.width);
          if (shortSideFit < bestShortSideFit) {
            bestShortSideFit = shortSideFit;
            bestRectIdx = r;
            bestRotated = true;
          }
        }
      }

      if (bestRectIdx >= 0) {
        // Place piece
        const targetRect = freeRects[bestRectIdx];
        freeRects.splice(bestRectIdx, 1);

        const w = bestRotated ? piece.height : piece.width;
        const h = bestRotated ? piece.width : piece.height;

        placedPieces.push({
          id: piece.id,
          label: piece.label,
          x: targetRect.x,
          y: targetRect.y,
          width: w,
          height: h,
          rotated: bestRotated,
          area: w * h,
        });

        // Guillotine split the remaining space of targetRect into two new free rectangles
        // Shorter-axis split: cut along the axis that produces the squarer remaining rectangle
        const remainW = targetRect.width - w - kerf;
        const remainH = targetRect.height - h - kerf;

        // Split vertically or horizontally
        if (remainW > 0 && remainH > 0) {
          // If cutting horizontally first:
          // Top slice: (targetRect.x, targetRect.y + h + kerf, targetRect.width, remainH)
          // Right slice: (targetRect.x + w + kerf, targetRect.y, remainW, h)
          if (remainW < remainH) {
            // Horizontal split first
            freeRects.push({
              x: targetRect.x,
              y: targetRect.y + h + kerf,
              width: targetRect.width,
              height: remainH,
            });
            freeRects.push({
              x: targetRect.x + w + kerf,
              y: targetRect.y,
              width: remainW,
              height: h,
            });
          } else {
            // Vertical split first
            freeRects.push({
              x: targetRect.x + w + kerf,
              y: targetRect.y,
              width: remainW,
              height: targetRect.height,
            });
            freeRects.push({
              x: targetRect.x,
              y: targetRect.y + h + kerf,
              width: w,
              height: remainH,
            });
          }
        } else if (remainW > 0) {
          freeRects.push({
            x: targetRect.x + w + kerf,
            y: targetRect.y,
            width: remainW,
            height: targetRect.height,
          });
        } else if (remainH > 0) {
          freeRects.push({
            x: targetRect.x,
            y: targetRect.y + h + kerf,
            width: targetRect.width,
            height: remainH,
          });
        }

        // Clean up free rectangles (filter out zero or negative dimensions)
        for (let idx = freeRects.length - 1; idx >= 0; idx--) {
          if (freeRects[idx].width <= 0 || freeRects[idx].height <= 0) {
            freeRects.splice(idx, 1);
          }
        }

        // Remove piece from remainingPieces
        remainingPieces.splice(i, 1);
        piecePlacedInCurrentSheet = true;
      } else {
        // Piece cannot fit in current sheet's remaining free rectangles
        i++;
      }
    }

    if (!piecePlacedInCurrentSheet) {
      // Any remaining piece that cannot even fit on a fresh sheet is unplaceable
      for (const piece of remainingPieces) {
        const fitsNormal = piece.width <= stockSheet.width && piece.height <= stockSheet.height;
        const fitsRotated = allowRotation && (piece.height <= stockSheet.width && piece.width <= stockSheet.height);
        if (!fitsNormal && !fitsRotated) {
          unplacedPieces.push(piece);
        }
      }
      // If we couldn't place anything and no pieces are left or all remaining are impossible, break
      if (placedPieces.length === 0) {
        break;
      }
    }

    if (placedPieces.length > 0) {
      currentSheetIndex++;
      const usedArea = placedPieces.reduce((acc, p) => acc + p.area, 0);
      const totalArea = stockSheet.width * stockSheet.height;
      const wastage = totalArea > 0 ? ((totalArea - usedArea) / totalArea) * 100 : 0;

      sheets.push({
        sheetIndex: currentSheetIndex,
        sheetWidth: stockSheet.width,
        sheetHeight: stockSheet.height,
        placedPieces,
        freeRectangles: freeRects,
        usedAreaMm2: usedArea,
        totalAreaMm2: totalArea,
        wastagePercent: Number(wastage.toFixed(2)),
      });
    }

    // Safety guard to avoid infinite loop
    if (currentSheetIndex > 500) {
      console.warn("Reached maximum 500 sheet limit");
      break;
    }
  }

  const totalSheets = sheets.length;
  const totalPiecesRequired = individualPieces.length;
  const totalPiecesPlaced = sheets.reduce((acc, s) => acc + s.placedPieces.length, 0);
  const totalGlassAreaMm2 = sheets.reduce((acc, s) => acc + s.usedAreaMm2, 0);
  const totalStockAreaMm2 = totalSheets * (stockSheet.width * stockSheet.height);
  const overallWastagePercent =
    totalStockAreaMm2 > 0
      ? Number((((totalStockAreaMm2 - totalGlassAreaMm2) / totalStockAreaMm2) * 100).toFixed(2))
      : 0;

  return {
    stockSheet,
    sheets,
    totalSheets,
    totalPiecesRequired,
    totalPiecesPlaced,
    totalGlassAreaMm2,
    totalStockAreaMm2,
    overallWastagePercent,
    unplacedPieces,
  };
}

/**
 * Generates an SVG string representation of an optimized sheet
 */
export function generateSheetSvg(
  sheet: OptimizedSheet,
  options: { displayWidth?: number; showLabels?: boolean } = {}
): string {
  const displayW = options.displayWidth || 800;
  const scale = displayW / sheet.sheetWidth;
  const displayH = Math.round(sheet.sheetHeight * scale);
  const showLabels = options.showLabels ?? true;

  const colors = [
    "#3b82f6", // blue-500
    "#10b981", // emerald-500
    "#f59e0b", // amber-500
    "#8b5cf6", // purple-500
    "#ec4899", // pink-500
    "#06b6d4", // cyan-500
    "#f97316", // orange-500
    "#14b8a6", // teal-500
  ];

  let piecesSvg = "";
  sheet.placedPieces.forEach((p, idx) => {
    const x = p.x * scale;
    const y = p.y * scale;
    const w = p.width * scale;
    const h = p.height * scale;
    const color = colors[idx % colors.length];

    const fontSize = Math.max(10, Math.min(14, Math.floor(Math.min(w, h) / 4)));

    piecesSvg += `
      <g class="glass-piece" data-id="${p.id}">
        <rect
          x="${x}"
          y="${y}"
          width="${w}"
          height="${h}"
          fill="${color}"
          fill-opacity="0.85"
          stroke="#1e293b"
          stroke-width="1.5"
        />
        ${
          showLabels && w > 35 && h > 25
            ? `<text
                x="${x + w / 2}"
                y="${y + h / 2 - 4}"
                font-family="system-ui, sans-serif"
                font-size="${fontSize}"
                font-weight="bold"
                fill="#ffffff"
                text-anchor="middle"
                dominant-baseline="middle"
              >${p.label}</text>
              <text
                x="${x + w / 2}"
                y="${y + h / 2 + fontSize}"
                font-family="system-ui, sans-serif"
                font-size="${Math.max(9, fontSize - 3)}"
                fill="#f1f5f9"
                text-anchor="middle"
                dominant-baseline="middle"
              >${p.width} x ${p.height} ${p.rotated ? "🔄" : ""}</text>`
            : ""
        }
      </g>
    `;
  });

  return `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 ${displayW} ${displayH}"
      width="100%"
      height="100%"
      style="background-color: #f1f5f9; border-radius: 8px; border: 2px solid #cbd5e1;"
    >
      <!-- Stock Sheet Boundary -->
      <rect
        x="0"
        y="0"
        width="${displayW}"
        height="${displayH}"
        fill="#f8fafc"
        stroke="#94a3b8"
        stroke-width="2"
        stroke-dasharray="4"
      />
      <!-- Placed Glass Pieces -->
      ${piecesSvg}
    </svg>
  `.trim();
}

