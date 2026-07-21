import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ORDER_PAYMENT_REMINDER_QUEUE } from '@core/queue/queue.module';
import {
  OrderPaymentReminderJobData,
  OrderPaymentReminderService,
} from './order-payment-reminder.service';

@Processor(ORDER_PAYMENT_REMINDER_QUEUE, { concurrency: 2 })
export class OrderPaymentReminderProcessor extends WorkerHost {
  private readonly logger = new Logger(OrderPaymentReminderProcessor.name);

  constructor(private readonly service: OrderPaymentReminderService) {
    super();
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case 'payment-reminder': {
        const { orderId, step } = job.data as OrderPaymentReminderJobData;
        this.logger.log(`[Job ${job.id}] Running order #${orderId} payment reminder step ${step}`);
        await this.service.runReminderStep(orderId, step);
        break;
      }
      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
    }
  }
}
