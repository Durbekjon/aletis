import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { CurrentUser } from '@auth/decorators/current-user.decorator';
import type { JwtPayload } from '@auth/strategies/jwt.strategy';
import { LoyaltyService } from './loyalty.service';

@ApiTags('Loyalty')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard)
@Controller({ path: 'loyalty', version: '1' })
export class LoyaltyController {
  constructor(private readonly loyalty: LoyaltyService) {}

  @Get('metrics')
  @ApiOperation({ summary: 'Loyalty & referral KPIs for the organization' })
  async metrics(@CurrentUser() user: JwtPayload) {
    const orgId = await this.loyalty.resolveOrgId(Number(user.userId));
    return this.loyalty.getMetrics(orgId);
  }

  @Get('customers/:id')
  @ApiOperation({ summary: 'A customer\'s points balance, referral link and ledger' })
  async customer(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const orgId = await this.loyalty.resolveOrgId(Number(user.userId));
    return this.loyalty.getCustomerSummary(orgId, id);
  }

  @Post('customers/:id/adjust')
  @ApiOperation({ summary: 'Manually add or subtract loyalty points' })
  async adjust(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { points: number; note?: string },
  ) {
    const orgId = await this.loyalty.resolveOrgId(Number(user.userId));
    return this.loyalty.adjustPoints(orgId, id, Number(body?.points ?? 0), body?.note);
  }
}
