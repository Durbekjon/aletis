import { ImageToBase64Service } from '@core/image-to-base64/image-to-base64.service';
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import weaviate, {
  WeaviateClient,
  vectorizer,
  dataType,
  Filters,
} from 'weaviate-client';
import { ProductResponseDto } from '@modules/products/dto/product-response.dto';
import { v5 as uuidv5 } from 'uuid';

@Injectable()
export class EmbadingService implements OnModuleInit {
  private client: WeaviateClient;
  private available = false;
  private readonly logger = new Logger(EmbadingService.name);
  private readonly UUID_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'; // Standard OID namespace

  // Weaviate's nearest-neighbor search always returns the closest object in
  // the collection, even if it's a bad match — with a small/sparse catalog
  // this means a totally unrelated product (e.g. a leftover "cat" test
  // product) gets returned as the "match" for a query the org has nothing
  // for (e.g. "asus"), since it's the only thing in the vector space. These
  // cap how far (0 = identical, 2 = opposite; cosine distance) a match is
  // allowed to be before it's dropped instead of surfaced as a false match.
  // Heuristic defaults — may need tuning against real query traffic.
  private readonly MAX_TEXT_VECTOR_DISTANCE = 0.75;
  private readonly MAX_IMAGE_VECTOR_DISTANCE = 0.9;

  constructor(private readonly imageToBase64Service: ImageToBase64Service) {}

  async onModuleInit() {
    try {
      this.client = await weaviate.connectToLocal({
        host: process.env.WEAVIATE_HOST || 'localhost',
        port: parseInt(process.env.WEAVIATE_PORT || '8080'),
        grpcPort: 50051,
      });
      const ready = await this.client.isReady();
      if (ready) {
        this.logger.log('Weaviate client connected and ready');
        await this._createProductCollection();
        this.available = true;
      } else {
        this.logger.warn('Weaviate client not ready — embedding features disabled');
      }
    } catch (err) {
      this.logger.warn(`Weaviate unavailable — embedding features disabled: ${err.message}`);
    }
  }

  /**
   * Whether semantic/image search is currently usable. When false, all search
   * methods degrade to an empty result set (and log a warning) instead of
   * throwing — callers should surface a graceful fallback to the user.
   */
  isAvailable(): boolean {
    return this.available && !!this.client;
  }

  private productUuid(productId: number): string {
    return uuidv5(productId.toString(), this.UUID_NAMESPACE);
  }

  /** Scopes a Product-collection query to one org's active, non-deleted products. */
  private productOrgFilter(organizationId: number) {
    const collection = this.client.collections.get('Product');
    return Filters.and(
      collection.filter.byProperty('organizationId').equal(organizationId.toString()),
      collection.filter.byProperty('isDeleted').equal(false),
      collection.filter.byProperty('status').equal('ACTIVE'),
    );
  }

  /** Scopes a ProductImage-collection query to images of one org's active, non-deleted products. */
  private productImageOrgFilter(organizationId: number) {
    const collection = this.client.collections.get('ProductImage');
    return Filters.and(
      collection.filter.byRef('product').byProperty('organizationId').equal(organizationId.toString()),
      collection.filter.byRef('product').byProperty('isDeleted').equal(false),
      collection.filter.byRef('product').byProperty('status').equal('ACTIVE'),
    );
  }

  private async _createProductCollection() {
    const productCollection = 'Product';
    const imageCollection = 'ProductImage';

    try {
      // 1. Create Product Collection (Text only)
      const productExists =
        await this.client.collections.exists(productCollection);
      if (!productExists) {
        await this.client.collections.create({
          name: productCollection,
          vectorizers: vectorizer.multi2VecClip({
            textFields: ['name', 'description'],
          }),
          properties: [
            { name: 'name', dataType: dataType.TEXT },
            { name: 'description', dataType: dataType.TEXT },
            { name: 'price', dataType: dataType.NUMBER },
            { name: 'productId', dataType: dataType.NUMBER }, // Store original DB ID
            { name: 'organizationId', dataType: dataType.TEXT },
            { name: 'status', dataType: dataType.TEXT },
            { name: 'isDeleted', dataType: dataType.BOOLEAN },
          ],
        });
        this.logger.log('Product collection created!');
      } else {
        this.logger.log(`Collection ${productCollection} already exists`);
      }

      // 2. Create ProductImage Collection (Image only)
      const imageExists = await this.client.collections.exists(imageCollection);
      if (!imageExists) {
        await this.client.collections.create({
          name: imageCollection,
          vectorizers: vectorizer.multi2VecClip({
            imageFields: ['image'],
          }),
          properties: [{ name: 'image', dataType: dataType.BLOB }],
          references: [
            {
              name: 'product',
              targetCollection: productCollection,
            },
          ],
        });
        this.logger.log('ProductImage collection created!');
      } else {
        this.logger.log(`Collection ${imageCollection} already exists`);
      }
    } catch (error) {
      this.logger.error('Error creating collections:', error);
    }
  }

  async createProductEmbedding(product: ProductResponseDto) {
    if (!this.client) return;
    const productCollection = this.client.collections.get('Product');
    const imageCollection = this.client.collections.get('ProductImage');

    // Generate deterministic UUID for the product
    const productUuid = this.productUuid(product.id);

    // Extract description from fields if available
    const descriptionField = product.fields.find(
      (f) => f.fieldName.toLowerCase() === 'description',
    );
    const description = descriptionField?.valueText || '';

    // 1. Insert Product (Text Vector)
    await productCollection.data.insert({
      id: productUuid,
      properties: {
        name: product.name,
        description: description,
        price: product.price,
        productId: product.id,
        organizationId: product.organizationId.toString(),
        status: product.status,
        isDeleted: false,
      },
    });

    // 2. Insert Images (Image Vectors) — one image failing/timing out
    // shouldn't delay or block the others.
    if (product.images && product.images.length > 0) {
      await Promise.all(
        product.images.map(async (image) => {
          try {
            // image.url is the absolute ImageKit CDN URL; fetched over HTTP
            const base64 = await this.imageToBase64Service.convert(image.url);
            await imageCollection.data.insert({
              properties: {
                image: base64,
              },
              references: {
                product: productUuid,
              },
            });
          } catch (error) {
            this.logger.error(
              `Failed to vectorise image ${image.key} for product ${product.id}: ${error.message}`,
            );
          }
        }),
      );
    }
  }

  /**
   * Removes a product (and all its linked images) from the Weaviate index.
   * Safe to call even if the product was never indexed — deletes are
   * best-effort and log rather than throw.
   */
  async deleteProductEmbedding(productId: number): Promise<void> {
    if (!this.client) return;
    const productCollection = this.client.collections.get('Product');
    const imageCollection = this.client.collections.get('ProductImage');

    try {
      await imageCollection.data.deleteMany(
        imageCollection.filter.byRef('product').byProperty('productId').equal(productId),
      );
    } catch (error) {
      this.logger.error(
        `Failed to delete image embeddings for product ${productId}: ${error.message}`,
      );
    }

    try {
      await productCollection.data.deleteById(this.productUuid(productId));
    } catch (error) {
      this.logger.error(
        `Failed to delete product embedding ${productId}: ${error.message}`,
      );
    }
  }

  /**
   * Re-syncs a product's Weaviate entry after a Postgres update — deletes the
   * old Product + ProductImage objects and re-inserts fresh ones, since name/
   * price/description/images may all have changed.
   */
  async updateProductEmbedding(product: ProductResponseDto): Promise<void> {
    if (!this.client) return;
    await this.deleteProductEmbedding(product.id);
    await this.createProductEmbedding(product);
  }

  /**
   * One-off backfill helper: walks every indexed Product object and deletes
   * any whose productId is no longer in `liveProductIds` — cleans up ghost
   * entries left behind by deletes that happened before delete-on-delete
   * sync existed. Returns how many were removed.
   */
  async sweepOrphanedEmbeddings(liveProductIds: Set<number>): Promise<number> {
    if (!this.isAvailable()) return 0;
    const collection = this.client.collections.get('Product');
    let removed = 0;
    for await (const obj of collection.iterator({
      returnProperties: ['productId'],
    })) {
      const productId = (obj.properties as any)?.productId;
      if (typeof productId === 'number' && !liveProductIds.has(productId)) {
        await this.deleteProductEmbedding(productId);
        removed++;
      }
    }
    return removed;
  }

  /**
   * Pure BM25 keyword search — no vector component. Empirically, CLIP's
   * multilingual text tower does NOT reliably discriminate between short,
   * unrelated product names/queries (e.g. an unrelated "cat" product scored
   * a *closer* vector distance than the actual matching product for an
   * unrelated query), so it can't be trusted as the primary text-search
   * signal. BM25 only ever returns objects with actual term overlap, so an
   * empty result here means the org's catalog genuinely has no keyword
   * match — a much safer signal to build search on.
   */
  async searchByKeyword(query: string, organizationId: number, limit = 10) {
    if (!this.isAvailable()) {
      this.logger.warn('searchByKeyword skipped — Weaviate unavailable');
      return [];
    }
    const collection = this.client.collections.get('Product');
    const result = await collection.query.bm25(query, {
      limit,
      filters: this.productOrgFilter(organizationId),
      returnProperties: [
        'productId',
        'name',
        'description',
        'price',
        'organizationId',
      ],
    });
    return result.objects;
  }

  async searchByText(query: string, organizationId: number, limit = 10) {
    if (!this.isAvailable()) {
      this.logger.warn('searchByText skipped — Weaviate unavailable');
      return [];
    }
    const collection = this.client.collections.get('Product');
    const result = await collection.query.nearText(query, {
      limit: limit,
      distance: this.MAX_TEXT_VECTOR_DISTANCE,
      filters: this.productOrgFilter(organizationId),
      returnProperties: [
        'productId',
        'name',
        'description',
        'price',
        'organizationId',
      ],
    });
    return result.objects;
  }

  async searchByImage(filename: string, organizationId: number, limit = 10) {
    const base64 = await this.imageToBase64Service.convert(filename);
    return this.searchByImageBase64(base64, organizationId, limit);
  }

  async searchByImageBase64(base64: string, organizationId: number, limit = 10) {
    if (!this.isAvailable()) {
      this.logger.warn('searchByImageBase64 skipped — Weaviate unavailable');
      return [];
    }
    const collection = this.client.collections.get('ProductImage');

    // Search for images similar to the input image
    const result = await collection.query.nearImage(base64, {
      limit: limit,
      distance: this.MAX_IMAGE_VECTOR_DISTANCE,
      filters: this.productImageOrgFilter(organizationId),
      returnReferences: [
        {
          linkOn: 'product',
          returnProperties: [
            'productId',
            'name',
            'description',
            'price',
            'organizationId',
          ],
        },
      ],
    });

    // Extract the parent Product from the matching ProductImages
    // Result objects are ProductImages. Each has a 'product' reference.
    const flatProducts: { id: any; name: any; description: any; price: any; organizationId: number }[] = [];
    const seenIds = new Set();

    for (const obj of result.objects) {
      // Cross-references come back under `references`, not `properties` —
      // `properties` only ever holds this object's own scalar fields.
      const refs = (obj as any).references?.product?.objects as any[] | undefined;
      if (refs && refs.length > 0) {
        const product = refs[0]; // 1-1 link from Image -> Product
        const productData = product?.properties;
        if (productData && !seenIds.has(productData.productId)) {
          flatProducts.push({
            id: productData.productId,
            name: productData.name,
            description: productData.description,
            price: productData.price,
            organizationId: parseInt(productData.organizationId),
          });
          seenIds.add(productData.productId);
        }
      }
    }

    return flatProducts;
  }

  async hybridSearch(options: {
    queryText?: string;
    queryImageFilename?: string;
    organizationId: number;
    limit?: number;
    alpha?: number; // 0 = text only, 1 = vector only
  }) {
    const { queryText, queryImageFilename, organizationId, limit = 10, alpha = 0.5 } = options;

    if (!queryText && !queryImageFilename) {
      throw new Error(
        'Either queryText or queryImageFilename must be provided',
      );
    }

    if (!this.isAvailable()) {
      this.logger.warn('hybridSearch skipped — Weaviate unavailable');
      return [];
    }

    // Scenario 1: Text-only - Search Product collection
    if (queryText && !queryImageFilename) {
      const collection = this.client.collections.get('Product');
      const result = await collection.query.hybrid(queryText, {
        limit,
        alpha,
        maxVectorDistance: this.MAX_TEXT_VECTOR_DISTANCE,
        filters: this.productOrgFilter(organizationId),
        returnProperties: [
          'productId',
          'name',
          'description',
          'price',
          'organizationId',
        ],
      });
      return result.objects;
    }

    // Scenario 2: Image present (with or without text) — run visual search on
    // the ProductImage collection and return the linked Products. Text is not
    // blended into retrieval here; a true cross-collection hybrid isn't wired.
    if (queryImageFilename) {
      return this.searchByImage(queryImageFilename, organizationId, limit);
    }

    return [];
  }
}
