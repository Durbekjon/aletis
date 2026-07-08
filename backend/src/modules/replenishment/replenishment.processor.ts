import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { REPLENISHMENT_QUEUE } from '@core/queue/queue.module';
import { ReplenishmentService } from './replenishment.service';

export type SendReminderJobData = {
  reminderId: number;
};

@Processor(REPLENISHMENT_QUEUE, { concurrency: 2 })
export class ReplenishmentProcessor extends WorkerHost {
  private readonly logger = new Logger(ReplenishmentProcessor.name);

  constructor(private readonly service: ReplenishmentService) {
    super();
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case 'send-reminder': {
        const { reminderId } = job.data as SendReminderJobData;
        this.logger.log(`[Job ${job.id}] Running replenishment #${reminderId}`);
        await this.service.runReminder(reminderId);
        break;
      }
      case 'daily-scan': {
        this.logger.log(`[Job ${job.id}] Running daily replenishment scan (all orgs)`);
        try {
          await this.service.scanAllOrganizations();
        } catch (err) {
          this.logger.warn(`Daily replenishment scan failed: ${err.message}`);
        }
        break;
      }
      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
    }
  }
}
