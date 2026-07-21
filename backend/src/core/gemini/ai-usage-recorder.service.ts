import { Injectable, Logger } from '@nestjs/common';
import type { AiFeature } from '@prisma/client';
import { PrismaService } from '@/core/prisma/prisma.service';

export interface AiUsageEntry {
  organizationId?: number | null;
  botId?: number | null;
  feature: AiFeature;
  model: string;
  promptTokens: number;
  candidatesTokens: number;
  totalTokens: number;
  latencyMs: number;
  success: boolean;
  errorType?: string | null;
}

/**
 * Fire-and-forget write path for AI usage tracking. Never throws — a
 * logging failure must not break a bot reply.
 */
@Injectable()
export class AiUsageRecorderService {
  private readonly logger = new Logger(AiUsageRecorderService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AiUsageEntry): Promise<void> {
    try {
      await this.prisma.aiUsageLog.create({
        data: {
          organizationId: entry.organizationId ?? null,
          botId: entry.botId ?? null,
          feature: entry.feature,
          model: entry.model,
          promptTokens: entry.promptTokens,
          candidatesTokens: entry.candidatesTokens,
          totalTokens: entry.totalTokens,
          latencyMs: entry.latencyMs,
          success: entry.success,
          errorType: entry.errorType ?? null,
        },
      });
    } catch (error: any) {
      this.logger.warn(`Failed to record AI usage: ${error.message}`);
    }
  }
}
