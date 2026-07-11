import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { BACKUP_QUEUE } from '@core/queue/queue.module';
import { BackupService } from './backup.service';

@Processor(BACKUP_QUEUE, { concurrency: 1 })
export class BackupProcessor extends WorkerHost {
  private readonly logger = new Logger(BackupProcessor.name);

  constructor(private readonly service: BackupService) {
    super();
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case 'run-backup': {
        this.logger.log(`[Job ${job.id}] Running daily DB backup`);
        try {
          await this.service.runBackup();
        } catch (err) {
          this.logger.error(`DB backup failed: ${err.message}`, err.stack);
        }
        break;
      }
      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
    }
  }
}
