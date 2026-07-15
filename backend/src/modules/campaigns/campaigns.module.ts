import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CoreModule } from '@core/core.module';
import { TelegramModule } from '@modules/telegram/telegram.module';
import { InstagramModule } from '@modules/instagram/instagram.module';
import { RetentionModule } from '@modules/retention/retention.module';
import { CAMPAIGN_QUEUE } from '@core/queue/queue.module';
import { CampaignsService } from './campaigns.service';
import { CampaignsProcessor } from './campaigns.processor';
import { CampaignsController } from './campaigns.controller';

/**
 * Segmented AI broadcast campaigns. Reuses RetentionService for the
 * dormant/at-risk segments and the shared Telegram/Instagram senders.
 */
@Module({
  imports: [
    CoreModule,
    TelegramModule,
    InstagramModule,
    RetentionModule,
    BullModule.registerQueue({ name: CAMPAIGN_QUEUE }),
  ],
  controllers: [CampaignsController],
  providers: [CampaignsService, CampaignsProcessor],
  exports: [CampaignsService],
})
export class CampaignsModule {}
