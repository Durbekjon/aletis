import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { PrismaModule } from '@core/prisma/prisma.module';
import { RedisModule } from '@core/redis/redis.module';
import { AnalyticsScheduler } from './analytics.scheduler';
import { UsageModule } from '../usage/usage.module';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [PrismaModule, RedisModule, UsageModule, BillingModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, AnalyticsScheduler],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}


