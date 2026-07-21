import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CoreModule } from '@core/core.module';
import { AI_COST_QUEUE } from '@core/queue/queue.module';
import { AiUsageService } from './ai-usage.service';
import { AiUsageScheduler } from './ai-usage.scheduler';
import { AiUsageProcessor } from './ai-usage.processor';

@Module({
  imports: [CoreModule, BullModule.registerQueue({ name: AI_COST_QUEUE })],
  providers: [AiUsageService, AiUsageScheduler, AiUsageProcessor],
  exports: [AiUsageService],
})
export class AiUsageModule {}
