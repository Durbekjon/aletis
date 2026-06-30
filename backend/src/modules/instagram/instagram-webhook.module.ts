import { Module } from '@nestjs/common';
import { InstagramModule } from './instagram.module';
import { RetentionModule } from '@modules/retention/retention.module';
import { InstagramWebhookController } from './instagram-webhook.controller';

/**
 * Inbound Instagram webhook. Depends on both Instagram (parse/persist/send) and
 * Retention (mark win-back response). Nothing imports this module, so there is
 * no circular dependency with RetentionModule.
 */
@Module({
  imports: [InstagramModule, RetentionModule],
  controllers: [InstagramWebhookController],
})
export class InstagramWebhookModule {}
