import { Injectable } from '@nestjs/common';
import { PrismaService } from '@core/prisma/prisma.service';
import { AiUsageService } from '@modules/ai-usage/ai-usage.service';

function monthStart(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

@Injectable()
export class AdminOrgsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiUsageService: AiUsageService,
  ) {}

  /**
   * One row per org: plan/subscription, bot count, last activity, AI cost
   * this month (USD, from the AI-usage rollup), and revenue this month kept
   * per-currency — PaymentTransaction amounts aren't all in one currency, so
   * a single blended "margin" would silently be wrong; cost and revenue are
   * reported side by side instead of netted together.
   */
  async getOrgHealth() {
    const [orgs, aiCostByOrg, revenueRows] = await Promise.all([
      this.prisma.organization.findMany({
        select: {
          id: true,
          name: true,
          category: true,
          createdAt: true,
          subscription: {
            select: {
              status: true,
              plan: { select: { tier: true, convoLimit: true } },
            },
          },
          _count: { select: { bots: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.aiUsageService.getByOrg('month'),
      this.prisma.paymentTransaction.groupBy({
        by: ['organizationId', 'currency'],
        where: { state: 'PAID', createdAt: { gte: monthStart() } },
        _sum: { amount: true },
      }),
    ]);

    const lastMessages = await this.prisma.message.groupBy({
      by: ['botId'],
      _max: { createdAt: true },
    });
    const bots = await this.prisma.bot.findMany({
      select: { id: true, organizationId: true },
    });
    const lastActivityByOrg = new Map<number, Date>();
    for (const bot of bots) {
      const lastMsg = lastMessages.find((m) => m.botId === bot.id);
      if (!lastMsg?._max.createdAt) continue;
      const current = lastActivityByOrg.get(bot.organizationId);
      if (!current || lastMsg._max.createdAt > current) {
        lastActivityByOrg.set(bot.organizationId, lastMsg._max.createdAt);
      }
    }

    const costByOrgId = new Map(aiCostByOrg.map((c) => [c.organizationId, c.costUsd]));
    const revenueByOrgId = new Map<number, { currency: string; amount: number }[]>();
    for (const r of revenueRows) {
      const list = revenueByOrgId.get(r.organizationId) ?? [];
      list.push({ currency: r.currency, amount: r._sum.amount ?? 0 });
      revenueByOrgId.set(r.organizationId, list);
    }

    return orgs.map((org) => ({
      id: org.id,
      name: org.name,
      category: org.category,
      createdAt: org.createdAt,
      planTier: org.subscription?.plan.tier ?? null,
      subscriptionStatus: org.subscription?.status ?? null,
      convoLimit: org.subscription?.plan.convoLimit ?? null,
      botCount: org._count.bots,
      lastActivityAt: lastActivityByOrg.get(org.id) ?? null,
      aiCostThisMonthUsd: costByOrgId.get(org.id) ?? 0,
      revenueThisMonth: revenueByOrgId.get(org.id) ?? [],
    }));
  }
}
