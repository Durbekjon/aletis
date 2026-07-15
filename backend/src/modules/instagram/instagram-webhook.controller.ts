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
import { WebhookService } from '@modules/webhook/webhook.service';
import type { ProcessedAiResponse } from '@modules/webhook/ai-response-handler.service';

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
    private readonly webhookService: WebhookService,
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
        // Run the same AI sales pipeline Telegram uses and reply over Instagram.
        await this.replyWithAi(resolved.customerId, resolved.organizationId, resolved.text, msg.senderId);
      } catch (err: any) {
        // Never throw — Meta retries aggressively on non-200.
        console.error(`Instagram inbound handling failed: ${err.message}`);
      }
    }
    return 'EVENT_RECEIVED';
  }

  /** Generate an AI reply and deliver it as an Instagram DM. */
  private async replyWithAi(
    customerId: number,
    organizationId: number,
    text: string,
    igsid: string,
  ): Promise<void> {
    const processed = await this.webhookService.generateReplyForCustomer(
      customerId,
      organizationId,
      text,
    );
    if (!processed) return;

    const reply = this.toPlainText(processed);
    if (!reply) return;

    await this.instagramService.sendMessage(organizationId, igsid, reply);
    await this.instagramService.saveOutbound(organizationId, customerId, reply);
  }

  /**
   * Flatten a processed AI response into plain text for an Instagram DM.
   * Instagram DMs don't support HTML/Markdown, so strip tags and prefer
   * product-card captions when the AI returned a product search.
   */
  private toPlainText(p: ProcessedAiResponse): string {
    const raw =
      p.productCards && p.productCards.length > 0
        ? p.productCards.map((c) => c.caption).join('\n\n')
        : p.text || '';
    return raw
      .replace(/<[^>]+>/g, '') // strip HTML tags
      .replace(/\*\*(.*?)\*\*/g, '$1') // strip bold markdown
      .replace(/__(.*?)__/g, '$1')
      .trim();
  }
}
