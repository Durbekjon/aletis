import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { INSTAGRAM_TOKEN_REFRESH_QUEUE } from '@core/queue/queue.module';
import { InstagramService } from './instagram.service';

@Processor(INSTAGRAM_TOKEN_REFRESH_QUEUE, { concurrency: 1 })
export class InstagramTokenRefreshProcessor extends WorkerHost {
  private readonly logger = new Logger(InstagramTokenRefreshProcessor.name);

  constructor(private readonly instagramService: InstagramService) {
    super();
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case 'refresh-expiring-tokens': {
        this.logger.log(`[Job ${job.id}] Refreshing expiring Instagram tokens`);
        try {
          await this.instagramService.refreshExpiringTokens();
        } catch (err: any) {
          this.logger.warn(`Instagram token refresh sweep failed: ${err.message}`);
        }
        break;
      }
      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
    }
  }
}
