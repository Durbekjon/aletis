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
  ReplenishmentMethod,
  ReplenishmentStatus,
} from '@prisma/client';
import { REPLENISHMENT_QUEUE } from '@core/queue/queue.module';

const DAY_MS = 24 * 60 * 60 * 1000;

type PredictionBasis = {
  intervalDays?: number;
  purchaseCount?: number;
  packSize?: number;
  unitsPerDay?: number;
  estimatedLifespanDays?: number;
  source: string;
};

/** The statuses that count as an "open" reminder (loop not yet closed). */
const OPEN_STATUSES: ReplenishmentStatus[] = [
  ReplenishmentStatus.SCHEDULED,
  ReplenishmentStatus.SENT,
  ReplenishmentStatus.RESPONDED,
];

@Injectable()
export class ReplenishmentService {
  private readonly logger = new Logger(ReplenishmentService.name);

  constructor(
    @InjectQueue(REPLENISHMENT_QUEUE) private readonly queue: Queue,
    private readonly prisma: PrismaService,
    private readonly geminiService: GeminiService,
    private readonly telegramService: TelegramService,
    private readonly instagramService: InstagramService,
    private readonly encryptionService: EncryptionService,
    private readonly configService: ConfigService,
  ) {}

  /** Remind this many days BEFORE the predicted run-out. */
  private get leadDays(): number {
    return this.configService.get<number>('REPLENISH_LEAD_DAYS') ?? 3;
  }

  private get minLifespanDays(): number {
    return this.configService.get<number>('REPLENISH_MIN_LIFESPAN_DAYS') ?? 3;
  }

  private get maxLifespanDays(): number {
    return this.configService.get<number>('REPLENISH_MAX_LIFESPAN_DAYS') ?? 365;
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
  // Prediction (called after an order is created)
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * For each consumable line item in an order, predict when it will run out and
   * (re)schedule a single open reminder for that customer+product.
   */
  async computePrediction(orderId: number): Promise<void> {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: {
          customer: true,
          orderItems: { include: { product: true } },
        },
      });
      if (!order || !order.customer || !order.customerId) return;

      const orderDate = order.createdAt ?? new Date();

      for (const item of order.orderItems) {
        const product = item.product;
        if (!product || product.isDeleted) continue;

        const consumable = await this.resolveConsumable(product);
        if (!consumable.isConsumable) continue;

        const prediction = await this.predictDepletion({
          customerId: order.customerId,
          organizationId: order.organizationId,
          product,
          quantity: item.quantity || 1,
          orderDate,
          estimatedLifespanDays: consumable.estimatedLifespanDays,
        });
        if (!prediction) continue;

        // Supersede any still-scheduled reminder for this customer+product —
        // they just bought again, so the old prediction is stale.
        await this.prisma.replenishmentReminder.updateMany({
          where: {
            customerId: order.customerId,
            productId: product.id,
            status: ReplenishmentStatus.SCHEDULED,
          },
          data: { status: ReplenishmentStatus.DISMISSED },
        });

        await this.prisma.replenishmentReminder.create({
          data: {
            customerId: order.customerId,
            organizationId: order.organizationId,
            botId: order.customer.botId,
            productId: product.id,
            quantity: item.quantity || 1,
            lastOrderId: order.id,
            predictedDepletionDate: prediction.date,
            method: prediction.method,
            basis: prediction.basis as any,
            status: ReplenishmentStatus.SCHEDULED,
          },
        });
        this.logger.log(
          `Scheduled replenishment for customer ${order.customerId}, product "${product.name}" ` +
            `via ${prediction.method} → ${prediction.date.toISOString().slice(0, 10)}`,
        );
      }
    } catch (err: any) {
      this.logger.warn(`computePrediction(${orderId}) failed: ${err.message}`);
    }
  }

  /** Read the cached consumable classification, computing + caching it on first use. */
  private async resolveConsumable(product: {
    id: number;
    name: string;
    isConsumable: boolean | null;
    estimatedLifespanDays: number | null;
    organizationId: number;
  }): Promise<{ isConsumable: boolean; estimatedLifespanDays: number | null }> {
    if (product.isConsumable !== null) {
      return {
        isConsumable: product.isConsumable,
        estimatedLifespanDays: product.estimatedLifespanDays,
      };
    }

    const category = await this.getProductCategory(product.id);
    const classified = await this.geminiService.classifyConsumable(
      { name: product.name, category },
      { organizationId: product.organizationId },
    );

    await this.prisma.product.update({
      where: { id: product.id },
      data: {
        isConsumable: classified.consumable,
        estimatedLifespanDays: classified.estimatedLifespanDays,
      },
    });

    return {
      isConsumable: classified.consumable,
      estimatedLifespanDays: classified.estimatedLifespanDays,
    };
  }

  /** Best-effort category from the product's dynamic schema fields (for AI context). */
  private async getProductCategory(productId: number): Promise<string | null> {
    const fv = await this.prisma.fieldValue.findFirst({
      where: {
        productId,
        field: { name: { contains: 'categor', mode: 'insensitive' } },
      },
      select: { valueText: true },
    });
    return fv?.valueText ?? null;
  }

  /**
   * Pick the strongest available signal for when a product will run out.
   * CADENCE (repeat interval) → DOSAGE (rate from chat) → AI_ESTIMATE (fallback).
   */
  private async predictDepletion(input: {
    customerId: number;
    organizationId?: number;
    product: { id: number; name: string };
    quantity: number;
    orderDate: Date;
    estimatedLifespanDays: number | null;
  }): Promise<{
    date: Date;
    method: ReplenishmentMethod;
    basis: PredictionBasis;
  } | null> {
    const { customerId, organizationId, product, quantity, orderDate } = input;

    // 1) CADENCE — prior purchases of this product by this customer.
    const priorPurchases = await this.prisma.orderItem.findMany({
      where: {
        productId: product.id,
        order: { customerId, createdAt: { lt: orderDate } },
      },
      select: { order: { select: { createdAt: true } } },
      orderBy: { order: { createdAt: 'asc' } },
    });
    const purchaseDates = priorPurchases
      .map((p) => p.order?.createdAt)
      .filter((d): d is Date => !!d)
      .concat(orderDate)
      .sort((a, b) => a.getTime() - b.getTime());

    if (purchaseDates.length >= 2) {
      const gaps: number[] = [];
      for (let i = 1; i < purchaseDates.length; i++) {
        gaps.push(
          (purchaseDates[i].getTime() - purchaseDates[i - 1].getTime()) / DAY_MS,
        );
      }
      const intervalDays = this.clampDays(this.median(gaps));
      return {
        date: new Date(orderDate.getTime() + intervalDays * DAY_MS),
        method: ReplenishmentMethod.CADENCE,
        basis: {
          intervalDays,
          purchaseCount: purchaseDates.length,
          source: 'median repeat-purchase interval',
        },
      };
    }

    // 2) DOSAGE — usage rate + pack size extracted from the conversation.
    const recentMessages = await this.getRecentMessages(customerId);
    if (recentMessages) {
      const { unitsPerDay, packSize } =
        await this.geminiService.extractUsageRate(
          { productName: product.name, recentMessages },
          { organizationId },
        );
      if (unitsPerDay && packSize) {
        const days = this.clampDays((packSize * quantity) / unitsPerDay);
        return {
          date: new Date(orderDate.getTime() + days * DAY_MS),
          method: ReplenishmentMethod.DOSAGE,
          basis: {
            packSize,
            unitsPerDay,
            source: 'pack size ÷ usage rate from conversation',
          },
        };
      }
    }

    // 3) AI_ESTIMATE — fall back to the classifier's default lifespan.
    if (input.estimatedLifespanDays) {
      const days = this.clampDays(input.estimatedLifespanDays * quantity);
      return {
        date: new Date(orderDate.getTime() + days * DAY_MS),
        method: ReplenishmentMethod.AI_ESTIMATE,
        basis: {
          estimatedLifespanDays: input.estimatedLifespanDays,
          source: 'AI-estimated default lifespan',
        },
      };
    }

    return null;
  }

  private async getRecentMessages(customerId: number): Promise<string> {
    const messages = await this.prisma.message.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { sender: true, content: true },
    });
    return messages
      .reverse()
      .map((m) => `[${m.sender}] ${m.content}`)
      .join('\n');
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Scan / enqueue
  // ──────────────────────────────────────────────────────────────────────────

  /** Enqueue reminders that are within `leadDays` of their predicted run-out. */
  async scanAndEnqueue(
    organizationId: number,
  ): Promise<{ due: number; enqueued: number }> {
    const dueCutoff = new Date(Date.now() + this.leadDays * DAY_MS);
    const due = await this.prisma.replenishmentReminder.findMany({
      where: {
        organizationId,
        status: ReplenishmentStatus.SCHEDULED,
        predictedDepletionDate: { lte: dueCutoff },
      },
      select: { id: true },
    });

    let enqueued = 0;
    for (const r of due) {
      await this.enqueueReminder(r.id);
      enqueued++;
    }
    this.logger.log(
      `Org ${organizationId}: ${due.length} replenishment reminders due, ${enqueued} enqueued`,
    );
    return { due: due.length, enqueued };
  }

  async scanAllOrganizations(): Promise<void> {
    const orgs = await this.prisma.organization.findMany({
      select: { id: true },
    });
    for (const o of orgs) {
      try {
        await this.scanAndEnqueue(o.id);
      } catch (err: any) {
        this.logger.warn(`Replenishment scan failed for org ${o.id}: ${err.message}`);
      }
    }
  }

  async enqueueReminder(reminderId: number): Promise<void> {
    await this.queue.add(
      'send-reminder',
      { reminderId },
      {
        jobId: `replenish-${reminderId}`,
        attempts: 2,
        backoff: { type: 'fixed', delay: 60_000 },
        removeOnComplete: true,
        removeOnFail: { count: 5 },
      },
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Execution (called by the processor)
  // ──────────────────────────────────────────────────────────────────────────

  async runReminder(reminderId: number): Promise<void> {
    const reminder = await this.prisma.replenishmentReminder.findUnique({
      where: { id: reminderId },
      include: {
        customer: { include: { bot: true } },
        product: { select: { name: true, price: true, currency: true } },
        organization: { select: { name: true } },
      },
    });
    if (!reminder || reminder.status !== ReplenishmentStatus.SCHEDULED) return;
    const { customer } = reminder;
    if (!customer) {
      await this.fail(reminderId, 'customer missing');
      return;
    }

    // If the customer already reordered this product since we scheduled, skip.
    const reordered = await this.prisma.orderItem.findFirst({
      where: {
        productId: reminder.productId,
        order: {
          customerId: reminder.customerId,
          createdAt: { gt: reminder.createdAt },
        },
      },
      select: { id: true },
    });
    if (reordered) {
      await this.prisma.replenishmentReminder.update({
        where: { id: reminderId },
        data: { status: ReplenishmentStatus.SKIPPED },
      });
      this.logger.log(
        `Replenishment #${reminderId} skipped — customer already reordered`,
      );
      return;
    }

    const daysLeft = Math.ceil(
      (reminder.predictedDepletionDate.getTime() - Date.now()) / DAY_MS,
    );
    const { text } = await this.geminiService.generateReplenishmentMessage({
      customerName: customer.name,
      lang: customer.lang,
      businessName: reminder.organization?.name,
      productName: reminder.product.name,
      daysLeft,
      price: reminder.product.price,
      currency: reminder.product.currency,
    }, { organizationId: reminder.organizationId });

    try {
      await this.sendToCustomer(customer.channel, reminder.organizationId, customer, text);
    } catch (err: any) {
      await this.fail(reminderId, err.message);
      return;
    }

    await this.prisma.replenishmentReminder.update({
      where: { id: reminderId },
      data: {
        status: ReplenishmentStatus.SENT,
        sentAt: new Date(),
        generatedMessage: text,
      },
    });
    this.logger.log(
      `Replenishment #${reminderId} sent to customer ${customer.id} via ${customer.channel}`,
    );
  }

  private async sendToCustomer(
    channel: CustomerChannel,
    organizationId: number,
    customer: {
      telegramId: string;
      instagramId: string | null;
      bot: { token: string } | null;
    },
    text: string,
  ): Promise<void> {
    switch (channel) {
      case CustomerChannel.TELEGRAM: {
        if (!customer.bot) throw new Error('Customer has no Telegram bot');
        const token = this.encryptionService.decrypt(customer.bot.token);
        const res = await this.telegramService.sendRequest(token, 'sendMessage', {
          chat_id: customer.telegramId,
          text,
          parse_mode: 'HTML',
        });
        if (res && res.ok === false) {
          throw new Error(`Telegram send failed: ${res.description ?? 'unknown'}`);
        }
        return;
      }
      case CustomerChannel.INSTAGRAM: {
        if (!customer.instagramId) throw new Error('Customer has no Instagram ID');
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

  private async fail(reminderId: number, reason: string): Promise<void> {
    this.logger.warn(`Replenishment #${reminderId} failed: ${reason}`);
    await this.prisma.replenishmentReminder.update({
      where: { id: reminderId },
      data: { status: ReplenishmentStatus.FAILED },
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Outcome tracking (hooks) + reporting
  // ──────────────────────────────────────────────────────────────────────────

  /** New order for a product — close any open reminder for it as PURCHASED. */
  async markPurchaseIfPending(
    customerId: number,
    productId: number,
    orderId: number,
  ): Promise<void> {
    try {
      const reminder = await this.prisma.replenishmentReminder.findFirst({
        where: {
          customerId,
          productId,
          status: { in: OPEN_STATUSES },
        },
        orderBy: { createdAt: 'desc' },
      });
      if (!reminder) return;
      await this.prisma.replenishmentReminder.update({
        where: { id: reminder.id },
        data: {
          status: ReplenishmentStatus.PURCHASED,
          purchasedAt: new Date(),
          purchasedOrderId: orderId,
        },
      });
      this.logger.log(
        `Replenishment #${reminder.id} → PURCHASED 🎉 (order #${orderId})`,
      );
    } catch (err: any) {
      this.logger.warn(`markPurchaseIfPending failed: ${err.message}`);
    }
  }

  /** Inbound message — if a reminder was just SENT, mark RESPONDED. */
  async markResponseIfPending(customerId: number): Promise<void> {
    try {
      const reminder = await this.prisma.replenishmentReminder.findFirst({
        where: { customerId, status: ReplenishmentStatus.SENT },
        orderBy: { sentAt: 'desc' },
      });
      if (!reminder) return;
      await this.prisma.replenishmentReminder.update({
        where: { id: reminder.id },
        data: { status: ReplenishmentStatus.RESPONDED, respondedAt: new Date() },
      });
    } catch (err: any) {
      this.logger.warn(`markResponseIfPending failed: ${err.message}`);
    }
  }

  async getUpcoming(organizationId: number, limit = 50) {
    return this.prisma.replenishmentReminder.findMany({
      where: { organizationId, status: ReplenishmentStatus.SCHEDULED },
      orderBy: { predictedDepletionDate: 'asc' },
      take: limit,
      include: {
        customer: { select: { id: true, name: true, username: true, channel: true } },
        product: { select: { id: true, name: true } },
      },
    });
  }

  async listReminders(
    organizationId: number,
    opts: { status?: ReplenishmentStatus; limit?: number } = {},
  ) {
    return this.prisma.replenishmentReminder.findMany({
      where: {
        organizationId,
        ...(opts.status ? { status: opts.status } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: opts.limit ?? 50,
      include: {
        customer: { select: { id: true, name: true, username: true, channel: true } },
        product: { select: { id: true, name: true } },
      },
    });
  }

  async getMetrics(organizationId: number) {
    const grouped = await this.prisma.replenishmentReminder.groupBy({
      by: ['status'],
      where: { organizationId },
      _count: { _all: true },
    });
    const count = (s: ReplenishmentStatus) =>
      grouped.find((g) => g.status === s)?._count._all ?? 0;

    const sent =
      count(ReplenishmentStatus.SENT) +
      count(ReplenishmentStatus.RESPONDED) +
      count(ReplenishmentStatus.PURCHASED);
    const responded =
      count(ReplenishmentStatus.RESPONDED) + count(ReplenishmentStatus.PURCHASED);
    const purchased = count(ReplenishmentStatus.PURCHASED);

    return {
      scheduled: count(ReplenishmentStatus.SCHEDULED),
      sent,
      responded,
      purchased,
      failed: count(ReplenishmentStatus.FAILED),
      responseRate: sent === 0 ? 0 : (responded / sent) * 100,
      reorderRate: sent === 0 ? 0 : (purchased / sent) * 100,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────────────────────────────────

  private median(values: number[]): number {
    if (!values.length) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  private clampDays(days: number): number {
    const rounded = Math.round(days);
    return Math.min(this.maxLifespanDays, Math.max(this.minLifespanDays, rounded));
  }
}
