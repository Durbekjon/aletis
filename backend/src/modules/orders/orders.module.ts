import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrderPaymentReminderService } from './order-payment-reminder.service';
import { OrderPaymentReminderProcessor } from './order-payment-reminder.processor';
import { PrismaModule } from '@/core/prisma/prisma.module';
import { CoreModule } from '@/core/core.module';
import { ActivityLogModule } from '../activity-log/activity-log.module';
import { CustomerIntelligenceModule } from '@modules/customer-intelligence/customer-intelligence.module';
import { RetentionModule } from '@modules/retention/retention.module';
import { ReplenishmentModule } from '@modules/replenishment/replenishment.module';
import { LoyaltyModule } from '@modules/loyalty/loyalty.module';
import { PaymentsModule } from '@modules/payments/payments.module';
import { TelegramModule } from '@modules/telegram/telegram.module';
import { InstagramModule } from '@modules/instagram/instagram.module';
import { ORDER_PAYMENT_REMINDER_QUEUE } from '@core/queue/queue.module';

@Module({
  imports: [
    PrismaModule,
    CoreModule,
    ActivityLogModule,
    CustomerIntelligenceModule,
    RetentionModule,
    ReplenishmentModule,
    LoyaltyModule,
    PaymentsModule,
    TelegramModule,
    InstagramModule,
    BullModule.registerQueue({ name: ORDER_PAYMENT_REMINDER_QUEUE }),
  ],
  controllers: [OrdersController],
  providers: [OrdersService, OrderPaymentReminderService, OrderPaymentReminderProcessor],
  exports: [OrdersService],
})
export class OrdersModule {}
