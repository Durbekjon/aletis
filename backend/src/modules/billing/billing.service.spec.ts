import { Test, TestingModule } from '@nestjs/testing';
import { BillingService } from './billing.service';
import { PrismaService } from '@core/prisma/prisma.service';
import { SubscriptionStatus } from '@prisma/client';

describe('BillingService', () => {
  let service: BillingService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingService,
        {
          provide: PrismaService,
          useValue: {
            subscriptionPlan: {
              count: jest.fn().mockResolvedValue(4),
              upsert: jest.fn(),
              findUnique: jest.fn(),
              findMany: jest.fn(),
            },
            subscription: {
              findUnique: jest.fn(),
              create: jest.fn(),
              upsert: jest.fn(),
              update: jest.fn(),
            },
            invoice: {
              count: jest.fn(),
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            monthlyUsageSnapshot: {
              findFirst: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<BillingService>(BillingService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateMonthlyInvoice', () => {
    it('should generate an invoice with globally unique invoiceNumber including organizationId', async () => {
      const mockSubscription = {
        id: 10,
        organizationId: 99,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: new Date('2026-08-01T00:00:00Z'),
        currentPeriodEnd: new Date('2026-09-01T00:00:00Z'),
        plan: {
          id: 1,
          priceUsd: 49,
        },
      };

      (prisma.subscription.findUnique as jest.Mock).mockResolvedValue(mockSubscription);
      (prisma.monthlyUsageSnapshot.findFirst as jest.Mock).mockResolvedValue({
        overageConvos: 10,
        overageCharge: 0.4,
      });
      (prisma.invoice.count as jest.Mock).mockResolvedValue(5);
      
      let createdInvoiceData: any;
      (prisma.invoice.create as jest.Mock).mockImplementation((args) => {
        createdInvoiceData = args.data;
        return { id: 100, ...args.data };
      });

      const year = new Date().getFullYear();
      await service.generateMonthlyInvoice(99);

      expect(prisma.invoice.count).toHaveBeenCalledWith({
        where: { subscriptionId: 10 },
      });
      expect(prisma.invoice.create).toHaveBeenCalled();
      expect(createdInvoiceData.invoiceNumber).toBe(`INV-99-${year}-0006`);
      expect(createdInvoiceData.amountUsd).toBe(49);
      expect(createdInvoiceData.overageAmountUsd).toBe(0.4);
    });
  });
});
