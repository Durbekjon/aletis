import { Module } from '@nestjs/common';
import { InstagramModule } from './instagram.module';
import { RetentionModule } from '@modules/retention/retention.module';
import { WebhookModule } from '@modules/webhook/webhook.module';
import { ProductsModule } from '@modules/products/products.module';
import { InstagramWebhookController } from './instagram-webhook.controller';

/**
 * Inbound Instagram webhook. Depends on Instagram (parse/persist/send),
 * Retention (mark win-back response), Webhook (shared AI sales pipeline),
 * and Products (visual product search for image DMs).
 * Nothing imports this module, so there is no circular dependency.
 */
@Module({
  imports: [InstagramModule, RetentionModule, WebhookModule, ProductsModule],
  controllers: [InstagramWebhookController],
})
export class InstagramWebhookModule {}

