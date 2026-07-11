import { Module } from '@nestjs/common';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { CustomerMessagingService } from './customer-messaging.service';
import { PrismaModule } from '@core/prisma/prisma.module';
import { AuthModule } from '@modules/auth/auth.module';
import { CustomerIntelligenceModule } from '@modules/customer-intelligence/customer-intelligence.module';
import { CoreModule } from '@core/core.module';
import { TelegramModule } from '@modules/telegram/telegram.module';
import { InstagramModule } from '@modules/instagram/instagram.module';
import { MessagesModule } from '@modules/messages/messages.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    CustomerIntelligenceModule,
    CoreModule,
    TelegramModule,
    InstagramModule,
    MessagesModule,
  ],
  controllers: [CustomersController],
  providers: [CustomersService, CustomerMessagingService],
  exports: [CustomersService],
})
export class CustomersModule {}
