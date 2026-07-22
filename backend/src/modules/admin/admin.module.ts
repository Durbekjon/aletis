import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AiUsageModule } from '@modules/ai-usage/ai-usage.module';
import { EmbadingModule } from '@modules/embading/embading.module';
import {
  CUSTOMER_INTELLIGENCE_QUEUE,
  RETENTION_QUEUE,
  REPLENISHMENT_QUEUE,
  BACKUP_QUEUE,
  EMBEDDING_QUEUE,
  CAMPAIGN_QUEUE,
  INSTAGRAM_TOKEN_REFRESH_QUEUE,
  AI_COST_QUEUE,
} from '@core/queue/queue.module';
import { AdminAiCostController } from './admin-ai-cost.controller';
import { AdminRevenueController } from './admin-revenue.controller';
import { AdminRevenueService } from './admin-revenue.service';
import { AdminOrgsController } from './admin-orgs.controller';
import { AdminOrgsService } from './admin-orgs.service';
import { AdminJobsController } from './admin-jobs.controller';
import { AdminJobsService } from './admin-jobs.service';
import { AdminProductsController } from './admin-products.controller';
import { AdminProductsService } from './admin-products.service';

@Module({
  imports: [
    AiUsageModule,
    EmbadingModule,
    BullModule.registerQueue(
      { name: CUSTOMER_INTELLIGENCE_QUEUE },
      { name: RETENTION_QUEUE },
      { name: REPLENISHMENT_QUEUE },
      { name: BACKUP_QUEUE },
      { name: EMBEDDING_QUEUE },
      { name: CAMPAIGN_QUEUE },
      { name: INSTAGRAM_TOKEN_REFRESH_QUEUE },
      { name: AI_COST_QUEUE },
    ),
  ],
  controllers: [
    AdminAiCostController,
    AdminRevenueController,
    AdminOrgsController,
    AdminJobsController,
    AdminProductsController,
  ],
  providers: [
    AdminRevenueService,
    AdminOrgsService,
    AdminJobsService,
    AdminProductsService,
  ],
})
export class AdminModule {}
