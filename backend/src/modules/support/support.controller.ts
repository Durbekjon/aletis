import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@guards/jwt-auth.guard';
import { CurrentUser } from '@modules/auth/decorators/current-user.decorator';
import type { JwtPayload } from '@modules/auth/strategies/jwt.strategy';
import { TicketStatus } from '@prisma/client';
import { SupportService } from './support.service';

@ApiTags('Support')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard)
@Controller({ path: 'support', version: '1' })
export class SupportController {
  constructor(private readonly service: SupportService) {}

  @Get('metrics')
  @ApiOperation({ summary: 'Support ticket KPIs (open, in progress, resolved)' })
  async metrics(@CurrentUser() user: JwtPayload) {
    const orgId = await this.service.resolveOrgId(Number(user.userId));
    return this.service.getMetrics(orgId);
  }

  @Get('tickets')
  @ApiOperation({ summary: 'List support tickets (optionally filtered by status)' })
  async tickets(
    @CurrentUser() user: JwtPayload,
    @Query('status') status?: TicketStatus,
    @Query('limit') limit?: string,
  ) {
    const orgId = await this.service.resolveOrgId(Number(user.userId));
    return this.service.listTickets(orgId, {
      status,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Patch('tickets/:id/status')
  @ApiOperation({ summary: 'Update a support ticket status' })
  async updateStatus(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: TicketStatus,
  ) {
    const orgId = await this.service.resolveOrgId(Number(user.userId));
    return this.service.updateStatus(orgId, id, status);
  }
}
