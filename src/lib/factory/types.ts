export interface FactoryCutItem {
  id: string;
  clientName: string;
  flat: string;
  building: string;
  productName: string;
  glassCutHeightMm: number;
  glassCutWidthMm: number;
  frameHeightMm: number;
  frameWidthMm: number;
  quantity: number;
  sqft: number;
  status: string;
  notes: string;
}

export interface GlassTypeGroup {
  glassType: string;
  items: FactoryCutItem[];
  totalPieces: number;
  totalSqft: number;
}

export interface FactoryGroup {
  factoryName: string;
  glassTypes: GlassTypeGroup[];
  totalPieces: number;
  totalSqft: number;
}
