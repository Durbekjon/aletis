import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { AI_COST_QUEUE } from '@core/queue/queue.module';

/**
 * Registers the nightly AI-cost rollup as a BullMQ repeatable job (same
 * pattern as RetentionScheduler) so it survives restarts/deploys. Runs
 * before analytics' 00:30 UTC slot.
 */
@Injectable()
export class AiUsageScheduler implements OnModuleInit {
  private readonly logger = new Logger(AiUsageScheduler.name);

  constructor(@InjectQueue(AI_COST_QUEUE) private readonly queue: Queue) {}

  async onModuleInit(): Promise<void> {
    await this.queue.upsertJobScheduler(
      'daily-ai-cost-rollup',
      { pattern: '15 0 * * *', tz: 'UTC' },
      { name: 'daily-rollup', opts: { removeOnComplete: true, removeOnFail: 50 } },
    );
    this.logger.log('Daily AI cost rollup registered (BullMQ repeatable, 00:15 UTC)');
  }
}
