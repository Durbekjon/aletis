import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CoreModule } from '@core/core.module';
import { TelegramModule } from '@modules/telegram/telegram.module';
import { InstagramModule } from '@modules/instagram/instagram.module';
import { RETENTION_QUEUE } from '@core/queue/queue.module';
import { RetentionService } from './retention.service';
import { RetentionProcessor } from './retention.processor';
import { RetentionScheduler } from './retention.scheduler';
import { RetentionController } from './retention.controller';

@Module({
  imports: [
    CoreModule,
    TelegramModule,
    InstagramModule,
    BullModule.registerQueue({ name: RETENTION_QUEUE }),
  ],
  controllers: [RetentionController],
  providers: [RetentionService, RetentionProcessor, RetentionScheduler],
  exports: [RetentionService],
})
export class RetentionModule {}
