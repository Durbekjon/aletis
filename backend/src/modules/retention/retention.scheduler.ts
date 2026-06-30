import { Injectable, Logger } from '@nestjs/common';
import { RetentionService } from './retention.service';

/**
 * Daily sweep that detects dormant customers across all organizations and
 * enqueues win-back attempts. Mirrors AnalyticsScheduler's setTimeout/setInterval
 * approach (the project does not use @nestjs/schedule).
 */
@Injectable()
export class RetentionScheduler {
  private readonly logger = new Logger(RetentionScheduler.name);

  constructor(private readonly service: RetentionService) {
    this.scheduleDaily();
  }

  private scheduleDaily(): void {
    const now = new Date();
    // Run at 09:00 UTC daily — a sensible hour to reach customers.
    const next = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 9, 0, 0, 0),
    );
    if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
    const delay = next.getTime() - now.getTime();
    setTimeout(() => {
      this.runScan();
      setInterval(() => this.runScan(), 24 * 60 * 60 * 1000);
    }, delay);
    this.logger.log(
      `Retention scan scheduled — first run in ${Math.round(delay / 60000)} min`,
    );
  }

  private runScan(): void {
    this.service
      .scanAllOrganizations()
      .catch((err) => this.logger.warn(`Daily retention scan failed: ${err.message}`));
  }
}
