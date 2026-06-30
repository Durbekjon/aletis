import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@guards/jwt-auth.guard';
import { CurrentUser } from '@modules/auth/decorators/current-user.decorator';
import type { JwtPayload } from '@modules/auth/strategies/jwt.strategy';
import { WinBackStatus } from '@prisma/client';
import { RetentionService } from './retention.service';

@ApiTags('Retention')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard)
@Controller({ path: 'retention', version: '1' })
export class RetentionController {
  constructor(private readonly retentionService: RetentionService) {}

  @Get('metrics')
  @ApiOperation({ summary: 'Retention KPIs (dormant, recovered, revenue recovered)' })
  async metrics(@CurrentUser() user: JwtPayload) {
    const orgId = await this.retentionService.resolveOrgId(Number(user.userId));
    return this.retentionService.getMetrics(orgId);
  }

  @Get('dormant')
  @ApiOperation({ summary: 'List dormant customers eligible for win-back' })
  async dormant(
    @CurrentUser() user: JwtPayload,
    @Query('dormantDays') dormantDays?: string,
  ) {
    const orgId = await this.retentionService.resolveOrgId(Number(user.userId));
    return this.retentionService.getDormantCustomers(orgId, {
      dormantDays: dormantDays ? Number(dormantDays) : undefined,
    });
  }

  @Get('attempts')
  @ApiOperation({ summary: 'List win-back attempts and their outcomes' })
  async attempts(
    @CurrentUser() user: JwtPayload,
    @Query('status') status?: WinBackStatus,
    @Query('limit') limit?: string,
  ) {
    const orgId = await this.retentionService.resolveOrgId(Number(user.userId));
    return this.retentionService.listAttempts(orgId, {
      status,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post('scan')
  @ApiOperation({ summary: 'Detect dormant customers and enqueue win-backs' })
  async scan(
    @CurrentUser() user: JwtPayload,
    @Body() body: { dormantDays?: number; incentive?: string; limit?: number },
  ) {
    const orgId = await this.retentionService.resolveOrgId(Number(user.userId));
    return this.retentionService.scanAndEnqueue(orgId, {
      dormantDays: body?.dormantDays,
      incentive: body?.incentive,
      limit: body?.limit,
    });
  }

  @Post('customers/:id/winback')
  @ApiOperation({ summary: 'Manually trigger a win-back for one customer' })
  async winback(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { incentive?: string },
  ) {
    const orgId = await this.retentionService.resolveOrgId(Number(user.userId));
    const attempt = await this.retentionService.enqueueWinBack(id, orgId, {
      incentive: body?.incentive,
    });
    if (!attempt) {
      return { success: false, message: 'Customer not found in your organization' };
    }
    return { success: true, attempt };
  }
}
