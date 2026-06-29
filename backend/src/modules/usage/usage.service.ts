import { ForbiddenException, Inject, Injectable, Logger } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { PrismaService } from '@core/prisma/prisma.service';
import { PlanTier, SubscriptionStatus } from '@prisma/client';

export enum QuotaStatus {
  OK = 'ok',
  WARNING = 'warning',  // >80% of limit
  THROTTLED = 'throttled',
}

@Injectable()
export class UsageService {
  private readonly logger = new Logger(UsageService.name);

  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
    private readonly prisma: PrismaService,
  ) {}

  private convoKey(orgId: number): string {
    const now = new Date();
    const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    return `usage:${orgId}:convos:${month}`;
  }

  private async getEffectivePlan(orgId: number) {
    const cacheKey = `quota:${orgId}:plan`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const subscription = await this.prisma.subscription.findUnique({
      where: { organizationId: orgId },
      include: { plan: true },
    });

    if (!subscription) {
      // No subscription yet — apply Free limits
      const freePlan = await this.prisma.subscriptionPlan.findUnique({
        where: { tier: PlanTier.FREE },
      });
      const limits = {
        convoLimit: freePlan?.convoLimit ?? 100,
        botLimit: freePlan?.botLimit ?? 1,
        productLimit: freePlan?.productLimit ?? 50,
        teamMemberLimit: freePlan?.teamMemberLimit ?? 1,
        overageCap: 0,
        status: SubscriptionStatus.ACTIVE,
        tier: PlanTier.FREE,
      };
      await this.redis.set(cacheKey, JSON.stringify(limits), 'EX', 300);
      return limits;
    }

    const limits = {
      convoLimit: subscription.plan.convoLimit,
      botLimit: subscription.plan.botLimit,
      productLimit: subscription.plan.productLimit,
      teamMemberLimit: subscription.plan.teamMemberLimit,
      overageCap: subscription.plan.overageCap,
      status: subscription.status,
      tier: subscription.plan.tier,
    };
    await this.redis.set(cacheKey, JSON.stringify(limits), 'EX', 300);
    return limits;
  }

  async checkAndIncrementConversation(orgId: number): Promise<QuotaStatus> {
    const plan = await this.getEffectivePlan(orgId);

    if (plan.status === SubscriptionStatus.PAST_DUE) {
      // Grace period — allow but warn
      this.logger.warn(`Org ${orgId} is PAST_DUE`);
    }

    if (plan.convoLimit === -1) return QuotaStatus.OK;

    const key = this.convoKey(orgId);
    const current = await this.redis.incr(key);

    if (current === 1) {
      // First call this month — set expiry (end of month + 2 days)
      const now = new Date();
      const endOfMonth = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
      );
      endOfMonth.setUTCDate(endOfMonth.getUTCDate() + 2);
      const ttlSeconds = Math.floor(
        (endOfMonth.getTime() - now.getTime()) / 1000,
      );
      await this.redis.expire(key, ttlSeconds);
    }

    const hardLimit = plan.convoLimit + plan.overageCap;
    if (current > hardLimit) {
      // Roll back — we've gone past the hard cap
      await this.redis.decr(key);
      return QuotaStatus.THROTTLED;
    }

    if (current > plan.convoLimit) return QuotaStatus.WARNING; // in overage range
    if (current > plan.convoLimit * 0.8) return QuotaStatus.WARNING;
    return QuotaStatus.OK;
  }

  async checkBotLimit(orgId: number): Promise<void> {
    const plan = await this.getEffectivePlan(orgId);
    if (plan.botLimit === -1) return;

    const count = await this.prisma.bot.count({ where: { organizationId: orgId } });
    if (count >= plan.botLimit) {
      throw new ForbiddenException(
        `Your ${plan.tier} plan allows ${plan.botLimit} bot(s). Upgrade to add more.`,
      );
    }
  }

  async checkProductLimit(orgId: number): Promise<void> {
    const plan = await this.getEffectivePlan(orgId);
    if (plan.productLimit === -1) return;

    const count = await this.prisma.product.count({
      where: { organizationId: orgId, isDeleted: false },
    });
    if (count >= plan.productLimit) {
      throw new ForbiddenException(
        `Your ${plan.tier} plan allows ${plan.productLimit} product(s). Upgrade to add more.`,
      );
    }
  }

  async getCurrentUsage(orgId: number) {
    const key = this.convoKey(orgId);
    const raw = await this.redis.get(key);
    return { aiConvos: raw ? parseInt(raw, 10) : 0 };
  }

  async flushMonthlySnapshot(orgId: number): Promise<void> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { organizationId: orgId },
      include: { plan: true },
    });
    if (!subscription) return;

    const key = this.convoKey(orgId);
    const raw = await this.redis.get(key);
    const aiConvos = raw ? parseInt(raw, 10) : 0;

    const plan = subscription.plan;
    const overageConvos =
      plan.convoLimit === -1 ? 0 : Math.max(0, aiConvos - plan.convoLimit);
    const overageCharge = Math.min(
      overageConvos * plan.overagePriceUsd,
      plan.priceUsd * 3,
    );

    const [productsCount, botsCount] = await Promise.all([
      this.prisma.product.count({
        where: { organizationId: orgId, isDeleted: false },
      }),
      this.prisma.bot.count({ where: { organizationId: orgId } }),
    ]);

    await this.prisma.monthlyUsageSnapshot.upsert({
      where: {
        subscriptionId_periodStart: {
          subscriptionId: subscription.id,
          periodStart: subscription.currentPeriodStart,
        },
      },
      update: { aiConvos, productsHwm: productsCount, botsHwm: botsCount, overageConvos, overageCharge },
      create: {
        subscriptionId: subscription.id,
        periodStart: subscription.currentPeriodStart,
        periodEnd: subscription.currentPeriodEnd,
        aiConvos,
        productsHwm: productsCount,
        botsHwm: botsCount,
        overageConvos,
        overageCharge,
      },
    });
  }

  invalidatePlanCache(orgId: number) {
    this.redis.del(`quota:${orgId}:plan`).catch(() => undefined);
  }
}
