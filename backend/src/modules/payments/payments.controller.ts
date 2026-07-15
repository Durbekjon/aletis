import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExcludeEndpoint,
  ApiTags,
} from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { PaymentProvider } from '@prisma/client';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { CurrentUser } from '@auth/decorators/current-user.decorator';
import type { JwtPayload } from '@auth/strategies/jwt.strategy';
import { PaymentsService } from './payments.service';
import { PaymeProvider } from './providers/payme.provider';
import { ClickProvider } from './providers/click.provider';
import { PaymeError, PaymeErrorCode } from './payme-error';

@ApiTags('Payments')
@Controller({ path: 'payments', version: '1' })
export class PaymentsController {
  constructor(
    private readonly payments: PaymentsService,
    private readonly payme: PaymeProvider,
    private readonly click: ClickProvider,
  ) {}

  // ---------------------------------------------------------------------------
  // Dashboard: generate a payment link for an order (authenticated)
  // ---------------------------------------------------------------------------

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @Post('order/:orderId/link')
  createOrderLink(
    @CurrentUser() user: JwtPayload,
    @Param('orderId', ParseIntPipe) orderId: number,
    @Body() body: { provider: 'PAYME' | 'CLICK' },
  ) {
    const provider =
      body?.provider === 'CLICK'
        ? PaymentProvider.CLICK
        : PaymentProvider.PAYME;
    return this.payments.createOrderPaymentLinkForUser(
      Number(user.userId),
      orderId,
      provider,
    );
  }

  // ---------------------------------------------------------------------------
  // Payme Merchant API (JSON-RPC 2.0) — public callback
  // ---------------------------------------------------------------------------

  @ApiExcludeEndpoint()
  @SkipThrottle()
  @Post('payme')
  @HttpCode(200)
  async paymeCallback(
    @Headers('authorization') auth: string,
    @Body() body: any,
  ) {
    const id = body?.id ?? null;
    if (!this.payme.isAuthorized(auth)) {
      return new PaymeError(
        PaymeErrorCode.INVALID_AUTH,
        'Insufficient privileges',
      ).toJsonRpc(id);
    }
    try {
      const result = await this.payme.handle(body?.method, body?.params);
      return { jsonrpc: '2.0', id, result };
    } catch (err) {
      if (err instanceof PaymeError) return err.toJsonRpc(id);
      // Unexpected failures shouldn't leak internals to Payme.
      return new PaymeError(
        PaymeErrorCode.CANT_PERFORM,
        'Internal error',
      ).toJsonRpc(id);
    }
  }

  // ---------------------------------------------------------------------------
  // Click Shop API — public callbacks (Prepare + Complete)
  // ---------------------------------------------------------------------------

  @ApiExcludeEndpoint()
  @SkipThrottle()
  @Post('click/prepare')
  @HttpCode(200)
  clickPrepare(@Body() body: any) {
    return this.click.prepare(body);
  }

  @ApiExcludeEndpoint()
  @SkipThrottle()
  @Post('click/complete')
  @HttpCode(200)
  clickComplete(@Body() body: any) {
    return this.click.complete(body);
  }
}
