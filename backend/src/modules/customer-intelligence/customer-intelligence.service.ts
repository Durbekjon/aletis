import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '@core/prisma/prisma.service';
import { GeminiService } from '@core/gemini/gemini.service';
import { TelegramService } from '@modules/telegram/telegram.service';
import { EncryptionService } from '@core/encryption/encryption.service';
import { ConfigService } from '@nestjs/config';
import { CustomerAiNote, Prisma, PriceSensitivity, Product } from '@prisma/client';
import { CUSTOMER_INTELLIGENCE_QUEUE } from '@core/queue/queue.module';

@Injectable()
export class CustomerIntelligenceService {
  private readonly logger = new Logger(CustomerIntelligenceService.name);
  private readonly RATE_LIMIT_HOURS = 2;

  constructor(
    @InjectQueue(CUSTOMER_INTELLIGENCE_QUEUE) private readonly queue: Queue,
    private readonly prisma: PrismaService,
    private readonly geminiService: GeminiService,
    private readonly telegramService: TelegramService,
    private readonly encryptionService: EncryptionService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Debounced enqueue for customer analysis.
   * Resets the 5-minute timer on each call so we only analyze after
   * the conversation has been idle — never mid-conversation.
   */
  async enqueueAnalysis(customerId: number, organizationId: number): Promise<void> {
    const jobId = `analyze:${customerId}`;
    const existing = await this.queue.getJob(jobId);
    if (existing) {
      const state = await existing.getState();
      if (state === 'delayed') await existing.remove();
    }
    await this.queue.add(
      'analyze-customer',
      { customerId, organizationId },
      {
        jobId,
        delay: 5 * 60 * 1000, // 5 minutes — debounce window
        attempts: 2,
        backoff: { type: 'fixed', delay: 60_000 },
        removeOnComplete: true,
        removeOnFail: { count: 3 },
      },
    );
    this.logger.debug(`Enqueued analyze-customer for ${customerId} (5 min delay reset)`);
  }

  /**
   * Schedule a follow-up message after order delivery.
   * Uses a stable jobId so the same order is never double-scheduled.
   */
  async enqueueFollowUp(orderId: number): Promise<void> {
    const jobId = `followup:${orderId}`;
    const existing = await this.queue.getJob(jobId);
    if (existing) return; // already scheduled

    const days = this.configService.get<number>('FOLLOW_UP_DAYS') ?? 3;
    await this.queue.add(
      'send-follow-up',
      { orderId },
      {
        jobId,
        delay: days * 24 * 60 * 60 * 1000,
        attempts: 2,
        backoff: { type: 'fixed', delay: 60_000 },
        removeOnComplete: true,
        removeOnFail: { count: 1 },
      },
    );
    this.logger.log(`Enqueued follow-up for order ${orderId} (fires in ${days}d)`);
  }

  async analyzeCustomer(
    customerId: number,
    organizationId: number,
  ): Promise<CustomerAiNote | null> {
    try {
      const existing = await this.prisma.customerAiNote.findUnique({
        where: { customerId },
      });

      if (existing?.lastAnalyzedAt) {
        const hoursAgo =
          (Date.now() - existing.lastAnalyzedAt.getTime()) / (1000 * 60 * 60);
        if (hoursAgo < this.RATE_LIMIT_HOURS) {
          this.logger.debug(
            `Skipping analysis for customer ${customerId} — analyzed ${hoursAgo.toFixed(1)}h ago`,
          );
          return existing;
        }
      }

      const [messages, orders] = await Promise.all([
        this.prisma.message.findMany({
          where: { customerId },
          orderBy: { createdAt: 'desc' },
          take: 50,
        }),
        this.prisma.order.findMany({
          where: { customerId, organizationId },
          include: {
            orderItems: {
              include: { product: { select: { id: true, name: true, price: true, currency: true } } },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
      ]);

      const customer = await this.prisma.customer.findUnique({
        where: { id: customerId },
        select: { name: true, lang: true, createdAt: true },
      });

      if (!customer) return null;

      const contextLines: string[] = [
        `Customer: ${customer.name}`,
        `Language: ${customer.lang || 'unknown'}`,
        `Customer since: ${customer.createdAt.toISOString().split('T')[0]}`,
        '',
        `ORDERS (${orders.length} total):`,
        ...orders.map(
          (o) =>
            `- Order #${o.id} | ${o.status} | ${o.totalPrice} ${o.currency} | ${o.createdAt.toISOString().split('T')[0]} | Items: ${o.orderItems.map((i) => `${i.product.name} x${i.quantity}`).join(', ')}`,
        ),
        '',
        `RECENT CONVERSATION (${messages.length} messages):`,
        ...messages
          .slice(0, 30)
          .reverse()
          .map((m) => `[${m.sender}] ${m.content.substring(0, 200)}`),
      ];

      const rawInsights = await this.geminiService.analyzeCustomerInsights(
        contextLines.join('\n'),
      );

      const parsed = this.parseInsights(rawInsights);
      if (!parsed) {
        this.logger.warn(
          `Failed to parse AI insights for customer ${customerId}`,
        );
        return existing;
      }

      const toJson = (v: any): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput =>
        v == null ? Prisma.DbNull : (v as Prisma.InputJsonValue);

      const noteData = {
        purchaseHistory: toJson(parsed.purchaseHistory),
        productInterests: toJson(parsed.productInterests),
        favoriteCategories: toJson(parsed.favoriteCategories),
        frequentQuestions: toJson(parsed.frequentQuestions),
        priceSensitivity: parsed.priceSensitivity ?? PriceSensitivity.MEDIUM,
        buyingBehavior: toJson(parsed.buyingBehavior),
        aiSummary: parsed.aiSummary ?? null,
        salesOpportunities: toJson(parsed.salesOpportunities),
        aiTags: parsed.aiTags ?? [],
        lastAnalyzedAt: new Date(),
      };

      const note = await this.prisma.customerAiNote.upsert({
        where: { customerId },
        create: { customerId, organizationId, ...noteData },
        update: noteData,
      });

      this.logger.log(
        `AI note updated for customer ${customerId}: tags=[${parsed.aiTags?.join(', ')}]`,
      );
      return note;
    } catch (error) {
      this.logger.error(
        `Error analyzing customer ${customerId}: ${error.message}`,
        error.stack,
      );
      return null;
    }
  }

  async notifyInterestedCustomers(
    product: Product,
    organizationId: number,
  ): Promise<void> {
    try {
      const productKeywords = product.name.toLowerCase().split(/\s+/);

      const notes = await this.prisma.customerAiNote.findMany({
        where: { organizationId },
        include: {
          customer: {
            include: { bot: true },
          },
        },
      });

      const interested = notes.filter((note) => {
        const interests = (note.productInterests as any[]) || [];
        const categories = (note.favoriteCategories as string[]) || [];
        const allKeywords = [
          ...interests.map((i: any) => (i.name || '').toLowerCase()),
          ...interests.map((i: any) => (i.category || '').toLowerCase()),
          ...categories.map((c) => c.toLowerCase()),
        ];
        return productKeywords.some((kw) =>
          allKeywords.some((ak) => ak.includes(kw) || kw.includes(ak)),
        );
      });

      this.logger.log(
        `Notifying ${interested.length} customers about new product "${product.name}"`,
      );

      const baseUrl =
        this.configService.get<string>('PUBLIC_BASE_URL') ||
        process.env.PUBLIC_BASE_URL ||
        '';

      for (const note of interested) {
        try {
          const { customer } = note;
          const decryptedToken = this.encryptionService.decrypt(
            customer.bot.token,
          );
          const lang = customer.lang || 'uz';
          const message = this.buildProductNotification(
            product,
            lang,
            baseUrl,
          );

          await this.telegramService.sendRequest(
            decryptedToken,
            'sendMessage',
            {
              chat_id: customer.telegramId,
              text: message,
              parse_mode: 'HTML',
            },
          );

          this.logger.log(
            `Notified customer ${customer.id} about product "${product.name}"`,
          );
        } catch (err) {
          this.logger.error(
            `Failed to notify customer ${note.customerId}: ${err.message}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Error in notifyInterestedCustomers: ${error.message}`,
        error.stack,
      );
    }
  }

  async sendFollowUpForOrder(orderId: number): Promise<void> {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: {
          customer: { include: { bot: true } },
          orderItems: { include: { product: { select: { name: true } } } },
        },
      });

      if (!order || !order.customer || order.followUpSentAt) return;

      const { customer } = order;
      const decryptedToken = this.encryptionService.decrypt(
        customer.bot.token,
      );
      const lang = customer.lang || 'uz';
      const productNames = order.orderItems
        .map((i) => i.product.name)
        .join(', ');
      const message = this.buildFollowUpMessage(productNames, lang);

      await this.telegramService.sendRequest(decryptedToken, 'sendMessage', {
        chat_id: customer.telegramId,
        text: message,
        parse_mode: 'HTML',
      });

      await this.prisma.order.update({
        where: { id: orderId },
        data: { followUpSentAt: new Date() },
      });

      this.logger.log(`Follow-up sent for order ${orderId}`);
    } catch (error) {
      this.logger.error(
        `Error sending follow-up for order ${orderId}: ${error.message}`,
        error.stack,
      );
    }
  }

  async getCustomerInsights(
    customerId: number,
    organizationId: number,
  ): Promise<CustomerAiNote | null> {
    return this.prisma.customerAiNote.findUnique({
      where: { customerId },
    });
  }

  private parseInsights(raw: string): Partial<CustomerAiNote> | null {
    try {
      const cleaned = raw
        .replace(/^```json\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();
      const json = JSON.parse(cleaned);

      const validSensitivity = ['LOW', 'MEDIUM', 'HIGH'];
      const sensitivity: PriceSensitivity = validSensitivity.includes(
        json.priceSensitivity,
      )
        ? json.priceSensitivity
        : PriceSensitivity.MEDIUM;

      const validTags = [
        'VIP',
        'High Intent',
        'Frequent Buyer',
        'Price Sensitive',
        'New Customer',
        'At Risk',
        'Loyal Customer',
      ];

      return {
        purchaseHistory: json.purchaseHistory || [],
        productInterests: json.productInterests || [],
        favoriteCategories: json.favoriteCategories || [],
        frequentQuestions: json.frequentQuestions || [],
        priceSensitivity: sensitivity,
        buyingBehavior: json.buyingBehavior || {},
        aiSummary: typeof json.aiSummary === 'string' ? json.aiSummary : null,
        salesOpportunities: json.salesOpportunities || [],
        aiTags: Array.isArray(json.aiTags)
          ? json.aiTags.filter((t: string) => validTags.includes(t))
          : [],
      };
    } catch {
      return null;
    }
  }

  private buildProductNotification(
    product: Product,
    lang: string,
    baseUrl: string,
  ): string {
    if (lang === 'ru') {
      return `🆕 <b>Новый товар!</b>\n\n<b>${product.name}</b>\n💰 ${product.price} ${product.currency}\n\nЭтот товар может вас заинтересовать! Напишите нам, чтобы узнать больше.`;
    }
    if (lang === 'en') {
      return `🆕 <b>New Product!</b>\n\n<b>${product.name}</b>\n💰 ${product.price} ${product.currency}\n\nThis product might interest you! Message us to learn more.`;
    }
    return `🆕 <b>Yangi mahsulot!</b>\n\n<b>${product.name}</b>\n💰 ${product.price} ${product.currency}\n\nBu mahsulot sizni qiziqtirishi mumkin! Ko'proq ma'lumot olish uchun bizga yozing.`;
  }

  private buildFollowUpMessage(productNames: string, lang: string): string {
    if (lang === 'ru') {
      return `Привет! 👋 Надеемся, что вы довольны покупкой <b>${productNames}</b>. Можете ли вы оставить отзыв? Ваше мнение очень важно для нас! ⭐`;
    }
    if (lang === 'en') {
      return `Hey! 👋 We hope you're enjoying your <b>${productNames}</b>. Could you leave us a review? Your feedback means a lot to us! ⭐`;
    }
    return `Salom! 👋 <b>${productNames}</b> xaridingizdan mamnunmisiz? Fikringizni bildirsangiz, juda minnatdor bo'lar edik! ⭐`;
  }
}
