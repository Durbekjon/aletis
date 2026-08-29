import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  InternalServerErrorException,
  Optional,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '@/core/prisma/prisma.service';
import {
  FieldType,
  ProductStatus,
  ActionType,
  EntityType,
} from '@prisma/client';
import {
  CreateProductDto,
  UpdateProductDto,
  ProductResponseDto,
  ProductPaginatedResponseDto,
  FieldValueResponseDto,
  ProductImageResponseDto,
} from './dto';
import { PaginationDto } from '@shared/dto';
import { RedisService } from '@core/redis/redis.service';
import { FileDeleteService } from '@core/file-delete/file-delete.service';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { CustomerIntelligenceService } from '@modules/customer-intelligence/customer-intelligence.service';
import { UsageService } from '../usage/usage.service';
import { PostsService } from '../posts/posts.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { EMBEDDING_QUEUE } from '@core/queue/queue.module';

@Injectable()
export class ProductsService implements OnModuleInit {
  private readonly logger = new Logger(ProductsService.name);

  async onModuleInit() {
    this.logger.log('Running orphan barcode mapper...');
    try {
      const manualEntries = await this.prisma.barcodeCatalogEntry.findMany({
        where: { source: 'MANUAL' },
        include: { translations: true },
      });

      let mappedCount = 0;
      for (const entry of manualEntries) {
        if (!entry.translations || entry.translations.length === 0) continue;
        const productName = entry.translations[0].productName;
        if (!productName) continue;

        const updateResult = await this.prisma.product.updateMany({
          where: { name: productName, barcode: null },
          data: { barcode: entry.barcode }
        });
        mappedCount += updateResult.count;
      }
      this.logger.log(`Mapped ${mappedCount} orphan manual barcodes to products.`);
    } catch (error) {
      this.logger.error('Failed to run orphan barcode mapper', error);
    }
  }

  // Cache key patterns for consistent naming
  private readonly CACHE_KEYS = {
    PRODUCT: (id: number) => `product:${id}`,
    PRODUCTS_LIST: (
      orgId: number,
      page: number,
      limit: number,
      search?: string,
      order?: string,
      status?: string,
    ) =>
      `products:org:${orgId}:page:${page}:limit:${limit}${search ? `:search:${search}` : ''}${order ? `:order:${order}` : ''}${status ? `:status:${status}` : ''}`,
    PRODUCT_DETAILS: (id: number) => `product:${id}:details`,
    ORG_PRODUCTS: (orgId: number) => `org:${orgId}:products`,
    SCHEMA_PRODUCTS: (schemaId: number) => `schema:${schemaId}:products`,
    PRODUCT_LOCK: (id: number) => `product:${id}:lock`,
  };

  // TTL values in seconds
  private readonly TTL = {
    PRODUCT: 600, // 10 minutes - product data changes infrequently
    PRODUCTS_LIST: 300, // 5 minutes - list data changes more frequently
    PRODUCT_DETAILS: 600, // 10 minutes - details change infrequently
    ORG_PRODUCTS: 900, // 15 minutes - organization product list
    SCHEMA_PRODUCTS: 1200, // 20 minutes - schema-based product lists
    LOCK: 30, // 30 seconds - lock timeout for cache stampede protection
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly fileDeleteService: FileDeleteService,
    private readonly activityLogService: ActivityLogService,
    @InjectQueue(EMBEDDING_QUEUE) private readonly embeddingQueue: Queue,
    @Optional() private readonly customerIntelligenceService?: CustomerIntelligenceService,
    @Optional() private readonly usageService?: UsageService,
    @Optional() private readonly postsService?: PostsService,
  ) {}

  // ==================== CACHE HELPER METHODS ====================

  /**
   * Generic cache get method with type safety and error handling
   */
  private async getFromCache<T>(key: string): Promise<T | null> {
    try {
      return await this.redis.get<T>(key);
    } catch (error) {
      this.logger.warn(`Cache get failed for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Generic cache set method with TTL and error handling
   */
  private async setCache<T>(key: string, value: T, ttl: number): Promise<void> {
    try {
      await this.redis.set(key, value, ttl);
    } catch (error) {
      this.logger.warn(`Cache set failed for key ${key}:`, error);
    }
  }

  /**
   * Get or set cache with stampede protection
   * Implements cache-aside pattern with double-checked locking
   */
  private async getOrSetCache<T>(
    key: string,
    ttl: number,
    factory: () => Promise<T>,
    lockKey?: string,
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.getFromCache<T>(key);
    if (cached !== null) {
      return cached;
    }

    // If lock key provided, implement stampede protection
    if (lockKey) {
      const lockAcquired = await this.acquireLock(lockKey);
      if (!lockAcquired) {
        // Another process is building the cache, wait and retry
        await this.sleep(100);
        const retryCached = await this.getFromCache<T>(key);
        if (retryCached !== null) {
          return retryCached;
        }
      }
    }

    try {
      // Generate the data
      const data = await factory();

      // Cache the result
      await this.setCache(key, data, ttl);

      return data;
    } finally {
      // Release lock if we acquired it
      if (lockKey) {
        await this.releaseLock(lockKey);
      }
    }
  }

  /**
   * Acquire a distributed lock for cache stampede protection
   */
  private async acquireLock(lockKey: string): Promise<boolean> {
    try {
      // Use Redis SET with NX and PX for atomic lock acquisition
      return await this.redis.setNx(lockKey, 'locked', this.TTL.LOCK);
    } catch (error) {
      this.logger.warn(`Lock acquisition failed for ${lockKey}:`, error);
      return false;
    }
  }

  /**
   * Release a distributed lock
   */
  private async releaseLock(lockKey: string): Promise<void> {
    try {
      await this.redis.del(lockKey);
    } catch (error) {
      this.logger.warn(`Lock release failed for ${lockKey}:`, error);
    }
  }

  /**
   * Sleep utility for retry logic
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Invalidate cache by key pattern
   */
  private async invalidateCache(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.delMultiple(keys);
      }
    } catch (error) {
      this.logger.warn(
        `Cache invalidation failed for pattern ${pattern}:`,
        error,
      );
    }
  }

  /**
   * Invalidate all product-related caches for an organization
   */
  async invalidateOrganizationProductCaches(
    organizationId: number,
  ): Promise<void> {
    const patterns = [
      `products:org:${organizationId}:*`,
      `org:${organizationId}:products`,
    ];

    await Promise.all(patterns.map((pattern) => this.invalidateCache(pattern)));
  }

  /**
   * Invalidate all caches for a specific product
   */
  private async invalidateProductCaches(productId: number): Promise<void> {
    const patterns = [`product:${productId}*`];

    await Promise.all(patterns.map((pattern) => this.invalidateCache(pattern)));
  }

  /**
   * Invalidate schema-related product caches
   */
  async invalidateSchemaProductCaches(schemaId: number): Promise<void> {
    const patterns = [`schema:${schemaId}:products`];

    await Promise.all(patterns.map((pattern) => this.invalidateCache(pattern)));
  }

  /**
   * Coerces a raw field value to the JS type its schema field type expects.
   * JSON bodies commonly carry numbers/booleans as strings (e.g. "120",
   * "true"), which would otherwise fail validateFieldValue's typeof checks
   * even though the value is semantically valid.
   */
  private coerceFieldValue(fieldType: FieldType, value: any): any {
    if (value === null || value === undefined || value === '') return value;

    switch (fieldType) {
      case FieldType.NUMBER:
        if (typeof value === 'string' && value.trim() !== '' && !isNaN(Number(value))) {
          return Number(value);
        }
        return value;
      case FieldType.BOOLEAN:
        if (typeof value === 'string') {
          if (value.toLowerCase() === 'true') return true;
          if (value.toLowerCase() === 'false') return false;
        }
        return value;
      default:
        return value;
    }
  }

  /**
   * Validates field value based on field type and requirements
   */
  private validateFieldValue(
    field: { type: FieldType; required: boolean; options?: string[]; name?: string },
    value: any,
  ): void {
    if (
      field.required &&
      (value === null || value === undefined || value === '')
    ) {
      const fieldName = field.name || field.type;
      throw new BadRequestException(`Field "${fieldName}" is required`);
    }

    if (value === null || value === undefined || value === '') {
      return; // Optional field can be empty
    }

    switch (field.type) {
      case FieldType.TEXT:
        if (typeof value !== 'string') {
          throw new BadRequestException('Text field must be a string');
        }
        break;
      case FieldType.NUMBER:
        if (typeof value !== 'number') {
          throw new BadRequestException('Number field must be a number');
        }
        break;
      case FieldType.BOOLEAN:
        if (typeof value !== 'boolean') {
          throw new BadRequestException('Boolean field must be a boolean');
        }
        break;
      case FieldType.DATE:
        if (!(value instanceof Date) && typeof value !== 'string') {
          throw new BadRequestException(
            'Date field must be a date or date string',
          );
        }
        break;
      case FieldType.ENUM:
        if (typeof value !== 'string') {
          throw new BadRequestException('Enum field must be a string');
        }
        if (field.options && !field.options.includes(value)) {
          throw new BadRequestException(
            `Enum value must be one of: ${field.options.join(', ')}`,
          );
        }
        break;
      default:
        throw new BadRequestException(`Unsupported field type: ${field.type}`);
    }
  }

  /**
   * Validates file ownership for images and file fields
   */
  private async validateFileOwnership(
    fileIds: number[],
    organizationId: number,
  ): Promise<void> {
    if (!fileIds || fileIds.length === 0) return;

    const files = await this.prisma.file.findMany({
      where: { id: { in: fileIds } },
      select: { id: true, organizationId: true },
    });

    if (files.length !== fileIds.length) {
      throw new BadRequestException('One or more files not found');
    }

    const invalidFiles = files.filter(
      (file) => file.organizationId !== organizationId,
    );
    if (invalidFiles.length > 0) {
      throw new BadRequestException(
        'One or more files do not belong to your organization',
      );
    }
  }

  /**
   * Transforms field value to the appropriate Prisma field
   */
  private transformFieldValue(fieldType: FieldType, value: any) {
    const result: any = {};

    switch (fieldType) {
      case FieldType.TEXT:
        result.valueText = value;
        break;
      case FieldType.NUMBER:
        result.valueNumber = value;
        break;
      case FieldType.BOOLEAN:
        result.valueBool = value;
        break;
      case FieldType.DATE:
        result.valueDate = value instanceof Date ? value : new Date(value);
        break;
      case FieldType.ENUM:
        result.valueJson = value;
        break;
    }

    return result;
  }

  /**
   * Transforms Prisma field value to response format
   */
  private transformFieldValueResponse(
    fieldValue: any,
    field: any,
  ): FieldValueResponseDto {
    return {
      id: fieldValue.id,
      fieldId: fieldValue.fieldId,
      fieldName: field.name,
      fieldType: field.type,
      valueText: fieldValue.valueText,
      valueNumber: fieldValue.valueNumber,
      valueBool: fieldValue.valueBool,
      valueDate: fieldValue.valueDate,
      valueJson: fieldValue.valueJson,
    };
  }

  /**
   * Gets user's organization ID
   */
  private async getUserOrganizationId(userId: number): Promise<number> {
    const member = await this.prisma.member.findUnique({
      where: { userId },
      select: { organizationId: true },
    });

    if (!member) {
      throw new NotFoundException('User organization not found');
    }

    return member.organizationId;
  }

  /**
   * Creates a new product
   */
  async createProduct(
    userId: number,
    createProductDto: CreateProductDto,
  ): Promise<ProductResponseDto> {
    try {
      const organizationId = await this.getUserOrganizationId(userId);
      if (this.usageService) {
        await this.usageService.checkProductLimit(organizationId);
      }

      // Validate category if provided
      let category: any = null;
      if (createProductDto.categoryId) {
        category = await this.prisma.category.findUnique({
          where: { id: createProductDto.categoryId },
          include: { itemSpecs: true },
        });

        if (!category) {
          throw new NotFoundException('Category not found');
        }
      }

      // Validate images if provided
      if (createProductDto.images && createProductDto.images.length > 0) {
        await this.validateFileOwnership(
          createProductDto.images,
          organizationId,
        );
      }
      // Validate item spec values
      let specMap = new Map();
      if (category && category.itemSpecs) {
        specMap = new Map(category.itemSpecs.map((spec) => [spec.id, spec]));
      }
      const itemSpecValues = createProductDto.itemSpecValues || [];
      for (const specValue of itemSpecValues) {
        const spec = specMap.get(specValue.itemSpecId);
        if (!spec) {
          throw new BadRequestException(
            `Item spec with ID ${specValue.itemSpecId} not found in category`,
          );
        }
        specValue.value = this.coerceFieldValue(spec.type, specValue.value);
        this.validateFieldValue(spec, specValue.value);
      }

      if (category && category.itemSpecs) {
        for (const spec of category.itemSpecs) {
          if (spec.required) {
            const hasValue = itemSpecValues.some(
              (val) => val.itemSpecId === spec.id && val.value !== null && val.value !== undefined && val.value !== ''
            );
            if (!hasValue) {
              throw new BadRequestException(`Field "${spec.name}" is required`);
            }
          }
        }
      }

      // Create product with field values in a transaction
      const result = await this.prisma.$transaction(async (tx) => {
        // Create the product
        const product = await tx.product.create({
          data: {
            name: createProductDto.name,
            barcode: createProductDto.barcode,
            price: createProductDto.price,
            quantity: createProductDto.quantity,
            status: createProductDto.status,
            currency: createProductDto.currency,
            categoryId: createProductDto.categoryId,
            organizationId,
            images: createProductDto.images
              ? {
                  connect: createProductDto.images.map((id) => ({ id })),
                }
              : undefined,
          },
        });

        if (itemSpecValues.length > 0) {
          await tx.itemSpecValue.createMany({
            data: itemSpecValues.map((specValue) => {
              const spec = specMap.get(specValue.itemSpecId)!;
              const transformedValue = this.transformFieldValue(
                spec.type,
                specValue.value,
              );
              return {
                productId: product.id,
                itemSpecId: specValue.itemSpecId,
                ...transformedValue,
              };
            }),
          });
        }

        return { product };
      });

      this.logger.log(`Product created successfully: ${result.product.id}`);

      // Activity log is fire-and-forget — it's an audit trail, not something
      // the create-product response should ever wait on.
      this.activityLogService
        .createLog({
          userId,
          organizationId,
          entityType: EntityType.PRODUCT,
          entityId: result.product.id,
          action: ActionType.CREATE,
          templateKey: 'PRODUCT_CREATED',
          data: { name: createProductDto.name },
        })
        .catch((err) =>
          this.logger.warn(`Activity log failed: ${err.message}`),
        );

      // Fetch full product details including images and dynamic fields
      const fullProduct = await this.getProductById(result.product.id, userId);

      // Embedding generation calls out to Weaviate/CLIP per image (CDN fetch +
      // inference) — queued in the background instead of blocking the
      // response; see EmbeddingModule/EmbeddingProcessor.
      this.embeddingQueue
        .add(
          'create-product-embedding',
          { productId: result.product.id },
          {
            jobId: `embed-${result.product.id}`,
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
            removeOnComplete: true,
            removeOnFail: 50,
          },
        )
        .catch((err) =>
          this.logger.warn(`Failed to enqueue embedding job: ${err.message}`),
        );

      // Invalidate organization product caches since a new product was created
      await this.invalidateOrganizationProductCaches(organizationId);

      // Invalidate category product caches if applicable
      if (createProductDto.categoryId) {
        // cache logic can be added later
      }

      // Notify customers who have shown interest in similar products (fire-and-forget)
      if (
        createProductDto.status === 'ACTIVE' &&
        this.customerIntelligenceService
      ) {
        const notifyProduct = result.product;
        this.customerIntelligenceService
          .notifyInterestedCustomers(notifyProduct as any, organizationId)
          .catch((err) =>
            this.logger.warn(`Interest notification failed: ${err.message}`),
          );
      }

      // Auto-publish the new product to the organization's connected channel
      // (fire-and-forget — product creation must never fail because of posting).
      if (
        createProductDto.status === 'ACTIVE' &&
        createProductDto.autoPublish !== false &&
        this.postsService
      ) {
        this.postsService
          .autoPostProduct(result.product.id, organizationId)
          .catch((err) =>
            this.logger.warn(`Auto-post to channel failed: ${err.message}`),
          );
      }

      return fullProduct;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `Failed to create product: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to create product');
    }
  }

  /**
   * Updates a product
   */
  async updateProduct(
    productId: number,
    userId: number,
    updateProductDto: UpdateProductDto,
  ): Promise<ProductResponseDto> {
    try {
      const organizationId = await this.getUserOrganizationId(userId);

      // Check if product exists and belongs to user's organization
      const existingProduct = await this.prisma.product.findFirst({
        where: { id: productId, organizationId },
        include: { category: { include: { itemSpecs: true } } },
      });

      if (!existingProduct) {
        throw new NotFoundException(
          'Product not found or does not belong to your organization',
        );
      }

      // Validate images if provided
      if (updateProductDto.images && updateProductDto.images.length > 0) {
        await this.validateFileOwnership(
          updateProductDto.images,
          organizationId,
        );
      }

      // Validate item spec values if provided
      if (updateProductDto.itemSpecValues && existingProduct.category) {
        const specMap = new Map(
          existingProduct.category.itemSpecs.map((spec) => [spec.id, spec]),
        );
        for (const specValue of updateProductDto.itemSpecValues) {
          if (specValue.itemSpecId) {
            const spec = specMap.get(specValue.itemSpecId);
            if (!spec) {
              throw new BadRequestException(
                `Item spec with ID ${specValue.itemSpecId} not found in category`,
              );
            }
            if (specValue.value !== undefined) {
              specValue.value = this.coerceFieldValue(
                spec.type,
                specValue.value,
              );
              this.validateFieldValue(spec, specValue.value);
            }
          }
        }
      }

      // Update product in a transaction
      const result = await this.prisma.$transaction(async (tx) => {
        // Update the product
        const product = await tx.product.update({
          where: { id: productId },
          data: {
            ...(updateProductDto.name && { name: updateProductDto.name }),
            ...(updateProductDto.barcode !== undefined && { barcode: updateProductDto.barcode }),
            ...(updateProductDto.price !== undefined && {
              price: updateProductDto.price,
            }),
            ...(updateProductDto.quantity !== undefined && {
              quantity: updateProductDto.quantity,
            }),
            ...(updateProductDto.status !== undefined && {
              status: updateProductDto.status,
            }),
            ...(updateProductDto.categoryId !== undefined && {
              categoryId: updateProductDto.categoryId,
            }),
            ...(updateProductDto.currency !== undefined && {
              currency: updateProductDto.currency,
            }),
            ...(updateProductDto.images && {
              images: {
                set: updateProductDto.images.map((id) => ({ id })),
              },
            }),
          },
        });

        // Update item spec values if provided
        if (updateProductDto.itemSpecValues && existingProduct.category) {
          for (const specValue of updateProductDto.itemSpecValues) {
            if (specValue.itemSpecId && specValue.value !== undefined) {
              const spec = existingProduct.category.itemSpecs.find(
                (f) => f.id === specValue.itemSpecId,
              );
              if (spec) {
                const transformedValue = this.transformFieldValue(
                  spec.type,
                  specValue.value,
                );

                await tx.itemSpecValue.upsert({
                  where: {
                    productId_itemSpecId: {
                      productId: productId,
                      itemSpecId: specValue.itemSpecId,
                    },
                  },
                  update: transformedValue,
                  create: {
                    productId: productId,
                    itemSpecId: specValue.itemSpecId,
                    ...transformedValue,
                  },
                });
              }
            }
          }
        }

        return product;
      });

      this.logger.log(`Product updated successfully: ${result.id}`);

      // Activity Log: Product Updated or Status Changed
      const oldStatus = existingProduct.status;
      const newStatus = result.status;
      if (oldStatus !== newStatus) {
        await this.activityLogService.createLog({
          userId,
          organizationId,
          entityType: EntityType.PRODUCT,
          entityId: result.id,
          action: ActionType.STATUS_CHANGE,
          templateKey: 'PRODUCT_STATUS_CHANGED',
          data: { name: result.name, oldStatus, newStatus },
          meta: { productId: result.id },
        });
      } else {
        await this.activityLogService.createLog({
          userId,
          organizationId,
          entityType: EntityType.PRODUCT,
          entityId: result.id,
          action: ActionType.UPDATE,
          templateKey: 'PRODUCT_UPDATED',
          data: { name: result.name },
          meta: { productId: result.id },
        });
      }

      // Invalidate all caches related to this product and organization
      await Promise.all([
        this.invalidateProductCaches(productId),
        this.invalidateOrganizationProductCaches(organizationId),
      ]);

      // Re-sync the Weaviate embedding so search reflects the new name/price/
      // description/images instead of drifting stale — background, non-blocking.
      this.embeddingQueue
        .add(
          'update-product-embedding',
          { productId: result.id },
          {
            jobId: `embed-update-${result.id}-${Date.now()}`,
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
            removeOnComplete: true,
            removeOnFail: 50,
          },
        )
        .catch((err) =>
          this.logger.warn(`Failed to enqueue embedding update job: ${err.message}`),
        );

      // Return the updated product with full details
      return this.getProductById(result.id, userId);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `Failed to update product ${productId}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to update product');
    }
  }

  /**
   * Deletes a product
   */
  async deleteProduct(productId: number, userId: number): Promise<void> {
    try {
      const organizationId = await this.getUserOrganizationId(userId);

      // Check if product exists and belongs to user's organization
      const product = await this.prisma.product.findFirst({
        where: { id: productId, organizationId },
        select: { id: true, name: true },
      });

      if (!product) {
        throw new NotFoundException(
          'Product not found or does not belong to your organization',
        );
      }

      // Get product images BEFORE database deletion
      const productWithImages = await this.prisma.product.findUnique({
        where: { id: productId },
        select: { images: { select: { key: true } } },
      });
      if (productWithImages?.images?.length) {
        const keys = productWithImages.images.map((img) => img.key);
        await this.fileDeleteService.deleteFilesByKeys(keys);
      }

      // Get product details before deletion for cache invalidation
      const productToDelete = await this.prisma.product.findUnique({
        where: { id: productId },
        select: { categoryId: true },
      });

      // Delete product (field values will be cascade deleted)
      await this.prisma.product.delete({
        where: { id: productId },
      });

      // Remove the product from the Weaviate search index too — otherwise a
      // deleted product stays returnable via text/image search forever.
      this.embeddingQueue
        .add(
          'delete-product-embedding',
          { productId },
          {
            jobId: `embed-delete-${productId}-${Date.now()}`,
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
            removeOnComplete: true,
            removeOnFail: 50,
          },
        )
        .catch((err) =>
          this.logger.warn(`Failed to enqueue embedding delete job: ${err.message}`),
        );

      // Invalidate all caches related to this product and organization
      await Promise.all([
        this.invalidateProductCaches(productId),
        this.invalidateOrganizationProductCaches(organizationId),
      ]);

      this.logger.log(`Product deleted successfully: ${productId}`);

      // Activity Log: Product Deleted
      await this.activityLogService.createLog({
        userId,
        organizationId,
        entityType: EntityType.PRODUCT,
        entityId: productId,
        action: ActionType.DELETE,
        templateKey: 'PRODUCT_DELETED',
        data: { name: product?.name || String(productId) },
        meta: { productId },
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Failed to delete product ${productId}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to delete product');
    }
  }

  /**
   * Gets a product by ID
   */
  async getProductById(
    productId: number,
    userId: number,
  ): Promise<ProductResponseDto> {
    try {
      const organizationId = await this.getUserOrganizationId(userId);

      // Create cache key for product details
      const cacheKey = this.CACHE_KEYS.PRODUCT_DETAILS(productId);
      const lockKey = this.CACHE_KEYS.PRODUCT_LOCK(productId);

      // Use getOrSetCache with stampede protection for individual products
      return await this.getOrSetCache(
        cacheKey,
        this.TTL.PRODUCT_DETAILS,
        async () => {
          const product = await this.prisma.product.findFirst({
            where: { id: productId, organizationId },
            include: {
              category: true,
              images: true,
              itemSpecValues: {
                include: {
                  itemSpec: true,
                },
              },
            },
          });

          if (!product) {
            throw new NotFoundException(
              'Product not found or does not belong to your organization',
            );
          }

          return this.toProductResponseDto(product);
        },
        lockKey, // Use lock key for stampede protection
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Failed to get product ${productId}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to retrieve product');
    }
  }

  private toProductResponseDto(product: {
    id: number;
    name: string;
    price: number;
    quantity: number;
    currency: any;
    status: any;
    categoryId: number | null;
    category?: { id: number, name_uz: string, name_ru: string, name_en: string } | null;
    organizationId: number;
    images: {
      id: number;
      key: string;
      url: string;
      originalName: string;
      size: number;
      mimeType: string;
    }[];
    itemSpecValues: any[];
    createdAt: Date;
    updatedAt: Date;
  }): ProductResponseDto {
    const transformedFields: FieldValueResponseDto[] = product.itemSpecValues.map(
      (specValue) =>
        this.transformFieldValueResponse(specValue, specValue.itemSpec),
    );

    const transformedImages: ProductImageResponseDto[] = product.images.map(
      (image) => ({
        id: image.id,
        key: image.key,
        url: image.url,
        originalName: image.originalName,
        size: image.size,
        mimeType: image.mimeType,
      }),
    );

    return {
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: product.quantity,
      currency: product.currency,
      status: product.status,
      categoryId: product.categoryId,
      category: product.category ? {
        id: product.category.id,
        name_uz: product.category.name_uz,
        name_ru: product.category.name_ru,
        name_en: product.category.name_en,
      } : null,
      organizationId: product.organizationId,
      images: transformedImages,
      itemSpecValues: transformedFields,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }

  /**
   * Fetches a product with no organization/user scoping — for background
   * jobs (e.g. embedding generation) that only have a productId and no
   * request context. Not cached: called once per product, not a hot path.
   */
  async getProductForEmbedding(
    productId: number,
  ): Promise<ProductResponseDto | null> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        category: true,
        images: true,
        itemSpecValues: { include: { itemSpec: true } },
      },
    });
    if (!product) return null;
    return this.toProductResponseDto(product);
  }

  /**
   * Full details (all dynamic fields, not just "description") for a small,
   * explicit set of product IDs — used to give the AI chat real data about
   * products it just showed the customer, so follow-up questions (color,
   * warranty, spec, quantity...) can be answered directly instead of
   * re-searching. Bounded to the given IDs, so cost stays flat regardless
   * of catalog size — never call this with a large/unbounded ID list.
   */
  async getProductsForAiContext(
    productIds: number[],
    organizationId: number,
  ): Promise<ProductResponseDto[]> {
    if (productIds.length === 0) return [];
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, organizationId, isDeleted: false },
      include: {
        category: true,
        images: true,
        itemSpecValues: { include: { itemSpec: true } },
      },
    });
    return products.map((p) => this.toProductResponseDto(p));
  }

  /**
   * Gets products with pagination and search
   */
  async getProducts(
    userId: number,
    paginationDto: PaginationDto,
  ): Promise<ProductPaginatedResponseDto> {
    try {
      const organizationId = await this.getUserOrganizationId(userId);
      const { page, limit, search, order, status } = paginationDto;

      // Create cache key for this specific query
      const cacheKey = this.CACHE_KEYS.PRODUCTS_LIST(
        organizationId,
        page || 1,
        limit || 20,
        search,
        order,
        status,
      );

      // Use getOrSetCache with stampede protection
      return await this.getOrSetCache(
        cacheKey,
        this.TTL.PRODUCTS_LIST,
        async () => {
          const skip = paginationDto.skip;
          const take = paginationDto.take;

          // Build the where clause
          const where: any = {
            organizationId,
          };

          // Add search filter if provided
          if (search && search.trim()) {
            const searchTerm = search.trim();
            where.OR = [
              {
                name: {
                  contains: searchTerm,
                  mode: 'insensitive',
                },
              },
              {
                barcode: {
                  contains: searchTerm,
                  mode: 'insensitive',
                },
              },
              {
                itemSpecValues: {
                  some: {
                    OR: [
                      {
                        valueText: {
                          contains: searchTerm,
                          mode: 'insensitive',
                        },
                      },
                      {
                        valueJson: {
                          path: ['$'],
                          string_contains: searchTerm,
                        },
                      },
                    ],
                  },
                },
              },
            ];
          }

          // Add status filter if provided
          if (status && status.trim()) {
            where.status = status.trim() as ProductStatus;
          }

          // Build the orderBy clause
          const orderBy = {
            createdAt: order,
          };

          // Execute queries in parallel for better performance
          const [products, total] = await Promise.all([
            this.prisma.product.findMany({
              where,
              orderBy,
              skip,
              take,
              include: {
                category: true,
                images: {
                  select: {
                    id: true,
                    key: true,
                    url: true,
                  },
                },
                itemSpecValues: {
                  include: {
                    itemSpec: true,
                  },
                },
              },
            }),
            this.prisma.product.count({
              where,
            }),
          ]);

          // Transform the response
          const transformedProducts: ProductResponseDto[] = products.map(
            (product) => {
              const transformedFields: FieldValueResponseDto[] =
                product.itemSpecValues.map((specValue) =>
                  this.transformFieldValueResponse(
                    specValue,
                    specValue.itemSpec,
                  ),
                );

              const transformedImages: ProductImageResponseDto[] =
                product.images.map((image) => ({
                  id: image.id,
                  key: image.key,
                  url: image.url,
                }));

              return {
                id: product.id,
                name: product.name,
                price: product.price,
                quantity: product.quantity,
                status: product.status,
                categoryId: product.categoryId,
                category: product.category ? {
                  id: product.category.id,
                  name_uz: product.category.name_uz,
                  name_ru: product.category.name_ru,
                  name_en: product.category.name_en,
                } : null,
                organizationId: product.organizationId,
                currency: product.currency,
                images: transformedImages,
                itemSpecValues: transformedFields,
                createdAt: product.createdAt,
                updatedAt: product.updatedAt,
              };
            },
          );

          this.logger.log(
            `Retrieved ${products.length} products for organization ${organizationId} (page ${page}, total: ${total})`,
          );

          return new ProductPaginatedResponseDto(
            transformedProducts,
            total,
            page || 1,
            limit || 20,
          );
        },
        // No lock key needed for list queries as they're less prone to stampede
      );
    } catch (error) {
      this.logger.error(
        `Failed to get products for organization: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to retrieve products');
    }
  }
  /**
   * Bulk deletes products
   */
  async bulkDeleteProducts(
    userId: number,
    productIds: number[],
  ): Promise<void> {
    try {
      if (!productIds || productIds.length === 0) {
        throw new BadRequestException('No product IDs provided');
      }

      const organizationId = await this.getUserOrganizationId(userId);

      // Check if all products exist and belong to user's organization
      const products = await this.prisma.product.findMany({
        where: { id: { in: productIds }, organizationId },
        select: { id: true, categoryId: true },
      });

      if (products.length !== productIds.length) {
        const foundIds = products.map((p) => p.id);
        const missingIds = productIds.filter((id) => !foundIds.includes(id));
        throw new NotFoundException(
          `Products not found or do not belong to your organization: ${missingIds.join(', ')}`,
        );
      }

      // Get unique schema IDs for cache invalidation
      const categoryIds = [...new Set(products.map((p) => p.categoryId))];

      // Delete products in a transaction
      await this.prisma.$transaction(
        productIds.map((id) =>
          this.prisma.product.delete({
            where: { id },
          }),
        ),
      );

      // Invalidate all caches related to deleted products and organization
      await Promise.all([
        // Invalidate individual product caches
        ...productIds.map((id) => this.invalidateProductCaches(id)),
        // Invalidate organization product caches
        this.invalidateOrganizationProductCaches(organizationId),
        // Invalidate schema product caches
        
      ]);

      this.logger.log(`Successfully deleted ${products.length} products`);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `Failed to bulk delete products: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to delete products');
    }
  }

  async getProductsForOrganization(
    organizationId: number,
  ): Promise<{ id: number; name: string; price: number; currency: string; description: string; imageKey: string | null; quantity: number }[]> {
    const products = await this.prisma.product.findMany({
      where: { organizationId, isDeleted: false, status: ProductStatus.ACTIVE },
      select: {
        id: true,
        name: true,
        price: true,
        currency: true,
        quantity: true,
        itemSpecValues: {
          select: {
            valueText: true,
            itemSpec: { select: { name: true } },
          },
        },
        images: {
          select: { url: true },
          take: 1,
        },
      },
    });

    return products.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      currency: String(p.currency),
      description:
        p.itemSpecValues.find((f) => f.itemSpec.name.toLowerCase() === 'description')
          ?.valueText || '',
      // Full ImageKit CDN URL; consumers send it to Telegram as-is.
      imageKey: p.images[0]?.url ?? null,
      quantity: p.quantity,
    }));
  }
}
