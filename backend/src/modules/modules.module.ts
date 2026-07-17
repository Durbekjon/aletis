import { Module } from '@nestjs/common';
import { AuthModule } from '@auth/auth.module';
import { TelegramModule } from '@telegram/telegram.module';
import { ChannelsModule } from '@channels/channels.module';
import { OrganizationsModule } from '@organizations/organizations.module';
import { SchemaModule } from '@modules/product-schema/schema.module';
import { FileModule } from '@file/file.module';
import { ProductsModule } from '@products/products.module';
import { BotsModule } from '@bots/bots.module';
import { CustomersModule } from '@customers/customers.module';
import { WebhookModule } from '@webhook/webhook.module';
import { MessagesModule } from './messages/messages.module';
import { PostsModule } from './posts/posts.module';
import { OrdersModule } from './orders/orders.module';
import { OnboardingProgressModule } from './onboarding-progress/onboarding-progress.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { ActivityLogModule } from './activity-log/activity-log.module';
import { EmbadingModule } from './embading/embading.module';
import { CustomerIntelligenceModule } from './customer-intelligence/customer-intelligence.module';
import { RetentionModule } from './retention/retention.module';
import { ReplenishmentModule } from './replenishment/replenishment.module';
import { InstagramModule } from './instagram/instagram.module';
import { InstagramWebhookModule } from './instagram/instagram-webhook.module';
import { BillingModule } from './billing/billing.module';
import { UsageModule } from './usage/usage.module';
import { BarcodeCatalogModule } from './barcode-catalog/barcode-catalog.module';
import { BackupModule } from './backup/backup.module';
import { PaymentsModule } from './payments/payments.module';
import { LoyaltyModule } from './loyalty/loyalty.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { HealthModule } from '@core/health/health.module';
import { AiUsageModule } from './ai-usage/ai-usage.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    AuthModule,
    OrganizationsModule,
    SchemaModule,
    FileModule,
    ProductsModule,
    BotsModule,
    CustomersModule,
    TelegramModule,
    WebhookModule,
    MessagesModule,
    ChannelsModule,
    PostsModule,
    OrdersModule,
    OnboardingProgressModule,
    DashboardModule,
    AnalyticsModule,
    ActivityLogModule,
    EmbadingModule,
    CustomerIntelligenceModule,
    RetentionModule,
    ReplenishmentModule,
    InstagramModule,
    InstagramWebhookModule,
    BillingModule,
    UsageModule,
    BarcodeCatalogModule,
    BackupModule,
    PaymentsModule,
    LoyaltyModule,
    CampaignsModule,
    HealthModule,
    AiUsageModule,
    AdminModule,
  ],
})
export class ModulesModule {}
