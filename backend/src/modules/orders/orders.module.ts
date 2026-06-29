import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { PrismaModule } from '@/core/prisma/prisma.module';
import { ActivityLogModule } from '../activity-log/activity-log.module';
import { CustomerIntelligenceModule } from '@modules/customer-intelligence/customer-intelligence.module';

@Module({
  imports: [PrismaModule, ActivityLogModule, CustomerIntelligenceModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
