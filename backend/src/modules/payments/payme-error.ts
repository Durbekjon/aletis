/**
 * Payme Merchant API (JSON-RPC 2.0) error codes.
 * See https://developer.help.paycom.uz/protokol-merchant-api/
 */
export const PaymeErrorCode = {
  INVALID_AMOUNT: -31001,
  ORDER_NOT_FOUND: -31050, // -31050..-31099 are reserved for account/order errors
  ORDER_UNAVAILABLE: -31051,
  CANT_PERFORM: -31008,
  TRANSACTION_NOT_FOUND: -31003,
  CANT_CANCEL: -31007,
  INVALID_AUTH: -32504,
  METHOD_NOT_FOUND: -32601,
  INVALID_JSON_RPC: -32600,
} as const;

/**
 * Thrown inside Payme method handlers to produce a JSON-RPC error response.
 * `data` is echoed back to Payme (typically the offending account field).
 */
export class PaymeError extends Error {
  constructor(
    readonly code: number,
    message: string | { uz?: string; ru?: string; en?: string },
    readonly data?: string,
  ) {
    super(typeof message === 'string' ? message : message.en || 'Payme error');
    this.localized =
      typeof message === 'string'
        ? { uz: message, ru: message, en: message }
        : {
            uz: message.uz || message.en || '',
            ru: message.ru || message.en || '',
            en: message.en || message.ru || '',
          };
  }

  readonly localized: { uz: string; ru: string; en: string };

  toJsonRpc(id: unknown) {
    return {
      jsonrpc: '2.0',
      id: id ?? null,
      error: {
        code: this.code,
        message: this.localized,
        data: this.data,
      },
    };
  }
}
