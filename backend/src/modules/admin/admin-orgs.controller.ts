import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@guards/jwt-auth.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { Roles } from '@modules/auth/decorators/roles.decorator';
import { AdminOrgsService } from './admin-orgs.service';

@ApiTags('Admin — Orgs')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPERADMIN', 'STAFF')
@Controller({ path: 'admin/orgs', version: '1' })
export class AdminOrgsController {
  constructor(private readonly adminOrgsService: AdminOrgsService) {}

  @Get()
  @ApiOperation({ summary: 'Org health table: plan, activity, AI cost vs revenue' })
  async list() {
    return this.adminOrgsService.getOrgHealth();
  }
}
