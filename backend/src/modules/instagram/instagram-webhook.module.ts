import { Module } from '@nestjs/common';
import { InstagramModule } from './instagram.module';
import { RetentionModule } from '@modules/retention/retention.module';
import { WebhookModule } from '@modules/webhook/webhook.module';
import { InstagramWebhookController } from './instagram-webhook.controller';

/**
 * Inbound Instagram webhook. Depends on Instagram (parse/persist/send),
 * Retention (mark win-back response) and Webhook (shared AI sales pipeline).
 * Nothing imports this module, so there is no circular dependency.
 */
@Module({
  imports: [InstagramModule, RetentionModule, WebhookModule],
  controllers: [InstagramWebhookController],
})
export class InstagramWebhookModule {}
