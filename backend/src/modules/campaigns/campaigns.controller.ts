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
import { CampaignSegment } from '@prisma/client';
import { CampaignsService } from './campaigns.service';

@ApiTags('Campaigns')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard)
@Controller({ path: 'campaigns', version: '1' })
export class CampaignsController {
  constructor(private readonly campaigns: CampaignsService) {}

  @Get()
  @ApiOperation({ summary: 'List broadcast campaigns' })
  async list(@CurrentUser() user: JwtPayload) {
    const orgId = await this.campaigns.resolveOrgId(Number(user.userId));
    return this.campaigns.listCampaigns(orgId);
  }

  @Get('segments/:segment/preview')
  @ApiOperation({ summary: 'Count how many customers a segment currently matches' })
  async preview(
    @CurrentUser() user: JwtPayload,
    @Param('segment') segment: CampaignSegment,
  ) {
    const orgId = await this.campaigns.resolveOrgId(Number(user.userId));
    return this.campaigns.previewSegment(orgId, segment);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one campaign' })
  async get(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const orgId = await this.campaigns.resolveOrgId(Number(user.userId));
    return this.campaigns.getCampaign(orgId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a campaign (draft). messageTemplate optional — AI writes per recipient if omitted' })
  async create(
    @CurrentUser() user: JwtPayload,
    @Body()
    body: {
      name: string;
      segment: CampaignSegment;
      messageTemplate?: string;
      incentive?: string;
    },
  ) {
    const orgId = await this.campaigns.resolveOrgId(Number(user.userId));
    return this.campaigns.createCampaign(orgId, body);
  }

  @Post(':id/launch')
  @ApiOperation({ summary: 'Launch a campaign — sends to its segment via BullMQ' })
  async launch(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const orgId = await this.campaigns.resolveOrgId(Number(user.userId));
    return this.campaigns.launch(orgId, id);
  }
}
