import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@core/prisma/prisma.service';
import { RedisService } from '@core/redis/redis.service';
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

// How long a customer's "recently shown products" context stays available
// for follow-up questions before it's considered a stale/abandoned topic.
const RECENTLY_SHOWN_TTL_SECONDS = 30 * 60;

/**
 * Query-scoped product search for the chat's [INTENT:SEARCH_PRODUCT] flow.
 *
 * Uses BM25 keyword search as the primary signal — empirically, CLIP's
 * multilingual text embeddings do NOT reliably discriminate between short,
 * unrelated product names (an unrelated product scored a *closer* vector
 * distance than the real match for a totally unrelated query in testing),
 * so vector/hybrid search can't be trusted to rank text queries. BM25 only
 * ever returns objects with actual term overlap, which is a much safer
 * signal. When BM25 finds nothing (a real paraphrase/synonym/misspelling,
 * not just "irrelevant"), falls back to an LLM judging relevance over the
 * org's catalog — real reasoning instead of an unreliable raw embedding
 * distance. Also falls back there if Weaviate itself is unavailable.
 *
 * Also tracks which products were last shown to each customer (Redis,
 * short TTL) so the chat prompt can give the AI full details on just those
 * few products — letting it answer follow-ups about color/warranty/spec/
 * quantity directly instead of re-searching and re-sending a photo for
 * every question about the same item.
 */
@Injectable()
export class ProductSearchService {
  private readonly logger = new Logger(ProductSearchService.name);

  constructor(
    private readonly embadingService: EmbadingService,
    private readonly productsService: ProductsService,
    private readonly geminiService: GeminiService,
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  async search(
    organizationId: number,
    customerId: number,
    searchQuery: string,
    userMessage: string,
    lang: string | null | undefined,
    limit = 5,
  ): Promise<ProductSearchResult> {
    const result = await this.performTextSearch(
      organizationId,
      searchQuery,
      userMessage,
      lang,
      limit,
    );
    if (result.matches.length > 0) {
      await this.recordShown(
        customerId,
        result.matches.map((m) => m.id),
      );
    }
    return result;
  }

  private async performTextSearch(
    organizationId: number,
    searchQuery: string,
    userMessage: string,
    lang: string | null | undefined,
    limit: number,
  ): Promise<ProductSearchResult> {
    if (!this.embadingService.isAvailable()) {
      return this.searchViaFullCatalogFallback(
        organizationId,
        searchQuery,
        lang,
      );
    }

    try {
      const hits = await this.embadingService.searchByKeyword(
        searchQuery,
        organizationId,
        limit,
      );

      if (!hits || hits.length === 0) {
        // No keyword overlap at all — not necessarily "nothing available",
        // could be a paraphrase/synonym/misspelling. Let an LLM judge real
        // relevance rather than trusting the unreliable text-vector fallback.
        return this.searchViaFullCatalogFallback(
          organizationId,
          searchQuery,
          lang,
        );
      }

      const props = hits.map((h: any) => (h.properties ? h.properties : h));
      const productIds = props
        .map((p: any) => p.productId)
        .filter((id: any) => typeof id === 'number');

      if (productIds.length === 0) {
        return { matches: [], noResultText: '' };
      }

      // Weaviate's Product collection doesn't store image URLs or live stock
      // — one small scoped Postgres lookup for just the matched IDs (not the
      // full catalog) gets both, always fresh.
      const products = await this.prisma.product.findMany({
        where: { id: { in: productIds }, organizationId, isDeleted: false },
        select: {
          id: true,
          name: true,
          price: true,
          currency: true,
          quantity: true,
          images: { select: { url: true }, take: 1 },
        },
      });

      if (products.length === 0) {
        return { matches: [], noResultText: '' };
      }

      // BM25 only guarantees keyword overlap, not semantic relevance.
      // Pass the small candidate set through Gemini to filter out false
      // positives (e.g. "дафтар" query matching "Bamboozy" because both
      // happened to share a BM25 token). This is a cheap LLM call since
      // the candidate list is already narrow (≤ limit items, not full catalog).
      const productById = new Map(products.map((p) => [p.id, p]));
      const candidates = products.map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        currency: String(p.currency),
        description: props.find((pr: any) => pr.productId === p.id)?.description || '',
        quantity: p.quantity,
      }));

      const { matches: relevantMatches, noResultText } =
        await this.geminiService.matchProductsInContext(
          candidates,
          searchQuery,
          lang || 'uz',
          { organizationId },
        );

      const matches: ProductSearchMatch[] = [];
      for (const m of relevantMatches) {
        const product = productById.get(m.id);
        if (!product) continue;
        matches.push({
          id: product.id,
          caption: m.caption,
          imageKey: product.images[0]?.url ?? null,
        });
      }

      // If Gemini filtered everything out, surface the noResultText rather
      // than silently returning empty — caller can use it as a user-facing
      // "nothing found" message.
      return { matches, noResultText };
    } catch (error: any) {
      this.logger.error(
        `Weaviate keyword search failed, falling back to full-catalog match: ${error.message}`,
        error.stack,
      );
      return this.searchViaFullCatalogFallback(
        organizationId,
        searchQuery,
        lang,
      );
    }
  }

  /**
   * Visual product search — a customer sent a photo. Weaviate's ProductImage
   * collection doesn't store image URLs either, so the same small Postgres
   * lookup enriches the matched IDs with image + full product details.
   */
  async searchByImage(
    organizationId: number,
    customerId: number,
    base64Image: string,
    lang: string | null | undefined,
    limit = 5,
  ): Promise<ProductSearchResult> {
    const result = await this.performImageSearch(
      organizationId,
      base64Image,
      lang,
      limit,
    );
    if (result.matches.length > 0) {
      await this.recordShown(
        customerId,
        result.matches.map((m) => m.id),
      );
    }
    return result;
  }

  private async performImageSearch(
    organizationId: number,
    base64Image: string,
    lang: string | null | undefined,
    limit: number,
  ): Promise<ProductSearchResult> {
    if (!this.embadingService.isAvailable()) {
      return { matches: [], noResultText: '' };
    }

    const hits = await this.embadingService.searchByImageBase64(
      base64Image,
      organizationId,
      limit,
    );

    if (!hits || hits.length === 0) {
      return { matches: [], noResultText: '' };
    }

    const productIds = hits
      .map((h) => h.id)
      .filter((id) => typeof id === 'number');
    if (productIds.length === 0) {
      return { matches: [], noResultText: '' };
    }

    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, organizationId, isDeleted: false },
      select: {
        id: true,
        name: true,
        price: true,
        currency: true,
        quantity: true,
        images: { select: { url: true }, take: 1 },
      },
    });
    const productById = new Map(products.map((p) => [p.id, p]));

    const candidates = hits.map((hit) => {
      const p = productById.get(hit.id);
      return {
        id: hit.id,
        name: p?.name,
        price: p?.price,
        currency: p?.currency,
        quantity: p?.quantity,
        description: hit.description,
      };
    }).filter(c => c.name);

    // AI formats engaging captions dynamically
    const captionsList = await this.geminiService.generateProductCaptions(
      candidates,
      lang || 'uz',
      'Image search match'
    );
    const captionById = new Map(captionsList.map(c => [c.id, c.caption]));

    const matches: ProductSearchMatch[] = [];
    for (const hit of hits) {
      const product = productById.get(hit.id);
      if (!product) continue;
      
      const defaultCaption = `🛍️ <b>${product.name}</b>\n💰 ${product.price} ${product.currency}`;
      
      matches.push({
        id: product.id,
        caption: captionById.get(product.id) || defaultCaption,
        imageKey: product.images[0]?.url ?? null,
      });
    }

    return { matches, noResultText: '' };
  }


  private async searchViaFullCatalogFallback(
    organizationId: number,
    searchQuery: string,
    lang: string | null | undefined,
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
        lang || 'uz',
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

  private recentlyShownKey(customerId: number): string {
    return `chat:recent-products:${customerId}`;
  }

  private async recordShown(
    customerId: number,
    productIds: number[],
  ): Promise<void> {
    try {
      await this.redisService.set(
        this.recentlyShownKey(customerId),
        productIds,
        RECENTLY_SHOWN_TTL_SECONDS,
      );
    } catch (error: any) {
      // Non-critical — worst case, follow-up questions fall back to a
      // fresh search instead of using remembered context.
      this.logger.warn(`Failed to record recently-shown products: ${error.message}`);
    }
  }

  private async getRecentlyShown(customerId: number): Promise<number[]> {
    try {
      return (await this.redisService.get<number[]>(this.recentlyShownKey(customerId))) ?? [];
    } catch {
      return [];
    }
  }

  /**
   * Full details of whatever products were last shown to this customer,
   * formatted for the main chat prompt — lets the AI answer follow-up
   * questions (color, warranty, spec, quantity...) about "that product"
   * directly, without re-searching or re-sending a photo. Empty string if
   * nothing was recently shown (the common case, most turns).
   */
  async getRecentlyViewedContext(
    customerId: number,
    organizationId: number,
  ): Promise<string> {
    const productIds = await this.getRecentlyShown(customerId);
    if (productIds.length === 0) return '';

    const products = await this.productsService.getProductsForAiContext(
      productIds,
      organizationId,
    );
    if (products.length === 0) return '';

    return products
      .map((p) => {
        const stockLine =
          p.quantity <= 0 ? 'OUT OF STOCK' : `${p.quantity} in stock`;
        const fieldLines = p.itemSpecValues
          .map((f) => {
            const value = this.formatFieldValue(f);
            return value ? `  - ${f.fieldName}: ${value}` : null;
          })
          .filter((line): line is string => line !== null)
          .join('\n');
        return `Product #${p.id}: ${p.name}\n  Price: ${p.price} ${p.currency}\n  Stock: ${stockLine}${fieldLines ? '\n' + fieldLines : ''}`;
      })
      .join('\n\n');
  }

  private formatFieldValue(field: {
    valueText?: string | null;
    valueNumber?: number | null;
    valueBool?: boolean | null;
    valueDate?: Date | null;
    valueJson?: any;
  }): string | null {
    if (field.valueText) return field.valueText;
    if (field.valueNumber !== undefined && field.valueNumber !== null) {
      return String(field.valueNumber);
    }
    if (field.valueBool !== undefined && field.valueBool !== null) {
      return field.valueBool ? 'yes' : 'no';
    }
    if (field.valueDate) {
      return new Date(field.valueDate).toISOString().slice(0, 10);
    }
    if (field.valueJson !== undefined && field.valueJson !== null) {
      return typeof field.valueJson === 'string'
        ? field.valueJson
        : JSON.stringify(field.valueJson);
    }
    return null;
  }
}
