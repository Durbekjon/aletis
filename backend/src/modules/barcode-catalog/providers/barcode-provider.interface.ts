import { BarcodeSource } from '@prisma/client';

export interface BarcodeLookupResult {
  found: boolean;
  productName?: string;
  description?: string;
  brandName?: string;
  categoryName?: string;
  unitName?: string;
  mxikCode?: string;
  imageUrl?: string;
  metadata?: Record<string, any>;
}

export interface BarcodeProvider {
  readonly source: BarcodeSource;
  lookup(barcode: string): Promise<BarcodeLookupResult>;
}

export const BARCODE_PROVIDERS = 'BARCODE_PROVIDERS';
