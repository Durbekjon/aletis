import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  CUSTOMER_INTELLIGENCE_QUEUE,
  RETENTION_QUEUE,
  REPLENISHMENT_QUEUE,
  BACKUP_QUEUE,
  EMBEDDING_QUEUE,
  CAMPAIGN_QUEUE,
  INSTAGRAM_TOKEN_REFRESH_QUEUE,
  AI_COST_QUEUE,
} from '@core/queue/queue.module';

@Injectable()
export class AdminJobsService {
  private readonly queues: Record<string, Queue>;

  constructor(
    @InjectQueue(CUSTOMER_INTELLIGENCE_QUEUE) customerIntelligence: Queue,
    @InjectQueue(RETENTION_QUEUE) retention: Queue,
    @InjectQueue(REPLENISHMENT_QUEUE) replenishment: Queue,
    @InjectQueue(BACKUP_QUEUE) backup: Queue,
    @InjectQueue(EMBEDDING_QUEUE) embedding: Queue,
    @InjectQueue(CAMPAIGN_QUEUE) campaign: Queue,
    @InjectQueue(INSTAGRAM_TOKEN_REFRESH_QUEUE) instagramTokenRefresh: Queue,
    @InjectQueue(AI_COST_QUEUE) aiCost: Queue,
  ) {
    this.queues = {
      [CUSTOMER_INTELLIGENCE_QUEUE]: customerIntelligence,
      [RETENTION_QUEUE]: retention,
      [REPLENISHMENT_QUEUE]: replenishment,
      [BACKUP_QUEUE]: backup,
      [EMBEDDING_QUEUE]: embedding,
      [CAMPAIGN_QUEUE]: campaign,
      [INSTAGRAM_TOKEN_REFRESH_QUEUE]: instagramTokenRefresh,
      [AI_COST_QUEUE]: aiCost,
    };
  }

  async getQueueHealth() {
    const names = Object.keys(this.queues);
    const counts = await Promise.all(
      names.map(async (name) => {
        const queue = this.queues[name];
        const jobCounts = await queue.getJobCounts(
          'waiting',
          'active',
          'completed',
          'failed',
          'delayed',
        );
        return { name, ...jobCounts };
      }),
    );
    return counts;
  }

  async getRecentFailures(limitPerQueue = 10) {
    const names = Object.keys(this.queues);
    const failuresByQueue = await Promise.all(
      names.map(async (name) => {
        const queue = this.queues[name];
        const failedJobs = await queue.getFailed(0, limitPerQueue - 1);
        return {
          queue: name,
          failures: failedJobs.map((job) => ({
            id: job.id,
            jobName: job.name,
            failedReason: job.failedReason,
            attemptsMade: job.attemptsMade,
            timestamp: job.finishedOn ? new Date(job.finishedOn).toISOString() : null,
          })),
        };
      }),
    );
    return failuresByQueue.filter((q) => q.failures.length > 0);
  }
}
