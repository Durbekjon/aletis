import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BarcodeCatalogStatus, BarcodeSource } from '@prisma/client';

export class BarcodeCatalogDataDto {
  @ApiPropertyOptional({ example: 'Coca-Cola 0.5L' })
  productName?: string;

  @ApiPropertyOptional({ example: 'Ichimliklar / Gazlangan ichimliklar' })
  description?: string;

  @ApiPropertyOptional({ example: 'Coca-Cola' })
  brandName?: string;

  @ApiPropertyOptional({ example: 'Ichimliklar' })
  categoryName?: string;

  @ApiPropertyOptional({ example: 'dona' })
  unitName?: string;

  @ApiPropertyOptional({ example: '07131001001000000' })
  mxikCode?: string;

  @ApiPropertyOptional()
  imageUrl?: string;

  @ApiPropertyOptional({
    description: 'Raw provider payload plus any fields not mapped to a dedicated column',
  })
  metadata?: Record<string, any>;
}

export class BarcodeLookupResponseDto {
  @ApiProperty({
    description: 'True only when catalog data is available (status COMPLETED)',
  })
  found: boolean;

  @ApiProperty({ enum: BarcodeCatalogStatus })
  status: BarcodeCatalogStatus;

  @ApiPropertyOptional({ enum: BarcodeSource })
  source?: BarcodeSource;

  @ApiPropertyOptional({ type: BarcodeCatalogDataDto })
  data?: BarcodeCatalogDataDto;
}
