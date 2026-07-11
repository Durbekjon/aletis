import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { RETENTION_QUEUE } from '@core/queue/queue.module';

/**
 * Registers the daily dormant-customer sweep as a BullMQ repeatable job so
 * the schedule persists in Redis and survives process restarts/deploys — the
 * previous hand-rolled setTimeout/setInterval timer silently skipped a day
 * whenever the process wasn't up at the scheduled hour. The actual scan runs
 * in RetentionProcessor (job name 'daily-scan').
 */
@Injectable()
export class RetentionScheduler implements OnModuleInit {
  private readonly logger = new Logger(RetentionScheduler.name);

  constructor(@InjectQueue(RETENTION_QUEUE) private readonly queue: Queue) {}

  async onModuleInit(): Promise<void> {
    await this.queue.upsertJobScheduler(
      'daily-retention-scan',
      { pattern: '0 9 * * *', tz: 'UTC' }, // 09:00 UTC daily — a sensible hour to reach customers
      { name: 'daily-scan', opts: { removeOnComplete: true, removeOnFail: 50 } },
    );
    this.logger.log('Daily retention scan registered (BullMQ repeatable, 09:00 UTC)');
  }
}
