import { Module } from '@nestjs/common';
import { UsageService } from './usage.service';
import { PrismaModule } from '@core/prisma/prisma.module';
import { RedisModule } from '@core/redis/redis.module';

@Module({
  imports: [PrismaModule, RedisModule],
  providers: [UsageService],
  exports: [UsageService],
})
export class UsageModule {}
