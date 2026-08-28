import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationsService } from './organizations.service';
import { PrismaService } from '@/core/prisma/prisma.service';
import { FileDeleteService } from '@/core/file-delete/file-delete.service';
import { ForbiddenException, BadRequestException } from '@nestjs/common';
import {
  FulfillmentMode,
  DeliveryMethod,
  DeliveryFeeType,
  MemberRole,
} from '@prisma/client';

// ─── Prisma mock ──────────────────────────────────────────────────────────────
const mockMember = { role: MemberRole.ADMIN };
const mockFulfillment = {
  id: 1,
  organizationId: 1,
  fulfillmentMode: FulfillmentMode.PICKUP_ONLY,
  deliveryMethod: null,
  deliveryFeeType: null,
  deliveryFee: null,
  pickupAddress: '123 Main St',
  pickupInstructions: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPrisma = {
  member: {
    findFirst: jest.fn(),
  },
  fulfillmentSettings: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
};

describe('OrganizationsService — Fulfillment Settings', () => {
  let service: OrganizationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: FileDeleteService, useValue: {} },
      ],
    }).compile();

    service = module.get<OrganizationsService>(OrganizationsService);
    jest.clearAllMocks();
  });

  // ─── GET ────────────────────────────────────────────────────────────────────

  describe('getFulfillmentSettings', () => {
    it('returns null when no settings exist', async () => {
      mockPrisma.member.findFirst.mockResolvedValue(mockMember);
      mockPrisma.fulfillmentSettings.findUnique.mockResolvedValue(null);

      const result = await service.getFulfillmentSettings(1, 1);
      expect(result).toBeNull();
    });

    it('returns settings when they exist', async () => {
      mockPrisma.member.findFirst.mockResolvedValue(mockMember);
      mockPrisma.fulfillmentSettings.findUnique.mockResolvedValue(
        mockFulfillment,
      );

      const result = await service.getFulfillmentSettings(1, 1);
      expect(result).toEqual(mockFulfillment);
    });

    it('throws ForbiddenException for non-members', async () => {
      mockPrisma.member.findFirst.mockResolvedValue(null); // not a member

      await expect(service.getFulfillmentSettings(99, 1)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ─── UPSERT ─────────────────────────────────────────────────────────────────

  describe('upsertFulfillmentSettings — PICKUP_ONLY', () => {
    beforeEach(() => {
      // ensureAdmin: member with ADMIN role
      mockPrisma.member.findFirst.mockResolvedValue(mockMember);
      mockPrisma.fulfillmentSettings.upsert.mockImplementation(({ create }) =>
        Promise.resolve({ id: 1, ...create, createdAt: new Date(), updatedAt: new Date() }),
      );
    });

    it('creates PICKUP_ONLY settings and clears delivery fields', async () => {
      const result = await service.upsertFulfillmentSettings(1, 1, {
        fulfillmentMode: FulfillmentMode.PICKUP_ONLY,
        pickupAddress: '123 Main St',
        pickupInstructions: 'Ring the bell',
        // delivery fields omitted (invalid for PICKUP_ONLY)
        deliveryMethod: DeliveryMethod.MERCHANT, // should be nulled out
        deliveryFeeType: DeliveryFeeType.FIXED,  // should be nulled out
        deliveryFee: 20000,                       // should be nulled out
      });

      const upsertCall = mockPrisma.fulfillmentSettings.upsert.mock.calls[0][0];
      expect(upsertCall.create.deliveryMethod).toBeNull();
      expect(upsertCall.create.deliveryFeeType).toBeNull();
      expect(upsertCall.create.deliveryFee).toBeNull();
      expect(upsertCall.create.pickupAddress).toBe('123 Main St');
    });
  });

  describe('upsertFulfillmentSettings — DELIVERY', () => {
    beforeEach(() => {
      mockPrisma.member.findFirst.mockResolvedValue(mockMember);
      mockPrisma.fulfillmentSettings.upsert.mockImplementation(({ create }) =>
        Promise.resolve({ id: 1, ...create, createdAt: new Date(), updatedAt: new Date() }),
      );
    });

    it('creates DELIVERY settings with MERCHANT + FIXED fee', async () => {
      await service.upsertFulfillmentSettings(1, 1, {
        fulfillmentMode: FulfillmentMode.DELIVERY,
        deliveryMethod: DeliveryMethod.MERCHANT,
        deliveryFeeType: DeliveryFeeType.FIXED,
        deliveryFee: 20000,
      });

      const upsertCall = mockPrisma.fulfillmentSettings.upsert.mock.calls[0][0];
      expect(upsertCall.create.deliveryMethod).toBe(DeliveryMethod.MERCHANT);
      expect(upsertCall.create.deliveryFee).toBe(20000);
      expect(upsertCall.create.pickupAddress).toBeNull();
    });

    it('creates DELIVERY settings with FREE fee (deliveryFee = null)', async () => {
      await service.upsertFulfillmentSettings(1, 1, {
        fulfillmentMode: FulfillmentMode.DELIVERY,
        deliveryMethod: DeliveryMethod.MERCHANT,
        deliveryFeeType: DeliveryFeeType.FREE,
      });

      const upsertCall = mockPrisma.fulfillmentSettings.upsert.mock.calls[0][0];
      expect(upsertCall.create.deliveryFee).toBeNull();
    });

    it('creates DELIVERY with EXTERNAL_COURIER + CUSTOMER_PAYS_SEPARATELY', async () => {
      await service.upsertFulfillmentSettings(1, 1, {
        fulfillmentMode: FulfillmentMode.DELIVERY,
        deliveryMethod: DeliveryMethod.EXTERNAL_COURIER,
        deliveryFeeType: DeliveryFeeType.CUSTOMER_PAYS_SEPARATELY,
      });

      const upsertCall = mockPrisma.fulfillmentSettings.upsert.mock.calls[0][0];
      expect(upsertCall.create.deliveryMethod).toBe(DeliveryMethod.EXTERNAL_COURIER);
      expect(upsertCall.create.deliveryFee).toBeNull();
    });

    it('rejects DELIVERY without deliveryMethod', async () => {
      await expect(
        service.upsertFulfillmentSettings(1, 1, {
          fulfillmentMode: FulfillmentMode.DELIVERY,
          deliveryFeeType: DeliveryFeeType.FREE,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects DELIVERY without deliveryFeeType', async () => {
      await expect(
        service.upsertFulfillmentSettings(1, 1, {
          fulfillmentMode: FulfillmentMode.DELIVERY,
          deliveryMethod: DeliveryMethod.MERCHANT,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects FIXED fee without amount', async () => {
      await expect(
        service.upsertFulfillmentSettings(1, 1, {
          fulfillmentMode: FulfillmentMode.DELIVERY,
          deliveryMethod: DeliveryMethod.MERCHANT,
          deliveryFeeType: DeliveryFeeType.FIXED,
          // deliveryFee omitted
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects FIXED fee with negative amount', async () => {
      await expect(
        service.upsertFulfillmentSettings(1, 1, {
          fulfillmentMode: FulfillmentMode.DELIVERY,
          deliveryMethod: DeliveryMethod.MERCHANT,
          deliveryFeeType: DeliveryFeeType.FIXED,
          deliveryFee: -1,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('upsertFulfillmentSettings — PICKUP_AND_DELIVERY', () => {
    beforeEach(() => {
      mockPrisma.member.findFirst.mockResolvedValue(mockMember);
      mockPrisma.fulfillmentSettings.upsert.mockImplementation(({ create }) =>
        Promise.resolve({ id: 1, ...create, createdAt: new Date(), updatedAt: new Date() }),
      );
    });

    it('saves both pickup and delivery fields', async () => {
      await service.upsertFulfillmentSettings(1, 1, {
        fulfillmentMode: FulfillmentMode.PICKUP_AND_DELIVERY,
        deliveryMethod: DeliveryMethod.MERCHANT,
        deliveryFeeType: DeliveryFeeType.FIXED,
        deliveryFee: 15000,
        pickupAddress: '456 Park Ave',
        pickupInstructions: 'Ground floor',
      });

      const upsertCall = mockPrisma.fulfillmentSettings.upsert.mock.calls[0][0];
      expect(upsertCall.create.deliveryMethod).toBe(DeliveryMethod.MERCHANT);
      expect(upsertCall.create.deliveryFee).toBe(15000);
      expect(upsertCall.create.pickupAddress).toBe('456 Park Ave');
    });
  });

  // ─── Authorization ──────────────────────────────────────────────────────────

  describe('Authorization', () => {
    it('throws ForbiddenException when non-admin tries to upsert', async () => {
      mockPrisma.member.findFirst.mockResolvedValue({ role: MemberRole.SELLER });

      await expect(
        service.upsertFulfillmentSettings(2, 1, {
          fulfillmentMode: FulfillmentMode.PICKUP_ONLY,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException for non-member trying to read (org isolation)', async () => {
      mockPrisma.member.findFirst.mockResolvedValue(null); // userId=99 is not in org 1

      await expect(service.getFulfillmentSettings(99, 1)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
