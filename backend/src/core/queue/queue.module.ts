import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';

export const CUSTOMER_INTELLIGENCE_QUEUE = 'customer-intelligence';
export const RETENTION_QUEUE = 'retention';
export const REPLENISHMENT_QUEUE = 'replenishment';
export const BACKUP_QUEUE = 'backup';
export const EMBEDDING_QUEUE = 'embedding';
export const CAMPAIGN_QUEUE = 'campaign';
export const INSTAGRAM_TOKEN_REFRESH_QUEUE = 'instagram-token-refresh';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST') || '127.0.0.1',
          port: config.get<number>('REDIS_PORT') || 6379,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
