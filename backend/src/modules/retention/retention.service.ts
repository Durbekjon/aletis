import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '@core/prisma/prisma.service';
import { GeminiService } from '@core/gemini/gemini.service';
import { TelegramService } from '@modules/telegram/telegram.service';
import { InstagramService } from '@modules/instagram/instagram.service';
import { EncryptionService } from '@core/encryption/encryption.service';
import { ConfigService } from '@nestjs/config';
import {
  CustomerChannel,
  Prisma,
  WinBackAttempt,
  WinBackStatus,
} from '@prisma/client';
import { RETENTION_QUEUE } from '@core/queue/queue.module';

export type DormantCustomer = {
  id: number;
  name: string;
  username: string | null;
  channel: CustomerChannel;
  lang: string | null;
  lastActivityAt: Date | null;
  dormantDays: number;
  orderCount: number;
  totalSpent: number;
  currency: string;
  aiTags: string[];
  lastWinBackAt: Date | null;
};

@Injectable()
export class RetentionService {
  private readonly logger = new Logger(RetentionService.name);

  constructor(
    @InjectQueue(RETENTION_QUEUE) private readonly queue: Queue,
    private readonly prisma: PrismaService,
    private readonly geminiService: GeminiService,
    private readonly telegramService: TelegramService,
    private readonly instagramService: InstagramService,
    private readonly encryptionService: EncryptionService,
    private readonly configService: ConfigService,
  ) {}

  private get dormantDays(): number {
    return this.configService.get<number>('WINBACK_DORMANT_DAYS') ?? 21;
  }

  /** Don't re-target the same customer within this window (days). */
  private get cooldownDays(): number {
    return this.configService.get<number>('WINBACK_COOLDOWN_DAYS') ?? 14;
  }

  /** A win-back counts as recovered if an order lands within this window. */
  private get recoveryWindowDays(): number {
    return this.configService.get<number>('WINBACK_RECOVERY_DAYS') ?? 30;
  }

  async resolveOrgId(userId: number): Promise<number> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { member: { include: { organization: true } } },
    });
    if (!user?.member?.organization?.id) {
      throw new Error('User not associated with any organization');
    }
    return user.member.organization.id;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Detection
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Find customers who were active buyers but have gone quiet.
   * "Dormant" = last order OR last inbound message older than `dormantDays`,
   * and at least one prior order (so win-back is meaningful: they already
   * trusted us once — we want to make that permanent).
   */
  async getDormantCustomers(
    organizationId: number,
    opts: { dormantDays?: number; includeRecentlyTargeted?: boolean } = {},
  ): Promise<DormantCustomer[]> {
    const threshold = opts.dormantDays ?? this.dormantDays;
    const cutoff = new Date(Date.now() - threshold * 24 * 60 * 60 * 1000);
    const cooldownCutoff = new Date(
      Date.now() - this.cooldownDays * 24 * 60 * 60 * 1000,
    );

    const customers = await this.prisma.customer.findMany({
      where: {
        organizationId,
        orders: { some: {} }, // has bought at least once
      },
      include: {
        orders: {
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true, totalPrice: true, currency: true },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { createdAt: true },
        },
        aiNote: { select: { aiTags: true } },
        winBackAttempts: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { createdAt: true, status: true },
        },
      },
    });

    const result: DormantCustomer[] = [];
    for (const c of customers) {
      const lastOrderAt = c.orders[0]?.createdAt ?? null;
      const lastMsgAt = c.messages[0]?.createdAt ?? null;
      const lastActivityAt = this.maxDate(lastOrderAt, lastMsgAt);
      if (!lastActivityAt || lastActivityAt > cutoff) continue; // still active

      const lastWb = c.winBackAttempts[0] ?? null;
      const recentlyTargeted =
        !!lastWb &&
        lastWb.createdAt > cooldownCutoff &&
        lastWb.status !== WinBackStatus.FAILED;
      if (recentlyTargeted && !opts.includeRecentlyTargeted) continue;

      const totalSpent = c.orders.reduce((s, o) => s + (o.totalPrice ?? 0), 0);
      result.push({
        id: c.id,
        name: c.name,
        username: c.username,
        channel: c.channel,
        lang: c.lang,
        lastActivityAt,
        dormantDays: Math.floor(
          (Date.now() - lastActivityAt.getTime()) / (24 * 60 * 60 * 1000),
        ),
        orderCount: c.orders.length,
        totalSpent,
        currency: c.orders[0]?.currency ?? 'USD',
        aiTags: c.aiNote?.aiTags ?? [],
        lastWinBackAt: lastWb?.createdAt ?? null,
      });
    }

    result.sort((a, b) => b.dormantDays - a.dormantDays);
    return result;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Enqueue / scan
  // ──────────────────────────────────────────────────────────────────────────

  /** Queue a single win-back for one customer (used by manual trigger + scan). */
  async enqueueWinBack(
    customerId: number,
    organizationId: number,
    opts: { dormantDays?: number; incentive?: string } = {},
  ): Promise<WinBackAttempt | null> {
    // Avoid duplicate open attempts
    const open = await this.prisma.winBackAttempt.findFirst({
      where: {
        customerId,
        status: { in: [WinBackStatus.QUEUED, WinBackStatus.SENT] },
      },
    });
    if (open) {
      this.logger.debug(
        `Win-back already open for customer ${customerId} (#${open.id})`,
      );
      return open;
    }

    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: { channel: true, organizationId: true },
    });
    if (!customer || customer.organizationId !== organizationId) return null;

    const attempt = await this.prisma.winBackAttempt.create({
      data: {
        customerId,
        organizationId,
        channel: customer.channel,
        status: WinBackStatus.QUEUED,
        dormantDays: opts.dormantDays ?? null,
        incentive: opts.incentive ?? null,
      },
    });

    await this.queue.add(
      'send-win-back',
      { attemptId: attempt.id },
      {
        jobId: `winback-${attempt.id}`,
        attempts: 2,
        backoff: { type: 'fixed', delay: 60_000 },
        removeOnComplete: true,
        removeOnFail: { count: 5 },
      },
    );
    this.logger.log(
      `Enqueued win-back #${attempt.id} for customer ${customerId}`,
    );
    return attempt;
  }

  /** Scan an org for dormant customers and enqueue win-backs for each. */
  async scanAndEnqueue(
    organizationId: number,
    opts: { dormantDays?: number; incentive?: string; limit?: number } = {},
  ): Promise<{ dormant: number; enqueued: number }> {
    const dormant = await this.getDormantCustomers(organizationId, {
      dormantDays: opts.dormantDays,
    });
    const slice = opts.limit ? dormant.slice(0, opts.limit) : dormant;
    let enqueued = 0;
    for (const d of slice) {
      const attempt = await this.enqueueWinBack(d.id, organizationId, {
        dormantDays: d.dormantDays,
        incentive: opts.incentive,
      });
      if (attempt && attempt.status === WinBackStatus.QUEUED) enqueued++;
    }
    this.logger.log(
      `Org ${organizationId}: ${dormant.length} dormant, ${enqueued} win-backs enqueued`,
    );
    return { dormant: dormant.length, enqueued };
  }

  /** Daily cron entry: scan every organization. */
  async scanAllOrganizations(): Promise<void> {
    const orgs = await this.prisma.organization.findMany({
      select: { id: true },
    });
    for (const o of orgs) {
      try {
        await this.scanAndEnqueue(o.id);
      } catch (err: any) {
        this.logger.warn(`Scan failed for org ${o.id}: ${err.message}`);
      }
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Execution (called by the processor)
  // ──────────────────────────────────────────────────────────────────────────

  async runWinBack(attemptId: number): Promise<void> {
    const attempt = await this.prisma.winBackAttempt.findUnique({
      where: { id: attemptId },
      include: {
        customer: {
          include: { bot: true, aiNote: true },
        },
        organization: { select: { name: true } },
      },
    });
    if (!attempt || attempt.status !== WinBackStatus.QUEUED) return;
    const { customer } = attempt;
    if (!customer) {
      await this.fail(attemptId, 'customer missing');
      return;
    }

    // If the customer became active again since we queued, skip gracefully.
    const recentMsg = await this.prisma.message.findFirst({
      where: { customerId: customer.id, createdAt: { gt: attempt.createdAt } },
      select: { id: true },
    });
    if (recentMsg) {
      await this.prisma.winBackAttempt.update({
        where: { id: attemptId },
        data: { status: WinBackStatus.SKIPPED },
      });
      this.logger.log(`Win-back #${attemptId} skipped — customer re-engaged`);
      return;
    }

    const note = customer.aiNote;
    const { text } = await this.geminiService.generateWinBackMessage({
      customerName: customer.name,
      lang: customer.lang,
      businessName: attempt.organization?.name,
      dormantDays: attempt.dormantDays,
      purchaseHistory: note?.purchaseHistory,
      favoriteCategories: note?.favoriteCategories,
      salesOpportunities: note?.salesOpportunities,
      aiSummary: note?.aiSummary,
      incentive: attempt.incentive,
    });

    try {
      await this.sendToCustomer(attempt.channel, attempt.organizationId, customer, text);
    } catch (err: any) {
      await this.fail(attemptId, err.message);
      return;
    }

    await this.prisma.winBackAttempt.update({
      where: { id: attemptId },
      data: {
        status: WinBackStatus.SENT,
        sentAt: new Date(),
        generatedMessage: text,
      },
    });
    this.logger.log(
      `Win-back #${attemptId} sent to customer ${customer.id} via ${attempt.channel}`,
    );
  }

  private async sendToCustomer(
    channel: CustomerChannel,
    organizationId: number,
    customer: { telegramId: string; instagramId: string | null; bot: { token: string } | null },
    text: string,
  ): Promise<void> {
    switch (channel) {
      case CustomerChannel.TELEGRAM: {
        if (!customer.bot) throw new Error('Customer has no Telegram bot');
        const token = this.encryptionService.decrypt(customer.bot.token);
        const res = await this.telegramService.sendRequest(
          token,
          'sendMessage',
          { chat_id: customer.telegramId, text, parse_mode: 'HTML' },
        );
        if (res && res.ok === false) {
          throw new Error(
            `Telegram send failed: ${res.description ?? 'unknown'}`,
          );
        }
        return;
      }
      case CustomerChannel.INSTAGRAM: {
        if (!customer.instagramId) {
          throw new Error('Customer has no Instagram ID');
        }
        await this.instagramService.sendMessage(
          organizationId,
          customer.instagramId,
          text,
        );
        return;
      }
      default:
        throw new Error(`Unknown channel: ${channel}`);
    }
  }

  private async fail(attemptId: number, reason: string): Promise<void> {
    this.logger.warn(`Win-back #${attemptId} failed: ${reason}`);
    await this.prisma.winBackAttempt.update({
      where: { id: attemptId },
      data: { status: WinBackStatus.FAILED },
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Outcome tracking (hooks)
  // ──────────────────────────────────────────────────────────────────────────

  /** Inbound message arrived — if there's a recent SENT win-back, mark RESPONDED. */
  async markResponseIfPending(customerId: number): Promise<void> {
    try {
      const attempt = await this.prisma.winBackAttempt.findFirst({
        where: { customerId, status: WinBackStatus.SENT },
        orderBy: { sentAt: 'desc' },
      });
      if (!attempt) return;
      await this.prisma.winBackAttempt.update({
        where: { id: attempt.id },
        data: { status: WinBackStatus.RESPONDED, respondedAt: new Date() },
      });
      this.logger.log(`Win-back #${attempt.id} → RESPONDED (customer replied)`);
    } catch (err: any) {
      this.logger.warn(`markResponseIfPending failed: ${err.message}`);
    }
  }

  /** New order placed — if there's a recent win-back, close the loop as RECOVERED. */
  async markRecoveryIfPending(
    customerId: number,
    orderId: number,
    revenue: number,
  ): Promise<void> {
    try {
      const since = new Date(
        Date.now() - this.recoveryWindowDays * 24 * 60 * 60 * 1000,
      );
      const attempt = await this.prisma.winBackAttempt.findFirst({
        where: {
          customerId,
          status: { in: [WinBackStatus.SENT, WinBackStatus.RESPONDED] },
          sentAt: { gte: since },
        },
        orderBy: { sentAt: 'desc' },
      });
      if (!attempt) return;
      await this.prisma.winBackAttempt.update({
        where: { id: attempt.id },
        data: {
          status: WinBackStatus.RECOVERED,
          recoveredAt: new Date(),
          recoveredOrderId: orderId,
          recoveredRevenue: revenue,
        },
      });
      this.logger.log(
        `Win-back #${attempt.id} → RECOVERED 🎉 (order #${orderId}, ${revenue})`,
      );
    } catch (err: any) {
      this.logger.warn(`markRecoveryIfPending failed: ${err.message}`);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Reporting
  // ──────────────────────────────────────────────────────────────────────────

  async listAttempts(
    organizationId: number,
    opts: { status?: WinBackStatus; limit?: number } = {},
  ) {
    return this.prisma.winBackAttempt.findMany({
      where: {
        organizationId,
        ...(opts.status ? { status: opts.status } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: opts.limit ?? 50,
      include: {
        customer: {
          select: { id: true, name: true, username: true, channel: true },
        },
      },
    });
  }

  async getMetrics(organizationId: number) {
    const [grouped, revenueAgg, dormant] = await Promise.all([
      this.prisma.winBackAttempt.groupBy({
        by: ['status'],
        where: { organizationId },
        _count: { _all: true },
      }),
      this.prisma.winBackAttempt.aggregate({
        where: { organizationId, status: WinBackStatus.RECOVERED },
        _sum: { recoveredRevenue: true },
      }),
      this.getDormantCustomers(organizationId, {
        includeRecentlyTargeted: true,
      }),
    ]);

    const count = (s: WinBackStatus) =>
      grouped.find((g) => g.status === s)?._count._all ?? 0;

    const sent =
      count(WinBackStatus.SENT) +
      count(WinBackStatus.RESPONDED) +
      count(WinBackStatus.RECOVERED);
    const responded =
      count(WinBackStatus.RESPONDED) + count(WinBackStatus.RECOVERED);
    const recovered = count(WinBackStatus.RECOVERED);

    return {
      dormantCount: dormant.length,
      queued: count(WinBackStatus.QUEUED),
      sent,
      responded,
      recovered,
      failed: count(WinBackStatus.FAILED),
      revenueRecovered: revenueAgg._sum.recoveredRevenue ?? 0,
      responseRate: sent === 0 ? 0 : (responded / sent) * 100,
      recoveryRate: sent === 0 ? 0 : (recovered / sent) * 100,
    };
  }

  private maxDate(a: Date | null, b: Date | null): Date | null {
    if (!a) return b;
    if (!b) return a;
    return a > b ? a : b;
  }
}
