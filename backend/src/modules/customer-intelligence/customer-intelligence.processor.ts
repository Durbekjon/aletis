import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { CUSTOMER_INTELLIGENCE_QUEUE } from '@core/queue/queue.module';
import { CustomerIntelligenceService } from './customer-intelligence.service';

export type AnalyzeCustomerJobData = {
  customerId: number;
  organizationId: number;
};

export type SendFollowUpJobData = {
  orderId: number;
};

@Processor(CUSTOMER_INTELLIGENCE_QUEUE, { concurrency: 2 })
export class CustomerIntelligenceProcessor extends WorkerHost {
  private readonly logger = new Logger(CustomerIntelligenceProcessor.name);

  constructor(private readonly service: CustomerIntelligenceService) {
    super();
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case 'analyze-customer': {
        const { customerId, organizationId } = job.data as AnalyzeCustomerJobData;
        this.logger.log(`[Job ${job.id}] Analyzing customer ${customerId}`);
        await this.service.analyzeCustomer(customerId, organizationId);
        break;
      }
      case 'send-follow-up': {
        const { orderId } = job.data as SendFollowUpJobData;
        this.logger.log(`[Job ${job.id}] Sending follow-up for order ${orderId}`);
        await this.service.sendFollowUpForOrder(orderId);
        break;
      }
      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
    }
  }
}
