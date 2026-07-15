import { Module } from '@nestjs/common';
import { PrismaModule } from '@core/prisma/prisma.module';
import { LoyaltyService } from './loyalty.service';
import { LoyaltyController } from './loyalty.controller';

/**
 * Loyalty points + two-sided referrals. Exports LoyaltyService so the webhook
 * (referral attach on /start, customer /referral command) and orders (award on
 * first order) can drive it.
 */
@Module({
  imports: [PrismaModule],
  controllers: [LoyaltyController],
  providers: [LoyaltyService],
  exports: [LoyaltyService],
})
export class LoyaltyModule {}
