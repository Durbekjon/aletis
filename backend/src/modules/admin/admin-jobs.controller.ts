import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@guards/jwt-auth.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { Roles } from '@modules/auth/decorators/roles.decorator';
import { AdminJobsService } from './admin-jobs.service';

@ApiTags('Admin — Jobs')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPERADMIN', 'STAFF')
@Controller({ path: 'admin/jobs', version: '1' })
export class AdminJobsController {
  constructor(private readonly adminJobsService: AdminJobsService) {}

  @Get('health')
  @ApiOperation({ summary: 'Job counts (waiting/active/completed/failed/delayed) per queue' })
  async health() {
    return this.adminJobsService.getQueueHealth();
  }

  @Get('failures')
  @ApiOperation({ summary: 'Recent failed jobs per queue with error messages' })
  async failures() {
    return this.adminJobsService.getRecentFailures();
  }
}
