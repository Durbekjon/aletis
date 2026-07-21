import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@core/prisma/prisma.service';
import {
  InvoiceStatus,
  OrderStatus,
  PaymentProvider,
  PaymentStatus,
  PaymentTargetType,
  PaymentTransaction,
  PaymentTxState,
  SubscriptionStatus,
} from '@prisma/client';

/** Normalised view of whatever a payment settles (order or invoice). */
export interface PaymentTarget {
  type: PaymentTargetType;
  id: number;
  organizationId: number;
  amount: number; // major currency units (e.g. UZS)
  currency: string;
  alreadyPaid: boolean;
}

/**
 * Provider-agnostic payment core. Owns the PaymentTransaction ledger and the
 * settlement of the underlying order/invoice. The Payme/Click providers call
 * into this; they own only protocol shaping and signature verification.
 *
 * SCAFFOLD: activates once the provider env vars are set (see .env.example).
 * Amounts assume UZS; wire real FX/pricing before charging non-UZS targets.
 */
@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  // ---------------------------------------------------------------------------
  // Target resolution
  // ---------------------------------------------------------------------------

  async resolveOrderTarget(orderId: number): Promise<PaymentTarget | null> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        organizationId: true,
        totalPrice: true,
        currency: true,
        paymentStatus: true,
      },
    });
    if (!order) return null;
    return {
      type: PaymentTargetType.ORDER,
      id: order.id,
      organizationId: order.organizationId,
      amount: order.totalPrice,
      currency: order.currency,
      alreadyPaid: order.paymentStatus === PaymentStatus.PAID,
    };
  }

  async resolveInvoiceTarget(invoiceId: number): Promise<PaymentTarget | null> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: {
        id: true,
        amountUsd: true,
        overageAmountUsd: true,
        status: true,
        subscription: { select: { organizationId: true } },
      },
    });
    if (!invoice) return null;
    return {
      type: PaymentTargetType.INVOICE,
      id: invoice.id,
      organizationId: invoice.subscription.organizationId,
      amount: invoice.amountUsd + invoice.overageAmountUsd,
      currency: 'UZS',
      alreadyPaid: invoice.status === InvoiceStatus.PAID,
    };
  }

  /** Resolve a Payme `account` object (order_id / invoice_id) to a target. */
  async resolveByAccount(
    account: Record<string, string> | undefined,
  ): Promise<PaymentTarget | null> {
    if (!account) return null;
    if (account.order_id) {
      const id = Number(account.order_id);
      return Number.isFinite(id) ? this.resolveOrderTarget(id) : null;
    }
    if (account.invoice_id) {
      const id = Number(account.invoice_id);
      return Number.isFinite(id) ? this.resolveInvoiceTarget(id) : null;
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // Payment link generation (customer-facing + billing)
  // ---------------------------------------------------------------------------

  async createOrderPaymentLink(
    orderId: number,
    provider: PaymentProvider,
  ): Promise<{ url: string; transactionId: number }> {
    const target = await this.resolveOrderTarget(orderId);
    if (!target) throw new NotFoundException(`Order #${orderId} not found`);
    return this.createPaymentLink(target, provider);
  }

  /** Dashboard entry point: generate an order payment link scoped to the caller's org. */
  async createOrderPaymentLinkForUser(
    userId: number,
    orderId: number,
    provider: PaymentProvider,
  ): Promise<{ url: string; transactionId: number }> {
    const orgId = await this.resolveOrgId(userId);
    const target = await this.resolveOrderTarget(orderId);
    if (!target) throw new NotFoundException(`Order #${orderId} not found`);
    if (target.organizationId !== orgId) {
      throw new ForbiddenException('Order belongs to another organization');
    }
    return this.createPaymentLink(target, provider);
  }

  private async resolveOrgId(userId: number): Promise<number> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { member: { include: { organization: true } } },
    });
    if (!user?.member?.organization?.id) {
      throw new Error('User not associated with any organization');
    }
    return user.member.organization.id;
  }

  async createInvoicePaymentLink(
    invoiceId: number,
    provider: PaymentProvider,
  ): Promise<{ url: string; transactionId: number }> {
    const target = await this.resolveInvoiceTarget(invoiceId);
    if (!target) throw new NotFoundException(`Invoice #${invoiceId} not found`);
    return this.createPaymentLink(target, provider);
  }

  private async createPaymentLink(
    target: PaymentTarget,
    provider: PaymentProvider,
  ): Promise<{ url: string; transactionId: number }> {
    const tx = await this.prisma.paymentTransaction.create({
      data: {
        provider,
        targetType: target.type,
        orderId: target.type === PaymentTargetType.ORDER ? target.id : null,
        invoiceId: target.type === PaymentTargetType.INVOICE ? target.id : null,
        organizationId: target.organizationId,
        amount: target.amount,
        currency: target.currency,
        state: PaymentTxState.CREATED,
      },
    });

    const url =
      provider === PaymentProvider.PAYME
        ? this.buildPaymeUrl(target)
        : this.buildClickUrl(target);

    return { url, transactionId: tx.id };
  }

  private buildPaymeUrl(target: PaymentTarget): string {
    const merchantId = this.config.get<string>('PAYME_MERCHANT_ID') || '';
    const checkout =
      this.config.get<string>('PAYME_CHECKOUT_URL') ||
      'https://checkout.paycom.uz';
    const accountKey =
      target.type === PaymentTargetType.ORDER ? 'order_id' : 'invoice_id';
    const params = [
      `m=${merchantId}`,
      `ac.${accountKey}=${target.id}`,
      `a=${this.toTiyin(target.amount)}`,
    ];
    const returnUrl = this.config.get<string>('PAYMENTS_RETURN_URL');
    if (returnUrl) params.push(`c=${returnUrl}`);
    const encoded = Buffer.from(params.join(';')).toString('base64');
    return `${checkout}/${encoded}`;
  }

  private buildClickUrl(target: PaymentTarget): string {
    const serviceId = this.config.get<string>('CLICK_SERVICE_ID') || '';
    const merchantId = this.config.get<string>('CLICK_MERCHANT_ID') || '';
    const checkout =
      this.config.get<string>('CLICK_CHECKOUT_URL') ||
      'https://my.click.uz/services/pay';
    const params = new URLSearchParams({
      service_id: serviceId,
      merchant_id: merchantId,
      amount: String(target.amount),
      // Prefix encodes the target type so the Click callback is unambiguous.
      transaction_param: this.clickRef(target),
    });
    const returnUrl = this.config.get<string>('PAYMENTS_RETURN_URL');
    if (returnUrl) params.set('return_url', returnUrl);
    return `${checkout}?${params.toString()}`;
  }

  /** Encode a target as a Click merchant_trans_id, e.g. "o42" / "i7". */
  private clickRef(target: PaymentTarget): string {
    return `${target.type === PaymentTargetType.ORDER ? 'o' : 'i'}${target.id}`;
  }

  /** Resolve a Click merchant_trans_id ("o42"/"i7", or a bare order id). */
  async resolveByClickRef(ref: string): Promise<PaymentTarget | null> {
    if (!ref) return null;
    const prefix = ref[0];
    const rest = ref.slice(1);
    if (prefix === 'o') {
      const id = Number(rest);
      return Number.isFinite(id) ? this.resolveOrderTarget(id) : null;
    }
    if (prefix === 'i') {
      const id = Number(rest);
      return Number.isFinite(id) ? this.resolveInvoiceTarget(id) : null;
    }
    // Backwards-compatible: a bare numeric id is treated as an order.
    const id = Number(ref);
    return Number.isFinite(id) ? this.resolveOrderTarget(id) : null;
  }

  // ---------------------------------------------------------------------------
  // Transaction ledger (used by providers)
  // ---------------------------------------------------------------------------

  findByProviderTxId(provider: PaymentProvider, providerTxId: string) {
    return this.prisma.paymentTransaction.findFirst({
      where: { provider, providerTxId },
    });
  }

  /** Transactions created in a Payme-style epoch-ms window (for GetStatement). */
  listByCreateTime(provider: PaymentProvider, from: number, to: number) {
    return this.prisma.paymentTransaction.findMany({
      where: {
        provider,
        createTime: { gte: BigInt(from), lte: BigInt(to) },
      },
    });
  }

  /** Find the latest open (CREATED/PENDING) transaction for a target. */
  findOpenForTarget(target: PaymentTarget, provider: PaymentProvider) {
    return this.prisma.paymentTransaction.findFirst({
      where: {
        provider,
        orderId: target.type === PaymentTargetType.ORDER ? target.id : undefined,
        invoiceId:
          target.type === PaymentTargetType.INVOICE ? target.id : undefined,
        state: { in: [PaymentTxState.CREATED, PaymentTxState.PENDING] },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async openPending(params: {
    provider: PaymentProvider;
    providerTxId: string;
    target: PaymentTarget;
    createTime?: number;
    providerState?: number;
    existingId?: number;
  }): Promise<PaymentTransaction> {
    const { provider, providerTxId, target, createTime, providerState, existingId } =
      params;
    const data = {
      provider,
      providerTxId,
      targetType: target.type,
      orderId: target.type === PaymentTargetType.ORDER ? target.id : null,
      invoiceId: target.type === PaymentTargetType.INVOICE ? target.id : null,
      organizationId: target.organizationId,
      amount: target.amount,
      currency: target.currency,
      state: PaymentTxState.PENDING,
      providerState: providerState ?? null,
      createTime: createTime ? BigInt(createTime) : null,
    };
    if (existingId) {
      return this.prisma.paymentTransaction.update({
        where: { id: existingId },
        data,
      });
    }
    return this.prisma.paymentTransaction.create({ data });
  }

  /** Mark a transaction paid and settle its underlying order/invoice. */
  async markPaid(
    tx: PaymentTransaction,
    performTime?: number,
    providerState?: number,
  ): Promise<PaymentTransaction> {
    const updated = await this.prisma.paymentTransaction.update({
      where: { id: tx.id },
      data: {
        state: PaymentTxState.PAID,
        performTime: performTime ? BigInt(performTime) : BigInt(Date.now()),
        providerState: providerState ?? tx.providerState,
      },
    });
    await this.settleTarget(updated);
    return updated;
  }

  async markCancelled(
    tx: PaymentTransaction,
    reason?: number,
    cancelTime?: number,
    providerState?: number,
  ): Promise<PaymentTransaction> {
    return this.prisma.paymentTransaction.update({
      where: { id: tx.id },
      data: {
        state: PaymentTxState.CANCELLED,
        cancelTime: cancelTime ? BigInt(cancelTime) : BigInt(Date.now()),
        reason: reason ?? null,
        providerState: providerState ?? tx.providerState,
      },
    });
  }

  private async settleTarget(tx: PaymentTransaction): Promise<void> {
    if (tx.targetType === PaymentTargetType.ORDER && tx.orderId) {
      await this.prisma.order.update({
        where: { id: tx.orderId },
        data: { paymentStatus: PaymentStatus.PAID },
      });
      // Only bump NEW/PENDING orders to CONFIRMED — don't downgrade an order
      // a merchant already moved further along (e.g. SHIPPED, CANCELLED).
      await this.prisma.order.updateMany({
        where: {
          id: tx.orderId,
          status: { in: [OrderStatus.NEW, OrderStatus.PENDING] },
        },
        data: { status: OrderStatus.CONFIRMED },
      });
      this.logger.log(
        `Order #${tx.orderId} marked PAID + CONFIRMED via ${tx.provider} (tx ${tx.providerTxId})`,
      );
    } else if (tx.targetType === PaymentTargetType.INVOICE && tx.invoiceId) {
      const invoice = await this.prisma.invoice.update({
        where: { id: tx.invoiceId },
        data: {
          status: InvoiceStatus.PAID,
          provider: tx.provider,
          providerTxId: tx.providerTxId,
          paidAt: new Date(),
        },
      });
      await this.prisma.subscription.update({
        where: { id: invoice.subscriptionId },
        data: { status: SubscriptionStatus.ACTIVE },
      });
      this.logger.log(
        `Invoice #${tx.invoiceId} marked PAID via ${tx.provider} (tx ${tx.providerTxId})`,
      );
    }
  }

  /** UZS major units → tiyin (Payme charges in tiyin). */
  toTiyin(amount: number): number {
    return Math.round(amount * 100);
  }

  /** Whether a provider has the minimum env config to generate links. */
  isConfigured(provider: PaymentProvider): boolean {
    if (provider === PaymentProvider.PAYME) {
      return !!this.config.get<string>('PAYME_MERCHANT_ID');
    }
    if (provider === PaymentProvider.CLICK) {
      return !!this.config.get<string>('CLICK_SERVICE_ID');
    }
    return false;
  }
}
