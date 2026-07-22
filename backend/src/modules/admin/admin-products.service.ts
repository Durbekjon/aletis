import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '@core/prisma/prisma.service';
import { ProductStatus } from '@prisma/client';
import { EMBEDDING_QUEUE } from '@core/queue/queue.module';
import { EmbadingService } from '@modules/embading/embading.service';

@Injectable()
export class AdminProductsService {
  private readonly logger = new Logger(AdminProductsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly embadingService: EmbadingService,
    @InjectQueue(EMBEDDING_QUEUE) private readonly embeddingQueue: Queue,
  ) {}

  /**
   * One-off backfill/repair for the Weaviate product index, meant to be run
   * once after shipping update/delete embedding sync: Postgres is the
   * source of truth. Two passes:
   *  1. Delete any Weaviate Product whose id no longer exists (or is no
   *     longer active) in Postgres — cleans up ghosts from deletes that
   *     happened before delete-on-delete sync existed.
   *  2. Enqueue a re-embed job for every currently active product — repairs
   *     entries that drifted stale from edits that happened before
   *     update-on-update sync existed, and backfills any that were never
   *     embedded at all.
   * Re-embedding is queued (not run inline) since it fetches + CLIP-encodes
   * every product image; that shouldn't block this HTTP request or hammer
   * the CLIP container all at once — the existing embedding processor
   * (concurrency 3) drains it in the background.
   */
  async reindexEmbeddings(): Promise<{ orphansRemoved: number; enqueued: number }> {
    const activeProducts = await this.prisma.product.findMany({
      where: { isDeleted: false, status: ProductStatus.ACTIVE },
      select: { id: true },
    });
    const liveIds = new Set(activeProducts.map((p) => p.id));

    const orphansRemoved = await this.embadingService.sweepOrphanedEmbeddings(liveIds);
    this.logger.log(`Reindex: removed ${orphansRemoved} orphaned Weaviate product(s)`);

    for (const { id } of activeProducts) {
      await this.embeddingQueue.add(
        'update-product-embedding',
        { productId: id },
        {
          jobId: `embed-reindex-${id}-${Date.now()}`,
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: true,
          removeOnFail: 50,
        },
      );
    }

    this.logger.log(`Reindex: enqueued ${activeProducts.length} product(s) for re-embedding`);
    return { orphansRemoved, enqueued: activeProducts.length };
  }
}
