import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CoreModule } from '@core/core.module';
import { BACKUP_QUEUE } from '@core/queue/queue.module';
import { BackupService } from './backup.service';
import { BackupProcessor } from './backup.processor';
import { BackupScheduler } from './backup.scheduler';

@Module({
  imports: [CoreModule, BullModule.registerQueue({ name: BACKUP_QUEUE })],
  providers: [BackupService, BackupProcessor, BackupScheduler],
  exports: [BackupService],
})
export class BackupModule {}
