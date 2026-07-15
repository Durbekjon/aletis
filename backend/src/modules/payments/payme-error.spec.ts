import { PaymeError, PaymeErrorCode } from './payme-error';

describe('PaymeError', () => {
  it('wraps a localized message object into a JSON-RPC error envelope', () => {
    const err = new PaymeError(
      PaymeErrorCode.INVALID_AMOUNT,
      { uz: 'Xato', ru: 'Ошибка', en: 'Error' },
      'amount',
    );
    const rpc = err.toJsonRpc(42);
    expect(rpc).toEqual({
      jsonrpc: '2.0',
      id: 42,
      error: {
        code: PaymeErrorCode.INVALID_AMOUNT,
        message: { uz: 'Xato', ru: 'Ошибка', en: 'Error' },
        data: 'amount',
      },
    });
  });

  it('accepts a plain string message and mirrors it across locales', () => {
    const err = new PaymeError(PaymeErrorCode.INVALID_AUTH, 'Unauthorized');
    const rpc = err.toJsonRpc(null);
    expect(rpc.error.message).toEqual({
      uz: 'Unauthorized',
      ru: 'Unauthorized',
      en: 'Unauthorized',
    });
    expect(rpc.id).toBeNull();
  });

  it('defaults a missing id to null', () => {
    const err = new PaymeError(PaymeErrorCode.TRANSACTION_NOT_FOUND, 'x');
    expect(err.toJsonRpc(undefined).id).toBeNull();
  });
});
