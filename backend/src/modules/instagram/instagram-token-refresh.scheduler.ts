import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { INSTAGRAM_TOKEN_REFRESH_QUEUE } from '@core/queue/queue.module';

/**
 * Instagram long-lived tokens expire after ~60 days. Registers a daily BullMQ
 * repeatable job (persists in Redis, survives restarts) that proactively
 * refreshes any token expiring within 15 days — see
 * InstagramService.refreshExpiringTokens().
 */
@Injectable()
export class InstagramTokenRefreshScheduler implements OnModuleInit {
  private readonly logger = new Logger(InstagramTokenRefreshScheduler.name);

  constructor(@InjectQueue(INSTAGRAM_TOKEN_REFRESH_QUEUE) private readonly queue: Queue) {}

  async onModuleInit(): Promise<void> {
    await this.queue.upsertJobScheduler(
      'daily-instagram-token-refresh',
      { pattern: '0 3 * * *', tz: 'UTC' },
      { name: 'refresh-expiring-tokens', opts: { removeOnComplete: true, removeOnFail: 50 } },
    );
    this.logger.log('Daily Instagram token refresh registered (BullMQ repeatable, 03:00 UTC)');
  }
}
