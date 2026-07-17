import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@core/prisma/prisma.service';
import { estimateCostUsd } from './gemini-pricing.constants';

function utcDayRange(daysAgo: number): { from: Date; to: Date } {
  const now = new Date();
  const from = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysAgo, 0, 0, 0, 0),
  );
  const to = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysAgo, 23, 59, 59, 999),
  );
  return { from, to };
}

function periodStart(period: 'today' | 'month' | 'year'): Date {
  const now = new Date();
  if (period === 'today') {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }
  if (period === 'month') {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  }
  return new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
}

@Injectable()
export class AiUsageService {
  private readonly logger = new Logger(AiUsageService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Roll up yesterday's raw AiUsageLog rows into AiCostDailyAggregate, grouped by org/model/feature. */
  async rollupYesterday(): Promise<void> {
    const { from, to } = utcDayRange(1);

    const grouped = await this.prisma.aiUsageLog.groupBy({
      by: ['organizationId', 'model', 'feature'],
      where: { createdAt: { gte: from, lte: to } },
      _count: { _all: true },
      _sum: { promptTokens: true, candidatesTokens: true, totalTokens: true },
      _avg: { latencyMs: true },
    });

    const errorGrouped = await this.prisma.aiUsageLog.groupBy({
      by: ['organizationId', 'model', 'feature'],
      where: { createdAt: { gte: from, lte: to }, success: false },
      _count: { _all: true },
    });
    const errorKey = (o: number | null, m: string, f: string) => `${o}|${m}|${f}`;
    const errorCounts = new Map(
      errorGrouped.map((e) => [errorKey(e.organizationId, e.model, e.feature), e._count._all]),
    );

    for (const g of grouped) {
      if (g.organizationId === null) {
        this.logger.warn(
          `Skipping AI cost rollup row with no organizationId (model=${g.model}, feature=${g.feature}) — ${g._count._all} calls not rolled up`,
        );
        continue;
      }
      const organizationId = g.organizationId;
      const promptTokens = g._sum.promptTokens ?? 0;
      const candidatesTokens = g._sum.candidatesTokens ?? 0;
      const totalTokens = g._sum.totalTokens ?? 0;
      const costUsd = estimateCostUsd(g.model, promptTokens, candidatesTokens);

      await this.prisma.aiCostDailyAggregate.upsert({
        where: {
          org_day_model_feature_unique: {
            organizationId,
            day: from,
            model: g.model,
            feature: g.feature,
          },
        },
        update: {
          callCount: g._count._all,
          errorCount: errorCounts.get(errorKey(g.organizationId, g.model, g.feature)) ?? 0,
          promptTokens,
          candidatesTokens,
          totalTokens,
          costUsd,
          avgLatencyMs: Math.round(g._avg.latencyMs ?? 0),
        },
        create: {
          organizationId,
          day: from,
          model: g.model,
          feature: g.feature,
          callCount: g._count._all,
          errorCount: errorCounts.get(errorKey(g.organizationId, g.model, g.feature)) ?? 0,
          promptTokens,
          candidatesTokens,
          totalTokens,
          costUsd,
          avgLatencyMs: Math.round(g._avg.latencyMs ?? 0),
        },
      });
    }

    this.logger.log(
      `AI cost rollup for ${from.toISOString().slice(0, 10)}: ${grouped.length} org/model/feature rows`,
    );
  }

  /** Today's figures aren't rolled up yet — compute live from raw AiUsageLog. */
  private async liveSummarySince(from: Date) {
    const agg = await this.prisma.aiUsageLog.aggregate({
      where: { createdAt: { gte: from } },
      _count: { _all: true },
      _sum: { promptTokens: true, candidatesTokens: true, totalTokens: true },
    });
    const rows = await this.prisma.aiUsageLog.groupBy({
      by: ['model'],
      where: { createdAt: { gte: from } },
      _sum: { promptTokens: true, candidatesTokens: true },
    });
    const costUsd = rows.reduce(
      (sum, r) =>
        sum + estimateCostUsd(r.model, r._sum.promptTokens ?? 0, r._sum.candidatesTokens ?? 0),
      0,
    );
    return {
      callCount: agg._count._all,
      promptTokens: agg._sum.promptTokens ?? 0,
      candidatesTokens: agg._sum.candidatesTokens ?? 0,
      totalTokens: agg._sum.totalTokens ?? 0,
      costUsd,
    };
  }

  private async aggregatedSummarySince(from: Date) {
    const agg = await this.prisma.aiCostDailyAggregate.aggregate({
      where: { day: { gte: from } },
      _sum: {
        callCount: true,
        promptTokens: true,
        candidatesTokens: true,
        totalTokens: true,
        costUsd: true,
      },
    });
    return {
      callCount: agg._sum.callCount ?? 0,
      promptTokens: agg._sum.promptTokens ?? 0,
      candidatesTokens: agg._sum.candidatesTokens ?? 0,
      totalTokens: agg._sum.totalTokens ?? 0,
      costUsd: agg._sum.costUsd ?? 0,
    };
  }

  /** Today/month/year summary — rolled-up history plus a live top-up for today. */
  async getSummary() {
    const monthFrom = periodStart('month');
    const yearFrom = periodStart('year');

    const [todayLive, monthAgg, yearAgg] = await Promise.all([
      this.liveSummarySince(periodStart('today')),
      this.aggregatedSummarySince(monthFrom),
      this.aggregatedSummarySince(yearFrom),
    ]);

    const add = (
      a: Awaited<ReturnType<AiUsageService['aggregatedSummarySince']>>,
      b: Awaited<ReturnType<AiUsageService['liveSummarySince']>>,
    ) => ({
      callCount: a.callCount + b.callCount,
      promptTokens: a.promptTokens + b.promptTokens,
      candidatesTokens: a.candidatesTokens + b.candidatesTokens,
      totalTokens: a.totalTokens + b.totalTokens,
      costUsd: a.costUsd + b.costUsd,
    });

    return {
      today: todayLive,
      month: add(monthAgg, todayLive),
      year: add(yearAgg, todayLive),
      pricingVerified: false,
    };
  }

  /**
   * For 'month'/'year', AiCostDailyAggregate only covers days the nightly
   * rollup has already processed (i.e. up to yesterday) — today's activity
   * would silently be missing from the breakdown until tomorrow's rollup
   * runs. Merge in a live "today" bucket, same as getSummary() does.
   */
  async getByModel(period: 'today' | 'month' | 'year') {
    const todayLive = await this.prisma.aiUsageLog.groupBy({
      by: ['model'],
      where: { createdAt: { gte: periodStart('today') } },
      _count: { _all: true },
      _sum: { promptTokens: true, candidatesTokens: true, totalTokens: true },
      _avg: { latencyMs: true },
    });
    const liveRows = todayLive.map((r) => ({
      model: r.model,
      callCount: r._count._all,
      totalTokens: r._sum.totalTokens ?? 0,
      avgLatencyMs: Math.round(r._avg.latencyMs ?? 0),
      costUsd: estimateCostUsd(r.model, r._sum.promptTokens ?? 0, r._sum.candidatesTokens ?? 0),
    }));
    if (period === 'today') return liveRows;

    const historical = await this.prisma.aiCostDailyAggregate.groupBy({
      by: ['model'],
      where: { day: { gte: periodStart(period) } },
      _sum: { callCount: true, totalTokens: true, costUsd: true, avgLatencyMs: true },
    });
    const historicalRows = historical.map((r) => ({
      model: r.model,
      callCount: r._sum.callCount ?? 0,
      totalTokens: r._sum.totalTokens ?? 0,
      avgLatencyMs: Math.round(r._sum.avgLatencyMs ?? 0),
      costUsd: r._sum.costUsd ?? 0,
    }));
    return this.mergeByKey(historicalRows, liveRows, (r) => r.model);
  }

  async getByFeature(period: 'today' | 'month' | 'year') {
    const todayLive = await this.prisma.aiUsageLog.groupBy({
      by: ['feature'],
      where: { createdAt: { gte: periodStart('today') } },
      _count: { _all: true },
      _sum: { promptTokens: true, candidatesTokens: true, totalTokens: true },
    });
    const liveRows = todayLive.map((r) => ({
      feature: r.feature,
      callCount: r._count._all,
      totalTokens: r._sum.totalTokens ?? 0,
      costUsd: estimateCostUsd('gemini-2.5-flash', r._sum.promptTokens ?? 0, r._sum.candidatesTokens ?? 0),
    }));
    if (period === 'today') return liveRows;

    const historical = await this.prisma.aiCostDailyAggregate.groupBy({
      by: ['feature'],
      where: { day: { gte: periodStart(period) } },
      _sum: { callCount: true, totalTokens: true, costUsd: true },
    });
    const historicalRows = historical.map((r) => ({
      feature: r.feature,
      callCount: r._sum.callCount ?? 0,
      totalTokens: r._sum.totalTokens ?? 0,
      costUsd: r._sum.costUsd ?? 0,
    }));
    return this.mergeByKey(historicalRows, liveRows, (r) => r.feature);
  }

  async getByOrg(period: 'today' | 'month' | 'year') {
    const todayLive = await this.prisma.aiUsageLog.groupBy({
      by: ['organizationId'],
      where: { createdAt: { gte: periodStart('today') } },
      _count: { _all: true },
      _sum: { promptTokens: true, candidatesTokens: true, totalTokens: true },
    });
    const liveRows = todayLive.map((r) => ({
      organizationId: r.organizationId,
      callCount: r._count._all,
      totalTokens: r._sum.totalTokens ?? 0,
      costUsd: estimateCostUsd('gemini-2.5-flash', r._sum.promptTokens ?? 0, r._sum.candidatesTokens ?? 0),
    }));
    if (period === 'today') return this.withOrgNames(liveRows);

    const historical = await this.prisma.aiCostDailyAggregate.groupBy({
      by: ['organizationId'],
      where: { day: { gte: periodStart(period) } },
      _sum: { callCount: true, totalTokens: true, costUsd: true },
    });
    const historicalRows = historical.map((r) => ({
      organizationId: r.organizationId,
      callCount: r._sum.callCount ?? 0,
      totalTokens: r._sum.totalTokens ?? 0,
      costUsd: r._sum.costUsd ?? 0,
    }));
    return this.withOrgNames(
      this.mergeByKey(historicalRows, liveRows, (r) => String(r.organizationId)),
    );
  }

  /** Sum matching rows from historical + live buckets by a string key, keeping unmatched rows from either side. */
  private mergeByKey<T extends { callCount: number; totalTokens: number; costUsd: number; avgLatencyMs?: number }>(
    historical: T[],
    live: T[],
    keyOf: (row: T) => string,
  ): T[] {
    const merged = new Map<string, T>();
    for (const row of historical) merged.set(keyOf(row), { ...row });
    for (const row of live) {
      const key = keyOf(row);
      const existing = merged.get(key);
      if (!existing) {
        merged.set(key, { ...row });
        continue;
      }
      existing.callCount += row.callCount;
      existing.totalTokens += row.totalTokens;
      existing.costUsd += row.costUsd;
      if (existing.avgLatencyMs !== undefined && row.avgLatencyMs !== undefined) {
        existing.avgLatencyMs = Math.round((existing.avgLatencyMs + row.avgLatencyMs) / 2);
      }
    }
    return Array.from(merged.values());
  }

  private async withOrgNames<T extends { organizationId: number | null; costUsd: number }>(
    rows: T[],
  ): Promise<(T & { organizationName: string | null })[]> {
    const ids = rows.map((r) => r.organizationId).filter((id): id is number => id !== null);
    const orgs = ids.length
      ? await this.prisma.organization.findMany({
          where: { id: { in: ids } },
          select: { id: true, name: true },
        })
      : [];
    const nameById = new Map(orgs.map((o) => [o.id, o.name]));
    return rows
      .map((r) => ({
        ...r,
        organizationName: r.organizationId ? nameById.get(r.organizationId) ?? null : null,
      }))
      .sort((a, b) => b.costUsd - a.costUsd);
  }
}
