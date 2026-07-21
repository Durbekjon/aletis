import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@guards/jwt-auth.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { Roles } from '@modules/auth/decorators/roles.decorator';
import { AiUsageService } from '@modules/ai-usage/ai-usage.service';

type Period = 'today' | 'month' | 'year';

@ApiTags('Admin — AI Cost')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPERADMIN', 'STAFF')
@Controller({ path: 'admin/ai-cost', version: '1' })
export class AdminAiCostController {
  constructor(private readonly aiUsageService: AiUsageService) {}

  @Get('summary')
  @ApiOperation({ summary: 'AI spend today / this month / this year' })
  async summary() {
    return this.aiUsageService.getSummary();
  }

  @Get('by-model')
  @ApiOperation({ summary: 'AI spend broken down by Gemini model' })
  async byModel(@Query('period') period: Period = 'month') {
    return this.aiUsageService.getByModel(period);
  }

  @Get('by-feature')
  @ApiOperation({ summary: 'AI spend broken down by feature/call-site' })
  async byFeature(@Query('period') period: Period = 'month') {
    return this.aiUsageService.getByFeature(period);
  }

  @Get('by-org')
  @ApiOperation({ summary: 'AI spend broken down by organization' })
  async byOrg(@Query('period') period: Period = 'month') {
    return this.aiUsageService.getByOrg(period);
  }
}
