import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { REPLENISHMENT_QUEUE } from '@core/queue/queue.module';

/**
 * Registers the daily replenishment sweep as a BullMQ repeatable job so the
 * schedule persists in Redis and survives process restarts/deploys — the
 * previous hand-rolled setTimeout/setInterval timer silently skipped a day
 * whenever the process wasn't up at the scheduled hour. The actual scan runs
 * in ReplenishmentProcessor (job name 'daily-scan').
 */
@Injectable()
export class ReplenishmentScheduler implements OnModuleInit {
  private readonly logger = new Logger(ReplenishmentScheduler.name);

  constructor(@InjectQueue(REPLENISHMENT_QUEUE) private readonly queue: Queue) {}

  async onModuleInit(): Promise<void> {
    await this.queue.upsertJobScheduler(
      'daily-replenishment-scan',
      { pattern: '0 10 * * *', tz: 'UTC' }, // 10:00 UTC daily — after the retention sweep
      { name: 'daily-scan', opts: { removeOnComplete: true, removeOnFail: 50 } },
    );
    this.logger.log('Daily replenishment scan registered (BullMQ repeatable, 10:00 UTC)');
  }
}
