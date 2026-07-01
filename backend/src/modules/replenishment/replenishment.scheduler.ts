import { Injectable, Logger } from '@nestjs/common';
import { ReplenishmentService } from './replenishment.service';

/**
 * Daily sweep that enqueues replenishment reminders whose predicted run-out is
 * within the lead window. Mirrors RetentionScheduler (the project does not use
 * @nestjs/schedule).
 */
@Injectable()
export class ReplenishmentScheduler {
  private readonly logger = new Logger(ReplenishmentScheduler.name);

  constructor(private readonly service: ReplenishmentService) {
    this.scheduleDaily();
  }

  private scheduleDaily(): void {
    const now = new Date();
    // Run at 10:00 UTC daily — after the retention sweep (09:00).
    const next = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 10, 0, 0, 0),
    );
    if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
    const delay = next.getTime() - now.getTime();
    setTimeout(() => {
      this.runScan();
      setInterval(() => this.runScan(), 24 * 60 * 60 * 1000);
    }, delay);
    this.logger.log(
      `Replenishment scan scheduled — first run in ${Math.round(delay / 60000)} min`,
    );
  }

  private runScan(): void {
    this.service
      .scanAllOrganizations()
      .catch((err) =>
        this.logger.warn(`Daily replenishment scan failed: ${err.message}`),
      );
  }
}
