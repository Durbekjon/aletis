import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { EncryptionService } from './encryption/encryption.service';
import { GeminiService } from './gemini/gemini.service';
import { AiUsageRecorderService } from './gemini/ai-usage-recorder.service';
import { RetryService } from './retry/retry.service';
import { SecurityModule } from './security/security.module';
import { LoggingModule } from './logging/logging.module';
import { WebhookHelperModule } from './webhook-helper/webhook-helper.module';
import { MessageBufferModule } from './message-buffer/message-buffer.module';
import { RedisModule } from './redis/redis.module';
import { FileDeleteModule } from './file-delete/file-delete.module';
import { TelegramLoggerModule } from './telegram-logger/telegram-logger.module';
import { ImageToBase64Module } from './image-to-base64/image-to-base64.module';
import { ImagekitModule } from './imagekit/imagekit.module';
import { QueueModule } from './queue/queue.module';

@Module({
  imports: [
    PrismaModule,
    SecurityModule,
    LoggingModule,
    WebhookHelperModule,
    MessageBufferModule,
    RedisModule,
    FileDeleteModule,
    TelegramLoggerModule,
    ImageToBase64Module,
    ImagekitModule,
    QueueModule,
  ],
  providers: [EncryptionService, GeminiService, AiUsageRecorderService, RetryService],
  exports: [
    PrismaModule,
    EncryptionService,
    GeminiService,
    AiUsageRecorderService,
    RetryService,
    MessageBufferModule,
    ImageToBase64Module,
    ImagekitModule,
    QueueModule,
  ],
})
export class CoreModule {}
