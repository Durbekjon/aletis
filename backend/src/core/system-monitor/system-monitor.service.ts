import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as os from 'os';
import { TelegramLoggerService } from '@/core/telegram-logger/telegram-logger.service';
import { RedisService } from '@/core/redis/redis.service';

@Injectable()
export class SystemMonitorService {
  private readonly logger = new Logger(SystemMonitorService.name);
  private readonly RAM_ALERT_THRESHOLD = 0.80; // 80%

  constructor(
    private readonly telegramLogger: TelegramLoggerService,
    private readonly redisService: RedisService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async checkRamUsage() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const usagePercentage = usedMem / totalMem;

    if (usagePercentage > this.RAM_ALERT_THRESHOLD) {
      const isCooldown = await this.redisService.get<boolean>('ram_alert_cooldown');
      
      if (!isCooldown) {
        // Set cooldown for 15 minutes (900 seconds)
        await this.redisService.set('ram_alert_cooldown', true, 900);
        
        const usedGb = (usedMem / 1024 / 1024 / 1024).toFixed(2);
        const totalGb = (totalMem / 1024 / 1024 / 1024).toFixed(2);
        
        const message = `High RAM Usage detected.\nUsage: ${(usagePercentage * 100).toFixed(1)}%\nAmount: ${usedGb} GB / ${totalGb} GB`;
        
        this.logger.warn(message);
        await this.telegramLogger.sendEvent('⚠️ High RAM Usage', message);
      } else {
        this.logger.warn(`High RAM Usage: ${(usagePercentage * 100).toFixed(1)}% (Alert muted due to cooldown)`);
      }
    }
  }
}
