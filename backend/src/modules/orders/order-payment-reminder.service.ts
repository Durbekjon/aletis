import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '@core/prisma/prisma.service';
import { TelegramService } from '@modules/telegram/telegram.service';
import { InstagramService } from '@modules/instagram/instagram.service';
import { EncryptionService } from '@core/encryption/encryption.service';
import { PaymentsService } from '@modules/payments/payments.service';
import {
  CustomerChannel,
  OrderStatus,
  PaymentProvider,
  PaymentStatus,
} from '@prisma/client';
import { ORDER_PAYMENT_REMINDER_QUEUE } from '@core/queue/queue.module';

export type OrderPaymentReminderJobData = {
  orderId: number;
  step: number;
};

/**
 * Nudges a customer to pay for an unconfirmed order instead of a human
 * calling them. Mirrors the win-back step sequence in retention.service.ts:
 * a chain of delayed BullMQ jobs that re-reads the order on each step and
 * self-terminates once it's paid — the last step auto-cancels if it never was.
 */
@Injectable()
export class OrderPaymentReminderService {
  private readonly logger = new Logger(OrderPaymentReminderService.name);

  /** Delay before each step fires, relative to when it's scheduled. */
  private readonly stepDelaysMs = [30 * 60_000, 3 * 60 * 60_000, 24 * 60 * 60_000];
  private get maxSteps(): number {
    return this.stepDelaysMs.length;
  }

  constructor(
    @InjectQueue(ORDER_PAYMENT_REMINDER_QUEUE) private readonly queue: Queue,
    private readonly prisma: PrismaService,
    private readonly telegramService: TelegramService,
    private readonly instagramService: InstagramService,
    private readonly encryptionService: EncryptionService,
    private readonly paymentsService: PaymentsService,
  ) {}

  /** Called right after an order is created with a payment link attached. */
  async scheduleFirstReminder(orderId: number): Promise<void> {
    await this.scheduleStep(orderId, 1, this.stepDelaysMs[0]);
  }

  private async scheduleStep(
    orderId: number,
    step: number,
    delayMs: number,
  ): Promise<void> {
    await this.queue.add(
      'payment-reminder',
      { orderId, step } as OrderPaymentReminderJobData,
      {
        jobId: `order-payment-reminder-${orderId}-step-${step}`,
        delay: delayMs,
        attempts: 2,
        backoff: { type: 'fixed', delay: 60_000 },
        removeOnComplete: true,
        removeOnFail: { count: 5 },
      },
    );
  }

  /**
   * Run one step: still unpaid → send a reminder and queue the next step;
   * final step still unpaid → auto-cancel the order. Already paid, or the
   * merchant already moved the order along manually → no-op.
   */
  async runReminderStep(orderId: number, step: number): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: { include: { bot: true } } },
    });
    if (!order || !order.customer) return;
    if (
      order.paymentStatus === PaymentStatus.PAID ||
      order.status !== OrderStatus.NEW
    ) {
      return;
    }

    const customer = order.customer;
    const isFinalStep = step >= this.maxSteps;

    if (isFinalStep) {
      await this.prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.CANCELLED },
      });
      this.logger.log(
        `Order #${orderId} auto-cancelled — still unpaid after ${step} reminder(s)`,
      );
      await this.sendToCustomer(
        customer.channel,
        order.organizationId,
        customer,
        this.cancelMessage(customer.lang),
      ).catch((err) =>
        this.logger.warn(
          `Failed to send cancellation notice for order ${orderId}: ${err.message}`,
        ),
      );
      return;
    }

    let paymentLine = '';
    try {
      const { url } = await this.paymentsService.createOrderPaymentLink(
        orderId,
        PaymentProvider.PAYME,
      );
      paymentLine = `\n${url}`;
    } catch (err: any) {
      this.logger.warn(
        `Failed to rebuild payment link for order ${orderId}: ${err.message}`,
      );
    }

    try {
      await this.sendToCustomer(
        customer.channel,
        order.organizationId,
        customer,
        this.reminderMessage(customer.lang) + paymentLine,
      );
      this.logger.log(
        `Order #${orderId} payment reminder step ${step}/${this.maxSteps} sent to customer ${customer.id}`,
      );
    } catch (err: any) {
      this.logger.warn(
        `Failed to send payment reminder for order ${orderId}: ${err.message}`,
      );
    }

    const nextStep = step + 1;
    await this.scheduleStep(orderId, nextStep, this.stepDelaysMs[nextStep - 1]);
  }

  private reminderMessage(lang: string | null): string {
    if (lang === 'ru') {
      return 'Напоминаем: ваш заказ ещё не подтверждён. Оплатите по ссылке ниже, чтобы мы начали его собирать:';
    }
    if (lang === 'en') {
      return "Reminder: your order isn't confirmed yet. Pay via the link below so we can start preparing it:";
    }
    return "Eslatma: buyurtmangiz hali tasdiqlanmagan. Uni tayyorlashni boshlashimiz uchun quyidagi havola orqali to'lovni amalga oshiring:";
  }

  private cancelMessage(lang: string | null): string {
    if (lang === 'ru') {
      return 'Заказ отменён — оплата не поступила вовремя. Если вы всё ещё хотите оформить заказ, просто напишите нам ещё раз.';
    }
    if (lang === 'en') {
      return "Your order was cancelled — payment wasn't received in time. If you'd still like to order, just message us again.";
    }
    return "Buyurtma bekor qilindi — to'lov o'z vaqtida amalga oshirilmadi. Agar hali ham buyurtma bermoqchi bo'lsangiz, bizga qayta yozing.";
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
}
