import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CoreModule } from '@core/core.module';
import { INSTAGRAM_TOKEN_REFRESH_QUEUE } from '@core/queue/queue.module';
import { InstagramService } from './instagram.service';
import {
  InstagramController,
  InstagramOAuthCallbackController,
} from './instagram.controller';
import { InstagramTokenRefreshScheduler } from './instagram-token-refresh.scheduler';
import { InstagramTokenRefreshProcessor } from './instagram-token-refresh.processor';

@Module({
  imports: [CoreModule, BullModule.registerQueue({ name: INSTAGRAM_TOKEN_REFRESH_QUEUE })],
  controllers: [InstagramController, InstagramOAuthCallbackController],
  providers: [InstagramService, InstagramTokenRefreshScheduler, InstagramTokenRefreshProcessor],
  exports: [InstagramService],
})
export class InstagramModule {}
