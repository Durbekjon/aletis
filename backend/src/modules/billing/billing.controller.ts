import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { CurrentUser } from '@auth/decorators/current-user.decorator';
import type { JwtPayload } from '@auth/strategies/jwt.strategy';
import { BillingService } from './billing.service';
import { PlanTier } from '@prisma/client';

@ApiTags('Billing')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard)
@Controller({ path: 'billing', version: '1' })
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('plans')
  getPlans() {
    return this.billingService.getPlans();
  }

  @Get('subscription')
  getDashboard(@CurrentUser() user: JwtPayload) {
    return this.billingService.getBillingDashboard(Number(user.userId));
  }

  @Get('usage')
  getUsage(@CurrentUser() user: JwtPayload) {
    return this.billingService.getCurrentUsage(Number(user.userId));
  }

  @Get('invoices')
  getInvoices(@CurrentUser() user: JwtPayload) {
    return this.billingService.getInvoices(Number(user.userId));
  }

  @Post('subscription/change')
  changePlan(
    @CurrentUser() user: JwtPayload,
    @Body() body: { tier: PlanTier },
  ) {
    return this.billingService.changePlan(Number(user.userId), body.tier);
  }

  @Post('subscription/cancel')
  cancelSubscription(@CurrentUser() user: JwtPayload) {
    return this.billingService.cancelSubscription(Number(user.userId));
  }

  @Post('invoices/:id/mark-paid')
  markInvoicePaid(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { adminEmail: string },
  ) {
    return this.billingService.markInvoicePaid(id, body.adminEmail);
  }
}
