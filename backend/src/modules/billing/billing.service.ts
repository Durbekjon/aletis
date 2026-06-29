import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@core/prisma/prisma.service';
import {
  InvoiceStatus,
  PaymentProvider,
  PlanTier,
  SubscriptionStatus,
} from '@prisma/client';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(private readonly prisma: PrismaService) {}

  private async resolveOrgId(userId: number): Promise<number> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { member: { select: { organizationId: true } } },
    });
    if (!user?.member?.organizationId) {
      throw new NotFoundException('User is not associated with an organization');
    }
    return user.member.organizationId;
  }

  async getOrCreateSubscription(organizationId: number) {
    const existing = await this.prisma.subscription.findUnique({
      where: { organizationId },
      include: { plan: true },
    });
    if (existing) return existing;

    const freePlan = await this.prisma.subscriptionPlan.findUnique({
      where: { tier: PlanTier.FREE },
    });
    if (!freePlan) throw new Error('FREE plan not found — run the seed script');

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setUTCMonth(periodEnd.getUTCMonth() + 1);

    return this.prisma.subscription.create({
      data: {
        organizationId,
        planId: freePlan.id,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
      include: { plan: true },
    });
  }

  async startTrial(organizationId: number) {
    const growthPlan = await this.prisma.subscriptionPlan.findUnique({
      where: { tier: PlanTier.GROWTH },
    });
    if (!growthPlan) throw new Error('GROWTH plan not found — run the seed script');

    const now = new Date();
    const trialEnd = new Date(now);
    trialEnd.setUTCDate(trialEnd.getUTCDate() + 14);
    const periodEnd = new Date(now);
    periodEnd.setUTCMonth(periodEnd.getUTCMonth() + 1);

    return this.prisma.subscription.upsert({
      where: { organizationId },
      update: {},
      create: {
        organizationId,
        planId: growthPlan.id,
        status: SubscriptionStatus.TRIALING,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        trialEndsAt: trialEnd,
      },
      include: { plan: true },
    });
  }

  async getBillingDashboard(userId: number) {
    const orgId = await this.resolveOrgId(userId);
    const subscription = await this.getOrCreateSubscription(orgId);

    const now = new Date();
    const periodStart = subscription.currentPeriodStart;
    const periodEnd = subscription.currentPeriodEnd;

    const [productsCount, botsCount, membersCount, invoices] =
      await Promise.all([
        this.prisma.product.count({
          where: { organizationId: orgId, isDeleted: false },
        }),
        this.prisma.bot.count({ where: { organizationId: orgId } }),
        this.prisma.member.count({ where: { organizationId: orgId } }),
        this.prisma.invoice.findMany({
          where: { subscriptionId: subscription.id },
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
      ]);

    const usageSnapshot = await this.prisma.monthlyUsageSnapshot.findFirst({
      where: {
        subscriptionId: subscription.id,
        periodStart: { lte: now },
        periodEnd: { gte: now },
      },
    });

    const plan = subscription.plan;
    const aiConvos = usageSnapshot?.aiConvos ?? 0;

    return {
      subscription: {
        id: subscription.id,
        status: subscription.status,
        trialEndsAt: subscription.trialEndsAt,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      },
      plan: {
        id: plan.id,
        tier: plan.tier,
        name: plan.name,
        priceUsd: plan.priceUsd,
        convoLimit: plan.convoLimit,
        productLimit: plan.productLimit,
        botLimit: plan.botLimit,
        teamMemberLimit: plan.teamMemberLimit,
        overagePriceUsd: plan.overagePriceUsd,
      },
      usage: {
        aiConvos: { current: aiConvos, limit: plan.convoLimit },
        products: { current: productsCount, limit: plan.productLimit },
        bots: { current: botsCount, limit: plan.botLimit },
        teamMembers: { current: membersCount, limit: plan.teamMemberLimit },
      },
      invoices,
    };
  }

  async getPlans() {
    return this.prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { priceUsd: 'asc' },
    });
  }

  async changePlan(userId: number, tier: PlanTier) {
    const orgId = await this.resolveOrgId(userId);
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { tier },
    });
    if (!plan) throw new NotFoundException(`Plan ${tier} not found`);

    const subscription = await this.getOrCreateSubscription(orgId);

    return this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        planId: plan.id,
        status:
          plan.tier === PlanTier.FREE
            ? SubscriptionStatus.ACTIVE
            : subscription.status === SubscriptionStatus.TRIALING
              ? SubscriptionStatus.TRIALING
              : SubscriptionStatus.ACTIVE,
        cancelAtPeriodEnd: false,
      },
      include: { plan: true },
    });
  }

  async cancelSubscription(userId: number) {
    const orgId = await this.resolveOrgId(userId);
    const subscription = await this.prisma.subscription.findUnique({
      where: { organizationId: orgId },
    });
    if (!subscription) throw new NotFoundException('No active subscription');

    return this.prisma.subscription.update({
      where: { id: subscription.id },
      data: { cancelAtPeriodEnd: true },
      include: { plan: true },
    });
  }

  async generateMonthlyInvoice(organizationId: number) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { organizationId },
      include: { plan: true },
    });
    if (
      !subscription ||
      subscription.status === SubscriptionStatus.CANCELLED ||
      subscription.plan.priceUsd === 0
    ) {
      return null;
    }

    const usageSnapshot = await this.prisma.monthlyUsageSnapshot.findFirst({
      where: {
        subscriptionId: subscription.id,
        periodStart: subscription.currentPeriodStart,
      },
    });

    const overageConvos = usageSnapshot?.overageConvos ?? 0;
    const overageCharge = usageSnapshot?.overageCharge ?? 0;
    const baseAmount = subscription.plan.priceUsd;
    const total = baseAmount + overageCharge;

    const count = await this.prisma.invoice.count({
      where: { subscriptionId: subscription.id },
    });
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const dueDate = new Date(subscription.currentPeriodEnd);
    dueDate.setUTCDate(dueDate.getUTCDate() + 7);

    return this.prisma.invoice.create({
      data: {
        invoiceNumber,
        subscriptionId: subscription.id,
        amountUsd: baseAmount,
        overageAmountUsd: overageCharge,
        status: InvoiceStatus.OPEN,
        dueDate,
        periodStart: subscription.currentPeriodStart,
        periodEnd: subscription.currentPeriodEnd,
      },
    });
  }

  async markInvoicePaid(invoiceId: number, adminEmail: string) {
    const adminEmailEnv = process.env.ADMIN_EMAIL;
    if (!adminEmailEnv || adminEmail !== adminEmailEnv) {
      throw new ForbiddenException('Admin access only');
    }
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');

    const updated = await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: InvoiceStatus.PAID,
        provider: PaymentProvider.MANUAL,
        paidAt: new Date(),
      },
    });

    await this.prisma.subscription.update({
      where: { id: invoice.subscriptionId },
      data: { status: SubscriptionStatus.ACTIVE },
    });

    return updated;
  }

  async getInvoices(userId: number) {
    const orgId = await this.resolveOrgId(userId);
    const subscription = await this.prisma.subscription.findUnique({
      where: { organizationId: orgId },
    });
    if (!subscription) return [];

    return this.prisma.invoice.findMany({
      where: { subscriptionId: subscription.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getCurrentUsage(userId: number) {
    const orgId = await this.resolveOrgId(userId);
    const subscription = await this.getOrCreateSubscription(orgId);

    const now = new Date();
    const snapshot = await this.prisma.monthlyUsageSnapshot.findFirst({
      where: {
        subscriptionId: subscription.id,
        periodStart: { lte: now },
        periodEnd: { gte: now },
      },
    });

    return {
      aiConvos: snapshot?.aiConvos ?? 0,
      convoLimit: subscription.plan.convoLimit,
      periodStart: subscription.currentPeriodStart,
      periodEnd: subscription.currentPeriodEnd,
    };
  }
}
