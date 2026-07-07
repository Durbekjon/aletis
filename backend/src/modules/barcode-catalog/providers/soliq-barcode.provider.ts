import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BarcodeSource } from '@prisma/client';
import { RetryService } from '@core/retry/retry.service';
import {
  BarcodeLookupResult,
  BarcodeProvider,
} from './barcode-provider.interface';

interface SoliqByParamsItem {
  mxikCode?: string;
  mxikName?: string;
  groupCode?: string;
  groupName?: string;
  classCode?: string;
  className?: string;
  positionCode?: string;
  positionName?: string;
  subPositionCode?: string;
  subPositionName?: string;
  brandCode?: string;
  brandName?: string;
  attributeName?: string;
  unitCode?: string;
  unitName?: string;
  commonUnitCode?: string;
  commonUnitName?: string;
  internationalCode?: string;
  units?: string;
  packages?: string;
  label?: number;
  [key: string]: any;
}

interface SoliqSearchResponse {
  success: boolean;
  code: number;
  reason: string;
  data: {
    content: SoliqByParamsItem[] | null;
    empty: boolean;
    totalElements: number;
  } | null;
  errors: any;
}

@Injectable()
export class SoliqBarcodeProvider implements BarcodeProvider {
  readonly source = BarcodeSource.SOLIQ;

  private readonly logger = new Logger(SoliqBarcodeProvider.name);
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly retryService: RetryService,
  ) {
    this.baseUrl = this.configService.get<string>(
      'SOLIQ_API_BASE_URL',
      'https://tasnif.soliq.uz/api/cls-api',
    );
    this.timeoutMs = Number(
      this.configService.get<string>('SOLIQ_API_TIMEOUT_MS', '8000'),
    );
  }

  async lookup(barcode: string): Promise<BarcodeLookupResult> {
    try {
      const response = await this.retryService.executeWithRetry(
        () => this.performRequest(barcode),
        { maxAttempts: 3, baseDelay: 1000, maxDelay: 4000, backoffMultiplier: 2 },
      );

      const item = response?.data?.content?.[0];
      if (!response?.success || !item) {
        return { found: false };
      }

      return this.mapItem(item);
    } catch (error) {
      this.logger.error(
        `[Soliq] Barcode lookup failed for ${barcode} after retries: ${
          error instanceof Error ? error.message : error
        }`,
      );
      return { found: false };
    }
  }

  private async performRequest(barcode: string): Promise<SoliqSearchResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const query = new URLSearchParams({
        gtin: barcode,
        page: '0',
        size: '20',
        lang: 'ru',
      });
      const response = await fetch(
        `${this.baseUrl}/mxik/search/by-params?${query.toString()}`,
        { method: 'GET', signal: controller.signal },
      );

      if (response.status >= 500 || response.status === 429) {
        const retryError = new Error(
          `Soliq API responded with ${response.status}`,
        );
        (retryError as any).retryable = true;
        throw retryError;
      }

      if (!response.ok) {
        return { success: false, code: response.status, reason: response.statusText, data: null, errors: null };
      }

      return (await response.json()) as SoliqSearchResponse;
    } catch (error) {
      if ((error as any).name === 'AbortError') {
        const timeoutError = new Error(
          `Soliq API request timed out after ${this.timeoutMs}ms`,
        );
        (timeoutError as any).retryable = true;
        throw timeoutError;
      }
      if (error instanceof TypeError) {
        (error as any).retryable = true;
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private mapItem(item: SoliqByParamsItem): BarcodeLookupResult {
    const description = [
      item.groupName,
      item.className,
      item.positionName,
      item.subPositionName,
    ]
      .filter(Boolean)
      .join(' / ');

    return {
      found: true,
      productName: item.mxikName || undefined,
      description: description || undefined,
      brandName: item.brandName || undefined,
      categoryName: item.categoryName || item.groupName || undefined,
      unitName: item.commonUnitName || item.unitName || undefined,
      mxikCode: item.mxikCode || undefined,
      metadata: item,
    };
  }
}
