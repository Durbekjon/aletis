import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CustomerIntelligenceService } from './customer-intelligence.service';
import { CustomerIntelligenceProcessor } from './customer-intelligence.processor';
import { CoreModule } from '@core/core.module';
import { TelegramModule } from '@modules/telegram/telegram.module';
import { CUSTOMER_INTELLIGENCE_QUEUE } from '@core/queue/queue.module';

@Module({
  imports: [
    CoreModule,
    TelegramModule,
    BullModule.registerQueue({ name: CUSTOMER_INTELLIGENCE_QUEUE }),
  ],
  providers: [CustomerIntelligenceService, CustomerIntelligenceProcessor],
  exports: [CustomerIntelligenceService],
})
export class CustomerIntelligenceModule {}
