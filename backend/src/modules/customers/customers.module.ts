import { Module } from '@nestjs/common';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { PrismaModule } from '@core/prisma/prisma.module';
import { AuthModule } from '@modules/auth/auth.module';
import { CustomerIntelligenceModule } from '@modules/customer-intelligence/customer-intelligence.module';

@Module({
  imports: [PrismaModule, AuthModule, CustomerIntelligenceModule],
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}
