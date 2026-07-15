import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { PrismaModule } from '@/core/prisma/prisma.module';
import { ActivityLogModule } from '../activity-log/activity-log.module';
import { CustomerIntelligenceModule } from '@modules/customer-intelligence/customer-intelligence.module';
import { RetentionModule } from '@modules/retention/retention.module';
import { ReplenishmentModule } from '@modules/replenishment/replenishment.module';
import { LoyaltyModule } from '@modules/loyalty/loyalty.module';

@Module({
  imports: [
    PrismaModule,
    ActivityLogModule,
    CustomerIntelligenceModule,
    RetentionModule,
    ReplenishmentModule,
    LoyaltyModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
