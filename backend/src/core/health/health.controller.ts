import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '@core/prisma/prisma.service';
import { EmbadingService } from '@modules/embading/embading.service';

/**
 * Liveness/readiness probe. Reports the status of core subsystems so ops (and
 * uptime monitors) can see at a glance whether the DB is reachable and whether
 * semantic/image search is currently available.
 */
@ApiTags('Health')
@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly embading: EmbadingService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Service + subsystem health' })
  async getHealth() {
    const db = await this.checkDb();
    const embedding = this.embading.isAvailable();
    return {
      status: db ? 'ok' : 'degraded',
      db: db ? 'up' : 'down',
      embedding: embedding ? 'up' : 'down',
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }

  private async checkDb(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}
