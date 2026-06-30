import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Request } from 'express';
import { InstagramService } from './instagram.service';
import { RetentionService } from '@modules/retention/retention.service';

/**
 * Meta webhook for Instagram DMs.
 * Configure this URL in the Meta App dashboard:
 *   GET/POST  https://<your-domain>/api/v1/webhook/instagram
 * with the verify token = META_VERIFY_TOKEN.
 */
@ApiExcludeController()
@Controller({ path: 'webhook/instagram', version: '1' })
export class InstagramWebhookController {
  constructor(
    private readonly instagramService: InstagramService,
    private readonly retentionService: RetentionService,
  ) {}

  /** Verification handshake. */
  @Get()
  verify(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ): string {
    const result = this.instagramService.verifyChallenge(mode, token, challenge);
    return result ?? 'forbidden';
  }

  /** Inbound events (DMs). Always 200 quickly so Meta doesn't retry. */
  @Post()
  @HttpCode(200)
  async receive(
    @Body() payload: any,
    @Headers('x-hub-signature-256') signature: string,
    @Req() req: Request & { rawBody?: Buffer },
  ): Promise<string> {
    if (!this.instagramService.verifySignature(req.rawBody, signature)) {
      return 'invalid signature';
    }

    const messages = this.instagramService.parseInbound(payload);
    for (const msg of messages) {
      try {
        const resolved = await this.instagramService.persistInbound(msg);
        if (!resolved) continue;
        // Retention: a reply closes the loop on a recent win-back.
        await this.retentionService.markResponseIfPending(resolved.customerId);
        // TODO: hook the existing AI sales pipeline here to auto-reply on IG.
      } catch (err: any) {
        // Never throw — Meta retries aggressively on non-200.
        console.error(`Instagram inbound handling failed: ${err.message}`);
      }
    }
    return 'EVENT_RECEIVED';
  }
}
