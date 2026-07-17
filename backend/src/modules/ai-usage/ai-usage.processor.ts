import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { AI_COST_QUEUE } from '@core/queue/queue.module';
import { AiUsageService } from './ai-usage.service';

@Processor(AI_COST_QUEUE, { concurrency: 1 })
export class AiUsageProcessor extends WorkerHost {
  private readonly logger = new Logger(AiUsageProcessor.name);

  constructor(private readonly service: AiUsageService) {
    super();
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case 'daily-rollup': {
        this.logger.log(`[Job ${job.id}] Running daily AI cost rollup`);
        try {
          await this.service.rollupYesterday();
        } catch (err: any) {
          this.logger.warn(`Daily AI cost rollup failed: ${err.message}`);
        }
        try {
          await this.service.pruneOldLogs();
        } catch (err: any) {
          this.logger.warn(`AI usage log pruning failed: ${err.message}`);
        }
        break;
      }
      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
    }
  }
}
