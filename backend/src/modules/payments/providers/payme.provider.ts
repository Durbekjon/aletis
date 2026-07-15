import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentProvider, PaymentTxState } from '@prisma/client';
import { PaymentsService, PaymentTarget } from '../payments.service';
import { PaymeError, PaymeErrorCode } from '../payme-error';

/** Payme numeric transaction states. */
const PaymeState = {
  PENDING: 1,
  PERFORMED: 2,
  CANCELLED_PENDING: -1,
  CANCELLED_PERFORMED: -2,
} as const;

/**
 * Payme Merchant API (JSON-RPC 2.0) handler.
 * https://developer.help.paycom.uz/protokol-merchant-api/
 *
 * Configure in the Payme merchant cabinet:
 *   Endpoint: https://api.aletis.me/api/v1/payments/payme
 *   Account field: order_id (customer orders) — a second cashbox can use invoice_id.
 */
@Injectable()
export class PaymeProvider {
  private readonly logger = new Logger(PaymeProvider.name);

  constructor(
    private readonly payments: PaymentsService,
    private readonly config: ConfigService,
  ) {}

  /** Verify the Basic auth header Payme sends: base64("Paycom:" + MERCHANT_KEY). */
  isAuthorized(authHeader?: string): boolean {
    const key = this.config.get<string>('PAYME_KEY');
    if (!key) {
      this.logger.warn('PAYME_KEY not set — rejecting Payme callback');
      return false;
    }
    if (!authHeader?.startsWith('Basic ')) return false;
    const decoded = Buffer.from(authHeader.slice(6), 'base64').toString('utf8');
    const [, token] = decoded.split(':');
    return token === key;
  }

  /** Dispatch a JSON-RPC request. Throws PaymeError on protocol failures. */
  async handle(method: string, params: any): Promise<any> {
    switch (method) {
      case 'CheckPerformTransaction':
        return this.checkPerform(params);
      case 'CreateTransaction':
        return this.createTransaction(params);
      case 'PerformTransaction':
        return this.performTransaction(params);
      case 'CancelTransaction':
        return this.cancelTransaction(params);
      case 'CheckTransaction':
        return this.checkTransaction(params);
      case 'GetStatement':
        return this.getStatement(params);
      default:
        throw new PaymeError(
          PaymeErrorCode.METHOD_NOT_FOUND,
          `Method not found: ${method}`,
        );
    }
  }

  private async requireTarget(account: any): Promise<PaymentTarget> {
    const target = await this.payments.resolveByAccount(account);
    if (!target) {
      throw new PaymeError(
        PaymeErrorCode.ORDER_NOT_FOUND,
        { uz: 'Buyurtma topilmadi', ru: 'Заказ не найден', en: 'Order not found' },
        account?.order_id ? 'order_id' : 'invoice_id',
      );
    }
    return target;
  }

  private assertAmount(target: PaymentTarget, amount: number): void {
    if (this.payments.toTiyin(target.amount) !== amount) {
      throw new PaymeError(PaymeErrorCode.INVALID_AMOUNT, {
        uz: "Noto'g'ri summa",
        ru: 'Неверная сумма',
        en: 'Invalid amount',
      });
    }
  }

  private async checkPerform(params: any) {
    const target = await this.requireTarget(params.account);
    if (target.alreadyPaid) {
      throw new PaymeError(PaymeErrorCode.ORDER_UNAVAILABLE, {
        uz: "Buyurtma allaqachon to'langan",
        ru: 'Заказ уже оплачен',
        en: 'Order already paid',
      });
    }
    this.assertAmount(target, params.amount);
    return { allow: true };
  }

  private async createTransaction(params: any) {
    const existing = await this.payments.findByProviderTxId(
      PaymentProvider.PAYME,
      params.id,
    );
    if (existing) {
      if (existing.state !== PaymentTxState.PENDING) {
        throw new PaymeError(PaymeErrorCode.CANT_PERFORM, {
          uz: 'Tranzaksiya holati mos emas',
          ru: 'Неверное состояние транзакции',
          en: 'Transaction in a non-creatable state',
        });
      }
      return {
        create_time: Number(existing.createTime ?? params.time),
        transaction: String(existing.id),
        state: PaymeState.PENDING,
      };
    }

    const target = await this.requireTarget(params.account);
    this.assertAmount(target, params.amount);

    // Payme allows only one active transaction per account.
    const open = await this.payments.findOpenForTarget(
      target,
      PaymentProvider.PAYME,
    );
    if (open && open.providerTxId && open.providerTxId !== params.id) {
      throw new PaymeError(PaymeErrorCode.ORDER_UNAVAILABLE, {
        uz: 'Buyurtma uchun boshqa tranzaksiya mavjud',
        ru: 'По заказу уже есть другая транзакция',
        en: 'Another transaction is in progress for this order',
      });
    }

    const tx = await this.payments.openPending({
      provider: PaymentProvider.PAYME,
      providerTxId: params.id,
      target,
      createTime: params.time,
      providerState: PaymeState.PENDING,
      existingId: open?.id, // reuse the CREATED row from link generation, if any
    });

    return {
      create_time: params.time,
      transaction: String(tx.id),
      state: PaymeState.PENDING,
    };
  }

  private async performTransaction(params: any) {
    const tx = await this.mustFind(params.id);
    if (tx.state === PaymentTxState.PAID) {
      return {
        perform_time: Number(tx.performTime ?? 0),
        transaction: String(tx.id),
        state: PaymeState.PERFORMED,
      };
    }
    if (tx.state !== PaymentTxState.PENDING) {
      throw new PaymeError(PaymeErrorCode.CANT_PERFORM, {
        uz: 'Tranzaksiyani amalga oshirib bo\'lmaydi',
        ru: 'Невозможно выполнить транзакцию',
        en: 'Cannot perform transaction',
      });
    }
    const performTime = Date.now();
    await this.payments.markPaid(tx, performTime, PaymeState.PERFORMED);
    return {
      perform_time: performTime,
      transaction: String(tx.id),
      state: PaymeState.PERFORMED,
    };
  }

  private async cancelTransaction(params: any) {
    const tx = await this.mustFind(params.id);
    const wasPerformed = tx.state === PaymentTxState.PAID;
    const providerState = wasPerformed
      ? PaymeState.CANCELLED_PERFORMED
      : PaymeState.CANCELLED_PENDING;

    if (tx.state !== PaymentTxState.CANCELLED) {
      await this.payments.markCancelled(
        tx,
        params.reason,
        Date.now(),
        providerState,
      );
    }
    const fresh = await this.payments.findByProviderTxId(
      PaymentProvider.PAYME,
      params.id,
    );
    return {
      cancel_time: Number(fresh?.cancelTime ?? Date.now()),
      transaction: String(tx.id),
      state: fresh?.providerState ?? providerState,
    };
  }

  private async checkTransaction(params: any) {
    const tx = await this.mustFind(params.id);
    return {
      create_time: Number(tx.createTime ?? 0),
      perform_time: Number(tx.performTime ?? 0),
      cancel_time: Number(tx.cancelTime ?? 0),
      transaction: String(tx.id),
      state: tx.providerState ?? PaymeState.PENDING,
      reason: tx.reason ?? null,
    };
  }

  private async getStatement(params: any) {
    const txs = await this.payments.listByCreateTime(
      PaymentProvider.PAYME,
      params.from,
      params.to,
    );
    return {
      transactions: txs.map((tx) => ({
        id: tx.providerTxId,
        time: Number(tx.createTime ?? 0),
        amount: this.payments.toTiyin(tx.amount),
        account:
          tx.targetType === 'ORDER'
            ? { order_id: String(tx.orderId) }
            : { invoice_id: String(tx.invoiceId) },
        create_time: Number(tx.createTime ?? 0),
        perform_time: Number(tx.performTime ?? 0),
        cancel_time: Number(tx.cancelTime ?? 0),
        transaction: String(tx.id),
        state: tx.providerState ?? PaymeState.PENDING,
        reason: tx.reason ?? null,
      })),
    };
  }

  private async mustFind(providerTxId: string) {
    const tx = await this.payments.findByProviderTxId(
      PaymentProvider.PAYME,
      providerTxId,
    );
    if (!tx) {
      throw new PaymeError(PaymeErrorCode.TRANSACTION_NOT_FOUND, {
        uz: 'Tranzaksiya topilmadi',
        ru: 'Транзакция не найдена',
        en: 'Transaction not found',
      });
    }
    return tx;
  }
}
