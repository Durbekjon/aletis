import { PrismaService } from '@core/prisma/prisma.service';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { BarcodeCatalogEntry, BarcodeSource } from '@prisma/client';
import {
  BarcodeCatalogDataDto,
  BarcodeLookupResponseDto,
  CompleteBarcodeEntryDto,
} from './dto';
import {
  BARCODE_PROVIDERS,
  BarcodeProvider,
} from './providers/barcode-provider.interface';

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
      include: { translations: true },
    });

    if (existing?.status === 'COMPLETED') {
      return this.toResponseDto(existing);
    }

    for (const provider of this.providers) {
      const result = await provider.lookup(barcode);
      if (!result.found) continue;

      let saved;
      if (existing) {
        saved = await this.prisma.barcodeCatalogEntry.update({
          where: { id: existing.id },
          data: {
            status: 'COMPLETED',
            source: provider.source,
            mxikCode: result.mxikCode,
            imageUrl: result.imageUrl,
            metadata: result.metadata ?? undefined,
            translations: {
              upsert: {
                where: {
                  entryId_languageCode: { entryId: existing.id, languageCode: 'ru' }
                },
                create: {
                  languageCode: 'ru',
                  productName: result.productName,
                  description: result.description,
                  brandName: result.brandName,
                  categoryName: result.categoryName,
                  unitName: result.unitName,
                },
                update: {
                  productName: result.productName,
                  description: result.description,
                  brandName: result.brandName,
                  categoryName: result.categoryName,
                  unitName: result.unitName,
                }
              }
            }
          },
          include: { translations: true },
        });
      } else {
        saved = await this.prisma.barcodeCatalogEntry.create({
          data: {
            barcode,
            status: 'COMPLETED',
            source: provider.source,
            mxikCode: result.mxikCode,
            imageUrl: result.imageUrl,
            metadata: result.metadata ?? undefined,
            translations: {
              create: {
                languageCode: 'ru',
                productName: result.productName,
                description: result.description,
                brandName: result.brandName,
                categoryName: result.categoryName,
                unitName: result.unitName,
              }
            }
          },
          include: { translations: true },
        });
      }

      this.logger.log(
        `[BarcodeCatalog] Resolved ${barcode} via ${provider.source}`,
      );
      return this.toResponseDto(saved);
    }

    const pendingSaved = await this.prisma.barcodeCatalogEntry.upsert({
      where: { barcode },
      create: { barcode, status: 'PENDING' },
      update: {},
      include: { translations: true },
    });

    return { found: false, status: 'PENDING' };
  }

  async completeManually(
    barcode: string,
    dto: CompleteBarcodeEntryDto,
  ): Promise<BarcodeLookupResponseDto> {
    const existing = await this.prisma.barcodeCatalogEntry.findUnique({
      where: { barcode },
    });

    const commonData = {
      status: 'COMPLETED' as const,
      source: BarcodeSource.MANUAL,
    };

    const translationData = {
      productName: dto.productName,
      description: dto.description,
      brandName: dto.brandName,
      categoryName: dto.categoryName,
      unitName: dto.unitName,
    };

    let saved;
    if (existing) {
      saved = await this.prisma.barcodeCatalogEntry.update({
        where: { id: existing.id },
        data: {
          ...commonData,
          translations: {
            upsert: {
              where: { entryId_languageCode: { entryId: existing.id, languageCode: 'uz' } },
              create: { languageCode: 'uz', ...translationData },
              update: translationData,
            }
          }
        },
        include: { translations: true },
      });
    } else {
      saved = await this.prisma.barcodeCatalogEntry.create({
        data: {
          barcode,
          ...commonData,
          translations: {
            create: { languageCode: 'uz', ...translationData }
          }
        },
        include: { translations: true },
      });
    }

    return this.toResponseDto(saved);
  }

  private toResponseDto(entry: any): BarcodeLookupResponseDto {
    const translation = entry.translations?.find((t: any) => t.languageCode === 'ru') || entry.translations?.[0] || {};
    
    const data: BarcodeCatalogDataDto = {
      productName: translation.productName ?? undefined,
      description: translation.description ?? undefined,
      brandName: translation.brandName ?? undefined,
      categoryName: translation.categoryName ?? undefined,
      unitName: translation.unitName ?? undefined,
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
