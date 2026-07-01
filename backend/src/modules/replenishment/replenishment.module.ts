import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CoreModule } from '@core/core.module';
import { TelegramModule } from '@modules/telegram/telegram.module';
import { InstagramModule } from '@modules/instagram/instagram.module';
import { REPLENISHMENT_QUEUE } from '@core/queue/queue.module';
import { ReplenishmentService } from './replenishment.service';
import { ReplenishmentProcessor } from './replenishment.processor';
import { ReplenishmentScheduler } from './replenishment.scheduler';
import { ReplenishmentController } from './replenishment.controller';

@Module({
  imports: [
    CoreModule,
    TelegramModule,
    InstagramModule,
    BullModule.registerQueue({ name: REPLENISHMENT_QUEUE }),
  ],
  controllers: [ReplenishmentController],
  providers: [ReplenishmentService, ReplenishmentProcessor, ReplenishmentScheduler],
  exports: [ReplenishmentService],
})
export class ReplenishmentModule {}
