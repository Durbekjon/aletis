import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { CAMPAIGN_QUEUE } from '@core/queue/queue.module';
import { CampaignsService } from './campaigns.service';

export type RunCampaignJobData = { campaignId: number };

@Processor(CAMPAIGN_QUEUE, { concurrency: 1 })
export class CampaignsProcessor extends WorkerHost {
  private readonly logger = new Logger(CampaignsProcessor.name);

  constructor(private readonly service: CampaignsService) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name === 'run-campaign') {
      const { campaignId } = job.data as RunCampaignJobData;
      this.logger.log(`[Job ${job.id}] Running campaign #${campaignId}`);
      await this.service.runCampaign(campaignId);
    } else {
      this.logger.warn(`Unknown job name: ${job.name}`);
    }
  }
}
