import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/core/prisma/prisma.service';
import { FileDeleteService } from '@/core/file-delete/file-delete.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { UpsertFulfillmentSettingsDto } from './dto/fulfillment-settings.dto';
import {
  Organization,
  MemberRole,
  MemberStatus,
  OnboardingStatus,
  OnboardingStep,
  PlanTier,
  SubscriptionStatus,
  FulfillmentSettings,
  FulfillmentMode,
  DeliveryFeeType,
} from '@prisma/client';

@Injectable()
export class OrganizationsService {
  private readonly logger = new Logger(OrganizationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly fileDeleteService: FileDeleteService,
  ) {}

  async createOrganization(
    userId: number,
    dto: CreateOrganizationDto,
  ): Promise<Organization> {
    // 1. Ensure the user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { member: true },
    });
    if (!user) throw new NotFoundException('User not found');

    // 2. Ensure user is not already a member of any organization
    if (user.member) {
      throw new BadRequestException(
        'User is already associated with an organization',
      );
    }

    // 3. Create organization, member, and trial subscription in a single transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: dto.name,
          description: dto.description ?? null,
          category: dto.category ?? undefined,
          onboardingProgress: {
            create: {
              percentage: 20,
              status: OnboardingStatus.INCOMPLETE,
              nextStep: dto.category
                ? OnboardingStep.SELECT_CATEGORY
                : OnboardingStep.SELECT_CATEGORY,
            },
          },
        },
      });
      await tx.member.create({
        data: {
          userId,
          organizationId: organization.id,
          role: 'ADMIN' as MemberRole,
          status: 'ACTIVE' as MemberStatus,
        },
      });

      // Auto-start 14-day Growth trial
      const growthPlan = await tx.subscriptionPlan.findUnique({
        where: { tier: PlanTier.GROWTH },
      });
      if (growthPlan) {
        const now = new Date();
        const trialEnd = new Date(now);
        trialEnd.setUTCDate(trialEnd.getUTCDate() + 14);
        const periodEnd = new Date(now);
        periodEnd.setUTCMonth(periodEnd.getUTCMonth() + 1);
        await tx.subscription.create({
          data: {
            organizationId: organization.id,
            planId: growthPlan.id,
            status: SubscriptionStatus.TRIALING,
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            trialEndsAt: trialEnd,
          },
        });
      }

      return tx.organization.findUnique({
        where: { id: organization.id },
        include: { onboardingProgress: true },
      });
    });
    return result!;
  }

  async getMyOrganization(userId: number): Promise<Organization> {
    const organizations = await this.prisma.organization.findMany({
      where: { members: { some: { userId } } },
      orderBy: { createdAt: 'desc' },
      include: { 
        logo: true,
        categories: true,
       },
    });
    if (!organizations || organizations.length !== 1) {
      throw new NotFoundException('Organization not found');
    }
    return organizations[0];
  }

  async getOrganizationById(userId: number, id: number) {
    const org = await this.prisma.organization.findFirst({
      where: { id, members: { some: { userId } } },
      include: {
        members: { include: { user: true } },
        bots: true,
        products: true,
        orders: true,
        categories: true,
      },
    });
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }

  private async ensureAdmin(userId: number, organizationId: number) {
    const membership = await this.prisma.member.findFirst({
      where: { organizationId, userId },
      select: { role: true },
    });
    if (!membership || membership.role !== 'ADMIN') {
      throw new ForbiddenException('Admin permission required');
    }
  }

  async updateOrganization(
    userId: number,
    id: number,
    dto: UpdateOrganizationDto,
  ): Promise<Organization> {
    await this.ensureAdmin(userId, id);

    // Get current organization with logo
    const organization = await this.prisma.organization.findUnique({
      where: { id },
      include: { logo: true },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Handle logo update: delete old logo if a new one is provided or if logoId is null
    let oldLogoKey: string | null = null;
    if (dto.logoId !== undefined) {
      // If there's an old logo, get its key for deletion
      if (organization.logoId && organization.logo) {
        oldLogoKey = organization.logo.key;
      }

      // If a new logoId is provided, validate it exists
      if (dto.logoId !== null) {
        const newLogo = await this.prisma.file.findUnique({
          where: { id: dto.logoId },
        });
        if (!newLogo) {
          throw new BadRequestException('Logo file not found');
        }
      }
    }

    // Update organization with new data
    const data: any = {
      name: dto.name ?? undefined,
      description: dto.description ?? undefined,
      category: dto.category ?? undefined,
      logoId: dto.logoId ?? undefined,
    };
    if (dto.categoryIds) {
      data.categories = { set: dto.categoryIds.map(id => ({ id })) };
    }

    const updatedOrganization = await this.prisma.organization.update({
      where: { id },
      data,
    });

    // Delete old logo file from filesystem if it was replaced
    if (oldLogoKey && dto.logoId !== organization.logoId) {
      try {
        await this.fileDeleteService.deleteFileByKey(oldLogoKey);
        // Delete the old logo file record from database
        if (organization.logoId) {
          await this.prisma.file.delete({
            where: { id: organization.logoId },
          }).catch((error) => {
            this.logger.warn(
              `Failed to delete old logo file record: ${error.message}`,
            );
          });
        }
      } catch (error) {
        this.logger.warn(
          `Failed to delete old logo file: ${error.message}`,
        );
        // Don't throw error - logo update succeeded even if old file deletion failed
      }
    }

    return updatedOrganization;
  }

  async deleteOrganization(userId: number, id: number): Promise<Organization> {
    await this.ensureAdmin(userId, id);
    return this.prisma.organization.delete({ where: { id } });
  }

  // ─── Fulfillment Settings ───────────────────────────────────────────────────

  async getFulfillmentSettings(
    userId: number,
    organizationId: number,
  ): Promise<FulfillmentSettings | null> {
    // Verify membership (any member can read settings)
    const membership = await this.prisma.member.findFirst({
      where: { organizationId, userId },
      select: { role: true },
    });
    if (!membership) {
      throw new ForbiddenException('You are not a member of this organization');
    }
    return this.prisma.fulfillmentSettings.findUnique({
      where: { organizationId },
    });
  }

  async upsertFulfillmentSettings(
    userId: number,
    organizationId: number,
    dto: UpsertFulfillmentSettingsDto,
  ): Promise<FulfillmentSettings> {
    await this.ensureAdmin(userId, organizationId);

    // Normalize: determine which fields are relevant for the chosen mode
    const deliveryEnabled =
      dto.fulfillmentMode === FulfillmentMode.DELIVERY ||
      dto.fulfillmentMode === FulfillmentMode.PICKUP_AND_DELIVERY;
    const pickupEnabled =
      dto.fulfillmentMode === FulfillmentMode.PICKUP_ONLY ||
      dto.fulfillmentMode === FulfillmentMode.PICKUP_AND_DELIVERY;

    // Validate delivery requirements when delivery is enabled
    if (deliveryEnabled) {
      if (!dto.deliveryMethod) {
        throw new BadRequestException(
          'deliveryMethod is required when delivery is enabled',
        );
      }
      if (!dto.deliveryFeeType) {
        throw new BadRequestException(
          'deliveryFeeType is required when delivery is enabled',
        );
      }
      if (
        dto.deliveryFeeType === DeliveryFeeType.FIXED &&
        (dto.deliveryFee == null || dto.deliveryFee <= 0)
      ) {
        throw new BadRequestException(
          'deliveryFee must be greater than 0 when deliveryFeeType is FIXED',
        );
      }
    }

    // Build normalized data: null out irrelevant fields
    const data = {
      fulfillmentMode: dto.fulfillmentMode,
      // Delivery fields
      deliveryMethod: deliveryEnabled ? (dto.deliveryMethod ?? null) : null,
      deliveryFeeType: deliveryEnabled ? (dto.deliveryFeeType ?? null) : null,
      deliveryFee:
        deliveryEnabled && dto.deliveryFeeType === DeliveryFeeType.FIXED
          ? (dto.deliveryFee ?? null)
          : null,
      // Pickup fields
      pickupAddress: pickupEnabled ? (dto.pickupAddress ?? null) : null,
      pickupInstructions: pickupEnabled
        ? (dto.pickupInstructions ?? null)
        : null,
    };

    return this.prisma.fulfillmentSettings.upsert({
      where: { organizationId },
      create: { organizationId, ...data },
      update: data,
    });
  }
}
