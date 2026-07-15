import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { PaymentProvider, PaymentTxState } from '@prisma/client';
import { PaymentsService } from '../payments.service';

/** Click Shop API error codes. */
const ClickError = {
  SUCCESS: 0,
  SIGN_FAILED: -1,
  INVALID_AMOUNT: -2,
  ACTION_NOT_FOUND: -3,
  ALREADY_PAID: -4,
  ORDER_NOT_FOUND: -5,
  TRANSACTION_NOT_FOUND: -6,
  TRANSACTION_CANCELLED: -9,
} as const;

const ClickAction = { PREPARE: '0', COMPLETE: '1' } as const;

/**
 * Click Shop API handler (Prepare + Complete).
 * https://docs.click.uz/en/click-api-request/
 *
 * Configure in the Click merchant cabinet:
 *   Prepare URL:  https://api.aletis.me/api/v1/payments/click/prepare
 *   Complete URL: https://api.aletis.me/api/v1/payments/click/complete
 */
@Injectable()
export class ClickProvider {
  private readonly logger = new Logger(ClickProvider.name);

  constructor(
    private readonly payments: PaymentsService,
    private readonly config: ConfigService,
  ) {}

  private get secretKey(): string {
    return this.config.get<string>('CLICK_SECRET_KEY') || '';
  }

  /**
   * Verify Click's MD5 signature. Prepare and Complete sign different field
   * sets (Complete additionally includes merchant_prepare_id).
   */
  private verifySign(p: any, includePrepareId: boolean): boolean {
    if (!this.secretKey) {
      this.logger.warn('CLICK_SECRET_KEY not set — rejecting Click callback');
      return false;
    }
    const parts = [
      p.click_trans_id,
      p.service_id,
      this.secretKey,
      p.merchant_trans_id,
      ...(includePrepareId ? [p.merchant_prepare_id] : []),
      p.amount,
      p.action,
      p.sign_time,
    ];
    const expected = createHash('md5').update(parts.join('')).digest('hex');
    return expected === p.sign_string;
  }

  private reply(p: any, error: number, extra: Record<string, any> = {}) {
    return {
      click_trans_id: p.click_trans_id,
      merchant_trans_id: p.merchant_trans_id,
      error,
      error_note: error === ClickError.SUCCESS ? 'Success' : this.note(error),
      ...extra,
    };
  }

  private note(code: number): string {
    switch (code) {
      case ClickError.SIGN_FAILED:
        return 'SIGN CHECK FAILED';
      case ClickError.INVALID_AMOUNT:
        return 'Incorrect amount';
      case ClickError.ACTION_NOT_FOUND:
        return 'Action not found';
      case ClickError.ALREADY_PAID:
        return 'Already paid';
      case ClickError.ORDER_NOT_FOUND:
        return 'Order not found';
      case ClickError.TRANSACTION_NOT_FOUND:
        return 'Transaction not found';
      case ClickError.TRANSACTION_CANCELLED:
        return 'Transaction cancelled';
      default:
        return 'Error';
    }
  }

  /** Prepare (action=0): validate + open a PENDING transaction. */
  async prepare(p: any) {
    if (!this.verifySign(p, false)) return this.reply(p, ClickError.SIGN_FAILED);
    if (p.action !== ClickAction.PREPARE)
      return this.reply(p, ClickError.ACTION_NOT_FOUND);

    const target = await this.payments.resolveByClickRef(p.merchant_trans_id);
    if (!target) return this.reply(p, ClickError.ORDER_NOT_FOUND);
    if (target.alreadyPaid) return this.reply(p, ClickError.ALREADY_PAID);
    if (Number(p.amount) !== target.amount)
      return this.reply(p, ClickError.INVALID_AMOUNT);

    const open = await this.payments.findOpenForTarget(
      target,
      PaymentProvider.CLICK,
    );
    const tx = await this.payments.openPending({
      provider: PaymentProvider.CLICK,
      providerTxId: String(p.click_trans_id),
      target,
      existingId: open?.id,
    });

    return this.reply(p, ClickError.SUCCESS, {
      merchant_prepare_id: tx.id,
    });
  }

  /** Complete (action=1): confirm or cancel the prepared transaction. */
  async complete(p: any) {
    if (!this.verifySign(p, true)) return this.reply(p, ClickError.SIGN_FAILED);
    if (p.action !== ClickAction.COMPLETE)
      return this.reply(p, ClickError.ACTION_NOT_FOUND);

    const tx = await this.payments.findByProviderTxId(
      PaymentProvider.CLICK,
      String(p.click_trans_id),
    );
    if (!tx) return this.reply(p, ClickError.TRANSACTION_NOT_FOUND);

    // Click signals a failed/cancelled payment with a negative error field.
    if (Number(p.error) < 0) {
      if (tx.state !== PaymentTxState.CANCELLED) {
        await this.payments.markCancelled(tx, Number(p.error));
      }
      return this.reply(p, ClickError.TRANSACTION_CANCELLED, {
        merchant_confirm_id: tx.id,
      });
    }

    if (tx.state === PaymentTxState.PAID) {
      return this.reply(p, ClickError.SUCCESS, { merchant_confirm_id: tx.id });
    }
    if (tx.state !== PaymentTxState.PENDING) {
      return this.reply(p, ClickError.TRANSACTION_CANCELLED, {
        merchant_confirm_id: tx.id,
      });
    }

    await this.payments.markPaid(tx);
    return this.reply(p, ClickError.SUCCESS, { merchant_confirm_id: tx.id });
  }
}
