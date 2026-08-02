import { Test, TestingModule } from '@nestjs/testing';
import { RetentionService } from './retention.service';
import { PrismaService } from '@core/prisma/prisma.service';
import { GeminiService } from '@core/gemini/gemini.service';
import { TelegramService } from '@modules/telegram/telegram.service';
import { InstagramService } from '@modules/instagram/instagram.service';
import { EncryptionService } from '@core/encryption/encryption.service';
import { ConfigService } from '@nestjs/config';
import { getQueueToken } from '@nestjs/bullmq';
import { RETENTION_QUEUE } from '@core/queue/queue.module';
import { CustomerChannel, WinBackStatus } from '@prisma/client';

describe('RetentionService', () => {
  let service: RetentionService;
  let prisma: PrismaService;
  let telegramService: TelegramService;
  let loggerLogSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RetentionService,
        {
          provide: getQueueToken(RETENTION_QUEUE),
          useValue: { add: jest.fn() },
        },
        {
          provide: PrismaService,
          useValue: {
            winBackAttempt: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            message: {
              findFirst: jest.fn().mockResolvedValue(null),
            },
          },
        },
        {
          provide: GeminiService,
          useValue: {
            generateWinBackMessage: jest.fn().mockResolvedValue({ text: 'Hello' }),
          },
        },
        {
          provide: TelegramService,
          useValue: {
            sendRequest: jest.fn(),
          },
        },
        {
          provide: InstagramService,
          useValue: {},
        },
        {
          provide: EncryptionService,
          useValue: {
            decrypt: jest.fn().mockReturnValue('decrypted-token'),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(1),
          },
        },
      ],
    }).compile();

    service = module.get<RetentionService>(RetentionService);
    prisma = module.get<PrismaService>(PrismaService);
    telegramService = module.get<TelegramService>(TelegramService);
    loggerLogSpy = jest.spyOn((service as any).logger, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('runWinBackStep', () => {
    it('should fail the attempt and log without retrying if telegram chat is not found', async () => {
      const mockAttempt = {
        id: 1,
        organizationId: 99,
        status: WinBackStatus.QUEUED,
        step: 1,
        maxSteps: 3,
        channel: CustomerChannel.TELEGRAM,
        customer: {
          id: 123,
          telegramId: 'bad-id',
          bot: { token: 'encrypted' },
        },
      };

      (prisma.winBackAttempt.findUnique as jest.Mock).mockResolvedValue(mockAttempt);
      (telegramService.sendRequest as jest.Mock).mockResolvedValue({
        ok: false,
        description: 'Bad Request: chat not found',
      });

      await service.runWinBackStep(1, 1);

      expect(telegramService.sendRequest).toHaveBeenCalled();
      
      expect(prisma.winBackAttempt.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: WinBackStatus.FAILED },
      });

      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('stopped: customer unreachable (UNREACHABLE: Telegram send failed: Bad Request: chat not found)')
      );
    });
  });
});
