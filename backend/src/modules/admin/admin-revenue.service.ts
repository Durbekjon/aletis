import { Injectable } from '@nestjs/common';
import { PrismaService } from '@core/prisma/prisma.service';
import { SubscriptionStatus } from '@prisma/client';

function monthsAgo(n: number): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - n, 1));
}

@Injectable()
export class AdminRevenueService {
  constructor(private readonly prisma: PrismaService) {}

  /** MRR/ARR from active subscriptions' plan price, plus tier and status breakdowns. */
  async getSummary() {
    const activeSubs = await this.prisma.subscription.findMany({
      where: { status: SubscriptionStatus.ACTIVE },
      select: { plan: { select: { tier: true, priceUsd: true } } },
    });

    const mrr = activeSubs.reduce((sum, s) => sum + s.plan.priceUsd, 0);
    const byTier = new Map<string, { count: number; mrr: number }>();
    for (const s of activeSubs) {
      const key = s.plan.tier;
      const entry = byTier.get(key) ?? { count: 0, mrr: 0 };
      entry.count += 1;
      entry.mrr += s.plan.priceUsd;
      byTier.set(key, entry);
    }

    const statusGroups = await this.prisma.subscription.groupBy({
      by: ['status'],
      _count: { _all: true },
    });

    return {
      mrrUsd: mrr,
      arrUsd: mrr * 12,
      activeSubscriptions: activeSubs.length,
      byTier: Array.from(byTier.entries()).map(([tier, v]) => ({
        tier,
        count: v.count,
        mrrUsd: v.mrr,
      })),
      byStatus: statusGroups.map((g) => ({
        status: g.status,
        count: g._count._all,
      })),
    };
  }

  /**
   * Collected payments by month, kept separate per currency (no invented FX
   * conversion — PaymentTransaction amounts are mixed UZS/USD depending on
   * provider/target, and blending them would silently produce a wrong number).
   */
  async getPaymentTrend(months = 6) {
    const since = monthsAgo(months - 1);
    const rows = await this.prisma.paymentTransaction.findMany({
      where: { state: 'PAID', createdAt: { gte: since } },
      select: { amount: true, currency: true, createdAt: true },
    });

    const buckets = new Map<string, number>();
    for (const r of rows) {
      const monthKey = `${r.createdAt.getUTCFullYear()}-${String(r.createdAt.getUTCMonth() + 1).padStart(2, '0')}`;
      const key = `${monthKey}|${r.currency}`;
      buckets.set(key, (buckets.get(key) ?? 0) + r.amount);
    }

    return Array.from(buckets.entries())
      .map(([key, amount]) => {
        const [month, currency] = key.split('|');
        return { month, currency, amount };
      })
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  async getInvoiceStatusBreakdown() {
    const groups = await this.prisma.invoice.groupBy({
      by: ['status'],
      _count: { _all: true },
      _sum: { amountUsd: true, overageAmountUsd: true },
    });
    return groups.map((g) => ({
      status: g.status,
      count: g._count._all,
      totalUsd: (g._sum.amountUsd ?? 0) + (g._sum.overageAmountUsd ?? 0),
    }));
  }
}
