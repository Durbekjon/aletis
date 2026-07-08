import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { ProductImportService } from './product-import.service';
import { ProductEmbeddingProcessor } from './product-embedding.processor';
import { PrismaModule } from '@/core/prisma/prisma.module';
import { RedisModule } from '@/core/redis/redis.module';
import { FileDeleteModule } from '@/core/file-delete/file-delete.module';
import { ActivityLogModule } from '../activity-log/activity-log.module';
import { EmbadingModule } from '../embading/embading.module';
import { CustomerIntelligenceModule } from '../customer-intelligence/customer-intelligence.module';
import { UsageModule } from '../usage/usage.module';
import { EMBEDDING_QUEUE } from '@core/queue/queue.module';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    FileDeleteModule,
    ActivityLogModule,
    EmbadingModule,
    CustomerIntelligenceModule,
    UsageModule,
    BullModule.registerQueue({ name: EMBEDDING_QUEUE }),
  ],
  controllers: [ProductsController],
  providers: [ProductsService, ProductImportService, ProductEmbeddingProcessor],
  exports: [ProductsService],
})
export class ProductsModule {}
