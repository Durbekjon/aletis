import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@core/prisma/prisma.service';
import { GeminiService } from '@core/gemini/gemini.service';
import { EmbadingService } from '@modules/embading/embading.service';
import { ProductsService } from './products.service';

export interface ProductSearchMatch {
  id: number;
  caption: string;
  imageKey: string | null;
}

export interface ProductSearchResult {
  matches: ProductSearchMatch[];
  noResultText: string;
}

/**
 * Query-scoped product search for the chat's [INTENT:SEARCH_PRODUCT] flow.
 * Prefers real Weaviate hybrid search (BM25 + vector) over the org's product
 * catalog; falls back to the old "dump the whole catalog to Gemini" matching
 * only when Weaviate is unavailable, so search still works in that case.
 */
@Injectable()
export class ProductSearchService {
  private readonly logger = new Logger(ProductSearchService.name);

  constructor(
    private readonly embadingService: EmbadingService,
    private readonly productsService: ProductsService,
    private readonly geminiService: GeminiService,
    private readonly prisma: PrismaService,
  ) {}

  async search(
    organizationId: number,
    searchQuery: string,
    userMessage: string,
    lang: string | null | undefined,
    limit = 5,
  ): Promise<ProductSearchResult> {
    if (!this.embadingService.isAvailable()) {
      return this.searchViaFullCatalogFallback(
        organizationId,
        searchQuery,
        userMessage,
      );
    }

    try {
      const hits = await this.embadingService.hybridSearch({
        queryText: searchQuery,
        organizationId,
        limit,
      });

      if (!hits || hits.length === 0) {
        return { matches: [], noResultText: '' };
      }

      const props = hits.map((h: any) => (h.properties ? h.properties : h));
      const productIds = props
        .map((p: any) => p.productId)
        .filter((id: any) => typeof id === 'number');

      if (productIds.length === 0) {
        return { matches: [], noResultText: '' };
      }

      // Weaviate's Product collection doesn't store image URLs — one small
      // scoped Postgres lookup for just the matched IDs (not the full catalog).
      const products = await this.prisma.product.findMany({
        where: { id: { in: productIds }, organizationId, isDeleted: false },
        select: {
          id: true,
          name: true,
          price: true,
          currency: true,
          images: { select: { url: true }, take: 1 },
        },
      });
      const productById = new Map(products.map((p) => [p.id, p]));

      const matches: ProductSearchMatch[] = [];
      for (const p of props) {
        const product = productById.get(p.productId);
        if (!product) continue;
        matches.push({
          id: product.id,
          caption: this.buildCaption(
            product.name,
            product.price,
            String(product.currency),
            p.description,
            lang,
          ),
          imageKey: product.images[0]?.url ?? null,
        });
      }

      return { matches, noResultText: '' };
    } catch (error: any) {
      this.logger.error(
        `Weaviate hybrid search failed, falling back to full-catalog match: ${error.message}`,
        error.stack,
      );
      return this.searchViaFullCatalogFallback(
        organizationId,
        searchQuery,
        userMessage,
      );
    }
  }

  private buildCaption(
    name: string,
    price: number,
    currency: string,
    description: string | undefined,
    lang: string | null | undefined,
  ): string {
    const desc = description ? description.substring(0, 100) : '';
    const footer =
      lang === 'ru'
        ? 'Хотите заказать это?'
        : lang === 'en'
          ? 'Would you like to order this?'
          : 'Buyurtma bermoqchimisiz?';

    return `🛍️ ${name}\n💰 ${price} ${currency}${desc ? `\n✨ ${desc}` : ''}\n\n${footer}`;
  }

  private async searchViaFullCatalogFallback(
    organizationId: number,
    searchQuery: string,
    userMessage: string,
  ): Promise<ProductSearchResult> {
    const products =
      await this.productsService.getProductsForOrganization(organizationId);
    if (products.length === 0) {
      return { matches: [], noResultText: '' };
    }
    const { matches, noResultText } =
      await this.geminiService.matchProductsInContext(
        products,
        searchQuery,
        userMessage,
        { organizationId },
      );
    const productById = new Map(products.map((p) => [p.id, p]));
    return {
      matches: matches.map((m) => ({
        id: m.id,
        caption: m.caption,
        imageKey: productById.get(m.id)?.imageKey ?? null,
      })),
      noResultText,
    };
  }
}
