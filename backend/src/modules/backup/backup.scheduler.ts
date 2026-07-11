import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { BACKUP_QUEUE } from '@core/queue/queue.module';

/**
 * Registers the daily DB backup as a BullMQ repeatable job — same pattern as
 * RetentionScheduler/ReplenishmentScheduler, persisted in Redis so it
 * survives process restarts/deploys. Runs at 02:00 UTC, off-peak and well
 * before the 09:00/10:00 retention/replenishment sweeps.
 */
@Injectable()
export class BackupScheduler implements OnModuleInit {
  private readonly logger = new Logger(BackupScheduler.name);

  constructor(@InjectQueue(BACKUP_QUEUE) private readonly queue: Queue) {}

  async onModuleInit(): Promise<void> {
    await this.queue.upsertJobScheduler(
      'daily-db-backup',
      { pattern: '0 2 * * *', tz: 'UTC' },
      { name: 'run-backup', opts: { removeOnComplete: true, removeOnFail: 20 } },
    );
    this.logger.log('Daily DB backup registered (BullMQ repeatable, 02:00 UTC)');
  }
}
