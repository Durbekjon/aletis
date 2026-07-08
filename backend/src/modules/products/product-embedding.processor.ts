import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { EMBEDDING_QUEUE } from '@core/queue/queue.module';
import { ProductsService } from './products.service';
import { EmbadingService } from '@modules/embading/embading.service';

export type CreateProductEmbeddingJobData = { productId: number };

@Processor(EMBEDDING_QUEUE, { concurrency: 3 })
export class ProductEmbeddingProcessor extends WorkerHost {
  private readonly logger = new Logger(ProductEmbeddingProcessor.name);

  constructor(
    private readonly productsService: ProductsService,
    private readonly embadingService: EmbadingService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case 'create-product-embedding': {
        const { productId } = job.data as CreateProductEmbeddingJobData;
        const product = await this.productsService.getProductForEmbedding(productId);
        if (!product) {
          this.logger.warn(
            `[Job ${job.id}] Product ${productId} no longer exists — skipping embedding`,
          );
          return;
        }
        await this.embadingService.createProductEmbedding(product);
        this.logger.log(`[Job ${job.id}] Embedded product ${productId}`);
        break;
      }
      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
    }
  }
}
