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
import { ReplenishmentStatus } from '@prisma/client';
import { ReplenishmentService } from './replenishment.service';

@ApiTags('Replenishment')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard)
@Controller({ path: 'replenishment', version: '1' })
export class ReplenishmentController {
  constructor(private readonly service: ReplenishmentService) {}

  @Get('metrics')
  @ApiOperation({ summary: 'Replenishment KPIs (scheduled, sent, reorder rate)' })
  async metrics(@CurrentUser() user: JwtPayload) {
    const orgId = await this.service.resolveOrgId(Number(user.userId));
    return this.service.getMetrics(orgId);
  }

  @Get('upcoming')
  @ApiOperation({ summary: 'Upcoming predicted run-outs (scheduled reminders)' })
  async upcoming(
    @CurrentUser() user: JwtPayload,
    @Query('limit') limit?: string,
  ) {
    const orgId = await this.service.resolveOrgId(Number(user.userId));
    return this.service.getUpcoming(orgId, limit ? Number(limit) : undefined);
  }

  @Get('reminders')
  @ApiOperation({ summary: 'List replenishment reminders and their outcomes' })
  async reminders(
    @CurrentUser() user: JwtPayload,
    @Query('status') status?: ReplenishmentStatus,
    @Query('limit') limit?: string,
  ) {
    const orgId = await this.service.resolveOrgId(Number(user.userId));
    return this.service.listReminders(orgId, {
      status,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post('scan')
  @ApiOperation({ summary: 'Enqueue reminders that are due within the lead window' })
  async scan(@CurrentUser() user: JwtPayload) {
    const orgId = await this.service.resolveOrgId(Number(user.userId));
    return this.service.scanAndEnqueue(orgId);
  }

  @Post('reminders/:id/send')
  @ApiOperation({ summary: 'Manually send one reminder now (demo/testing)' })
  async send(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.service.resolveOrgId(Number(user.userId));
    await this.service.enqueueReminder(id);
    return { success: true, reminderId: id };
  }
}
