import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@guards/jwt-auth.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { Roles } from '@modules/auth/decorators/roles.decorator';
import { AdminRevenueService } from './admin-revenue.service';

@ApiTags('Admin — Revenue')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPERADMIN', 'STAFF')
@Controller({ path: 'admin/revenue', version: '1' })
export class AdminRevenueController {
  constructor(private readonly adminRevenueService: AdminRevenueService) {}

  @Get('summary')
  @ApiOperation({ summary: 'MRR/ARR and subscription breakdown by tier/status' })
  async summary() {
    return this.adminRevenueService.getSummary();
  }

  @Get('payment-trend')
  @ApiOperation({ summary: 'Collected payments by month (per currency)' })
  async paymentTrend(@Query('months') months?: string) {
    return this.adminRevenueService.getPaymentTrend(months ? Number(months) : 6);
  }

  @Get('invoices')
  @ApiOperation({ summary: 'Invoice counts/totals by status' })
  async invoices() {
    return this.adminRevenueService.getInvoiceStatusBreakdown();
  }
}
