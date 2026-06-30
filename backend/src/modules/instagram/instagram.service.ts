import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { PrismaService } from '@core/prisma/prisma.service';
import { EncryptionService } from '@core/encryption/encryption.service';
import { CustomerChannel } from '@prisma/client';

export type InboundIgMessage = {
  igBusinessId: string; // the IG business account that received the DM (entry.id)
  senderId: string; // IGSID of the customer
  text: string;
  timestamp?: number;
};

export type ResolvedInbound = {
  customerId: number;
  organizationId: number;
  text: string;
};

/**
 * Instagram Messaging via the Meta Graph API.
 *
 * SCAFFOLD — outbound send + webhook verification/parsing are fully wired;
 * they activate as soon as these env vars are set and an InstagramAccount row
 * exists (token in `accessTokenEncrypted`):
 *   META_APP_SECRET        — to verify webhook signatures
 *   META_VERIFY_TOKEN      — the token you enter in the Meta webhook setup
 *   GRAPH_API_VERSION      — optional, defaults to v21.0
 *
 * Inbound customers/messages currently piggyback on the org's bot record
 * (Customer.botId is required). Proper decoupling = make botId nullable.
 */
@Injectable()
export class InstagramService {
  private readonly logger = new Logger(InstagramService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly config: ConfigService,
  ) {}

  private get graphVersion(): string {
    return this.config.get<string>('GRAPH_API_VERSION') || 'v21.0';
  }

  /**
   * Instagram API *with Instagram Login* talks to graph.instagram.com using an
   * Instagram user access token (no Facebook Page required). Override with
   * IG_GRAPH_HOST=graph.facebook.com if you switch to the Page-token flow.
   */
  private get graphHost(): string {
    return this.config.get<string>('IG_GRAPH_HOST') || 'graph.instagram.com';
  }

  private get appSecret(): string | undefined {
    return this.config.get<string>('META_APP_SECRET');
  }

  private get verifyToken(): string | undefined {
    return this.config.get<string>('META_VERIFY_TOKEN');
  }

  /** GET webhook handshake — echo hub.challenge when the verify token matches. */
  verifyChallenge(mode?: string, token?: string, challenge?: string): string | null {
    if (mode === 'subscribe' && token && token === this.verifyToken) {
      this.logger.log('Instagram webhook verified');
      return challenge ?? '';
    }
    this.logger.warn('Instagram webhook verification failed');
    return null;
  }

  /**
   * Verify X-Hub-Signature-256. Returns true (with a warning) when no app
   * secret is configured yet, so the scaffold accepts events in dev. Requires
   * the raw request body — enable `rawBody: true` in main.ts to use it.
   */
  verifySignature(rawBody: Buffer | string | undefined, signature?: string): boolean {
    if (!this.appSecret) {
      this.logger.warn('META_APP_SECRET not set — skipping signature check (scaffold)');
      return true;
    }
    if (!rawBody || !signature) return false;
    const expected =
      'sha256=' +
      createHmac('sha256', this.appSecret)
        .update(typeof rawBody === 'string' ? Buffer.from(rawBody) : rawBody)
        .digest('hex');
    try {
      return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    } catch {
      return false;
    }
  }

  /** Extract inbound text messages from a Meta webhook payload. */
  parseInbound(payload: any): InboundIgMessage[] {
    const out: InboundIgMessage[] = [];
    const entries = Array.isArray(payload?.entry) ? payload.entry : [];
    for (const entry of entries) {
      const igBusinessId = String(entry?.id ?? '');
      const events = Array.isArray(entry?.messaging) ? entry.messaging : [];
      for (const ev of events) {
        const senderId = ev?.sender?.id ? String(ev.sender.id) : '';
        const text = ev?.message?.text;
        // Ignore echoes (messages we sent) and non-text events.
        if (!senderId || ev?.message?.is_echo || typeof text !== 'string') continue;
        out.push({ igBusinessId, senderId, text, timestamp: ev?.timestamp });
      }
    }
    return out;
  }

  /** Upsert the customer + store the inbound message; returns ids for follow-up. */
  async persistInbound(msg: InboundIgMessage): Promise<ResolvedInbound | null> {
    const account = await this.prisma.instagramAccount.findUnique({
      where: { instagramUserId: msg.igBusinessId },
      select: { organizationId: true },
    });
    if (!account) {
      this.logger.warn(
        `No InstagramAccount for IG business id ${msg.igBusinessId} — ignoring DM`,
      );
      return null;
    }
    const organizationId = account.organizationId;

    const bot = await this.prisma.bot.findFirst({
      where: { organizationId },
      orderBy: { isDefault: 'desc' },
      select: { id: true },
    });

    const telegramKey = `ig_${msg.senderId}`;
    let customer = await this.prisma.customer.findFirst({
      where: { organizationId, instagramId: msg.senderId, channel: CustomerChannel.INSTAGRAM },
      select: { id: true },
    });
    if (!customer) {
      if (!bot) {
        this.logger.warn(
          `Org ${organizationId} has no bot — cannot create Instagram customer record yet`,
        );
        return null;
      }
      customer = await this.prisma.customer.create({
        data: {
          telegramId: telegramKey,
          name: `Instagram user ${msg.senderId.slice(-4)}`,
          organizationId,
          botId: bot.id,
          channel: CustomerChannel.INSTAGRAM,
          instagramId: msg.senderId,
          lang: 'uz',
        },
        select: { id: true },
      });
    }

    if (bot) {
      await this.prisma.message.create({
        data: {
          sender: 'USER',
          content: msg.text,
          customerId: customer.id,
          botId: bot.id,
          isInquiry: true,
        },
      });
    }

    return { customerId: customer.id, organizationId, text: msg.text };
  }

  /**
   * Send a DM to an Instagram user via the Graph API.
   * Note: outside the 24h window Meta requires a message tag (e.g. HUMAN_AGENT)
   * — add `messaging_type`/`tag` here when sending late win-backs in production.
   */
  async sendMessage(organizationId: number, igsid: string, text: string): Promise<void> {
    const account = await this.prisma.instagramAccount.findFirst({
      where: { organizationId },
      select: { accessTokenEncrypted: true, instagramUserId: true },
    });
    if (!account) {
      throw new Error(`No InstagramAccount configured for org ${organizationId}`);
    }
    const token = this.encryption.decrypt(account.accessTokenEncrypted);

    const url = `https://${this.graphHost}/${this.graphVersion}/me/messages?access_token=${encodeURIComponent(token)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: igsid },
        message: { text },
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Instagram send failed (${res.status}): ${body}`);
    }
    this.logger.log(`Instagram DM sent to ${igsid} (org ${organizationId})`);
  }
}
