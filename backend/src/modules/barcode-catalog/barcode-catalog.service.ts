import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@core/prisma/prisma.service';
import { BarcodeCatalogEntry, BarcodeSource } from '@prisma/client';
import {
  BARCODE_PROVIDERS,
  BarcodeProvider,
} from './providers/barcode-provider.interface';
import {
  BarcodeCatalogDataDto,
  BarcodeLookupResponseDto,
  CompleteBarcodeEntryDto,
} from './dto';

@Injectable()
export class BarcodeCatalogService {
  private readonly logger = new Logger(BarcodeCatalogService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(BARCODE_PROVIDERS)
    private readonly providers: BarcodeProvider[],
  ) {}

  async lookup(barcode: string): Promise<BarcodeLookupResponseDto> {
    const existing = await this.prisma.barcodeCatalogEntry.findUnique({
      where: { barcode },
    });

    if (existing?.status === 'COMPLETED') {
      return this.toResponseDto(existing);
    }

    if (existing?.status === 'PENDING') {
      return { found: false, status: 'PENDING' };
    }

    for (const provider of this.providers) {
      const result = await provider.lookup(barcode);
      if (!result.found) continue;

      const saved = await this.prisma.barcodeCatalogEntry.upsert({
        where: { barcode },
        create: {
          barcode,
          status: 'COMPLETED',
          source: provider.source,
          productName: result.productName,
          description: result.description,
          brandName: result.brandName,
          categoryName: result.categoryName,
          unitName: result.unitName,
          mxikCode: result.mxikCode,
          imageUrl: result.imageUrl,
          metadata: result.metadata,
        },
        update: {
          status: 'COMPLETED',
          source: provider.source,
          productName: result.productName,
          description: result.description,
          brandName: result.brandName,
          categoryName: result.categoryName,
          unitName: result.unitName,
          mxikCode: result.mxikCode,
          imageUrl: result.imageUrl,
          metadata: result.metadata,
        },
      });

      this.logger.log(
        `[BarcodeCatalog] Resolved ${barcode} via ${provider.source}`,
      );
      return this.toResponseDto(saved);
    }

    await this.prisma.barcodeCatalogEntry.upsert({
      where: { barcode },
      create: { barcode, status: 'PENDING' },
      update: {},
    });

    return { found: false, status: 'PENDING' };
  }

  async completeManually(
    barcode: string,
    dto: CompleteBarcodeEntryDto,
  ): Promise<BarcodeLookupResponseDto> {
    const saved = await this.prisma.barcodeCatalogEntry.upsert({
      where: { barcode },
      create: {
        barcode,
        status: 'COMPLETED',
        source: BarcodeSource.MANUAL,
        ...dto,
      },
      update: {
        status: 'COMPLETED',
        source: BarcodeSource.MANUAL,
        ...dto,
      },
    });

    return this.toResponseDto(saved);
  }

  private toResponseDto(
    entry: BarcodeCatalogEntry,
  ): BarcodeLookupResponseDto {
    const data: BarcodeCatalogDataDto = {
      productName: entry.productName ?? undefined,
      description: entry.description ?? undefined,
      brandName: entry.brandName ?? undefined,
      categoryName: entry.categoryName ?? undefined,
      unitName: entry.unitName ?? undefined,
      mxikCode: entry.mxikCode ?? undefined,
      imageUrl: entry.imageUrl ?? undefined,
      metadata: (entry.metadata as Record<string, any>) ?? undefined,
    };

    return {
      found: true,
      status: entry.status,
      source: entry.source ?? undefined,
      data,
    };
  }
}
