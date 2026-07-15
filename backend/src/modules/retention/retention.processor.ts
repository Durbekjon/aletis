import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { RETENTION_QUEUE } from '@core/queue/queue.module';
import { RetentionService } from './retention.service';

export type SendWinBackJobData = {
  attemptId: number;
  step?: number;
};

@Processor(RETENTION_QUEUE, { concurrency: 2 })
export class RetentionProcessor extends WorkerHost {
  private readonly logger = new Logger(RetentionProcessor.name);

  constructor(private readonly service: RetentionService) {
    super();
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case 'send-win-back': {
        const { attemptId, step } = job.data as SendWinBackJobData;
        this.logger.log(
          `[Job ${job.id}] Running win-back #${attemptId} step ${step ?? 1}`,
        );
        await this.service.runWinBackStep(attemptId, step ?? 1);
        break;
      }
      case 'daily-scan': {
        this.logger.log(`[Job ${job.id}] Running daily retention scan (all orgs)`);
        try {
          await this.service.scanAllOrganizations();
        } catch (err) {
          this.logger.warn(`Daily retention scan failed: ${err.message}`);
        }
        break;
      }
      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
    }
  }
}
