import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { PrismaService } from '@core/prisma/prisma.service';
import { EncryptionService } from '@core/encryption/encryption.service';
import { CustomerChannel, InstagramAccount, MemberRole, Organization, Prisma } from '@prisma/client';

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

  private get appId(): string | undefined {
    return this.config.get<string>('META_APP_ID');
  }

  private get verifyToken(): string | undefined {
    return this.config.get<string>('META_VERIFY_TOKEN');
  }

  private get baseUrl(): string {
    return (this.config.get<string>('BASE_URL') || '').replace(/\/$/, '');
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

  /** Persist a bot (outbound) message so it shows up in the conversation history. */
  async saveOutbound(
    organizationId: number,
    customerId: number,
    text: string,
  ): Promise<void> {
    const bot = await this.prisma.bot.findFirst({
      where: { organizationId },
      orderBy: { isDefault: 'desc' },
      select: { id: true },
    });
    if (!bot) return;
    await this.prisma.message.create({
      data: {
        sender: 'BOT',
        content: text,
        customerId,
        botId: bot.id,
      },
    });
  }

  // ==================== Account connect / disconnect (OAuth) ====================

  private get callbackUrl(): string {
    return `${this.baseUrl}/api/v1/instagram/callback`;
  }

  /** Sign a short-lived state token carrying the initiating org id across the OAuth redirect. */
  private signState(organizationId: number): string {
    const payload = Buffer.from(
      JSON.stringify({ organizationId, iat: Date.now() }),
    ).toString('base64url');
    const signature = createHmac('sha256', this.stateSecret)
      .update(payload)
      .digest('hex');
    return `${payload}.${signature}`;
  }

  /** Verify + decode a state token. Throws if tampered with or older than 10 minutes. */
  private verifyState(state: string): number {
    const [payload, signature] = (state || '').split('.');
    if (!payload || !signature) {
      throw new ForbiddenException('Invalid state');
    }
    const expected = createHmac('sha256', this.stateSecret)
      .update(payload)
      .digest('hex');
    const isValid =
      signature.length === expected.length &&
      timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    if (!isValid) {
      throw new ForbiddenException('Invalid state signature');
    }
    const { organizationId, iat } = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8'),
    );
    if (typeof organizationId !== 'number' || Date.now() - iat > 10 * 60 * 1000) {
      throw new ForbiddenException('State expired');
    }
    return organizationId;
  }

  private get stateSecret(): string {
    return this.config.get<string>('ENCRYPTION_KEY') || '';
  }

  /** Same org-resolution + admin check used by BotsService — the JWT only carries userId. */
  private async validateUser(userId: number): Promise<Organization> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { member: { include: { organization: true } } },
    });
    if (!user) throw new NotFoundException('User not found');
    if (!user.member) throw new NotFoundException('User is not a member');
    if (user.member.role !== MemberRole.ADMIN) {
      throw new ForbiddenException('User is not an admin');
    }
    if (!user.member.organization) {
      throw new NotFoundException('Organization not found');
    }
    return user.member.organization;
  }

  /** Build the Instagram consent-screen URL for the current user's organization. */
  async getConnectUrl(userId: number): Promise<{ url: string }> {
    const organization = await this.validateUser(userId);
    const params = new URLSearchParams({
      client_id: this.appId || '',
      redirect_uri: this.callbackUrl,
      response_type: 'code',
      scope: 'instagram_business_basic,instagram_business_manage_messages',
      state: this.signState(organization.id),
    });
    return { url: `https://www.instagram.com/oauth/authorize?${params.toString()}` };
  }

  /** Decode+verify the OAuth `state` param — used by the public callback controller. */
  resolveOrganizationFromState(state: string): number {
    return this.verifyState(state);
  }

  /**
   * Full OAuth code exchange: short-lived token -> long-lived token -> account
   * info -> subscribe to `messages` webhooks -> persist (replacing any prior
   * account for this org). This is the automated version of everything we did
   * by hand while debugging the webhook signature/subscription issues.
   */
  async connectAccount(
    organizationId: number,
    code: string,
  ): Promise<InstagramAccount> {
    const shortLived = await this.exchangeCodeForShortLivedToken(code);
    const longLived = await this.exchangeForLongLivedToken(shortLived.accessToken);
    const account = await this.fetchAccountInfo(longLived.accessToken);
    await this.subscribeWebhooks(account.id, longLived.accessToken);

    const accessTokenEncrypted = this.encryption.encrypt(longLived.accessToken);
    const tokenExpiresAt = new Date(Date.now() + longLived.expiresIn * 1000);

    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.instagramAccount.deleteMany({ where: { organizationId } });
        return tx.instagramAccount.create({
          data: {
            organizationId,
            instagramUserId: account.id,
            instagramUsername: account.username,
            accessTokenEncrypted,
            tokenExpiresAt,
          },
        });
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException(
          'This Instagram account is already connected to another workspace',
        );
      }
      throw err;
    }
  }

  async getAccountForOrg(userId: number): Promise<Pick<
    InstagramAccount,
    'id' | 'instagramUserId' | 'instagramUsername' | 'tokenExpiresAt' | 'createdAt'
  > | null> {
    const organization = await this.validateUser(userId);
    return this.prisma.instagramAccount.findFirst({
      where: { organizationId: organization.id },
      select: {
        id: true,
        instagramUserId: true,
        instagramUsername: true,
        tokenExpiresAt: true,
        createdAt: true,
      },
    });
  }

  async disconnectAccount(userId: number): Promise<void> {
    const organization = await this.validateUser(userId);
    const account = await this.prisma.instagramAccount.findFirst({
      where: { organizationId: organization.id },
    });
    if (!account) return;

    try {
      const token = this.encryption.decrypt(account.accessTokenEncrypted);
      await this.unsubscribeWebhooks(account.instagramUserId, token);
    } catch (err: any) {
      this.logger.warn(`Instagram unsubscribe on disconnect failed (ignoring): ${err.message}`);
    }

    await this.prisma.instagramAccount.delete({ where: { id: account.id } });
  }

  /** Proactively refresh long-lived tokens before their ~60-day expiry. Run daily by the scheduler. */
  async refreshExpiringTokens(): Promise<void> {
    const soon = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
    const accounts = await this.prisma.instagramAccount.findMany({
      where: { tokenExpiresAt: { lt: soon } },
    });
    for (const account of accounts) {
      try {
        const token = this.encryption.decrypt(account.accessTokenEncrypted);
        const refreshed = await this.refreshLongLivedToken(token);
        await this.prisma.instagramAccount.update({
          where: { id: account.id },
          data: {
            accessTokenEncrypted: this.encryption.encrypt(refreshed.accessToken),
            tokenExpiresAt: new Date(Date.now() + refreshed.expiresIn * 1000),
          },
        });
        this.logger.log(`Refreshed Instagram token for account ${account.instagramUserId}`);
      } catch (err: any) {
        this.logger.warn(
          `Failed to refresh Instagram token for account ${account.instagramUserId}: ${err.message}`,
        );
      }
    }
  }

  private async exchangeCodeForShortLivedToken(
    code: string,
  ): Promise<{ accessToken: string; igUserId: string }> {
    const body = new URLSearchParams({
      client_id: this.appId || '',
      client_secret: this.appSecret || '',
      grant_type: 'authorization_code',
      redirect_uri: this.callbackUrl,
      code,
    });
    const res = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(`Instagram code exchange failed: ${JSON.stringify(data)}`);
    }
    // Response shape varies by API version: either top-level or wrapped in `data[0]`.
    const entry = Array.isArray(data?.data) ? data.data[0] : data;
    if (!entry?.access_token) {
      throw new Error(`Instagram code exchange returned no access_token: ${JSON.stringify(data)}`);
    }
    return { accessToken: entry.access_token, igUserId: String(entry.user_id ?? '') };
  }

  private async exchangeForLongLivedToken(
    shortLivedToken: string,
  ): Promise<{ accessToken: string; expiresIn: number }> {
    const url = `https://${this.graphHost}/access_token?grant_type=ig_exchange_token&client_secret=${encodeURIComponent(this.appSecret || '')}&access_token=${encodeURIComponent(shortLivedToken)}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok || !data?.access_token) {
      throw new Error(`Instagram long-lived token exchange failed: ${JSON.stringify(data)}`);
    }
    return { accessToken: data.access_token, expiresIn: Number(data.expires_in) || 5184000 };
  }

  private async refreshLongLivedToken(
    longLivedToken: string,
  ): Promise<{ accessToken: string; expiresIn: number }> {
    const url = `https://${this.graphHost}/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(longLivedToken)}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok || !data?.access_token) {
      throw new Error(`Instagram token refresh failed: ${JSON.stringify(data)}`);
    }
    return { accessToken: data.access_token, expiresIn: Number(data.expires_in) || 5184000 };
  }

  /**
   * `/me` returns two distinct ids for the same account: `id` (the
   * Instagram-Login "app-scoped" id) and `user_id` (the classic Instagram
   * Business Account id). Inbound webhook payloads key `entry.id` on the
   * latter, so `user_id` — not `id` — is what we must store/match against.
   * (Confirmed live: a token minted for id=25396762430021275 only received
   * webhook events addressed to user_id=17841447722535800 for that same
   * account.) Both ids work interchangeably as Graph API path params.
   */
  private async fetchAccountInfo(
    accessToken: string,
  ): Promise<{ id: string; username: string }> {
    const url = `https://${this.graphHost}/${this.graphVersion}/me?fields=user_id,username&access_token=${encodeURIComponent(accessToken)}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok || !data?.user_id) {
      throw new Error(`Failed to fetch Instagram account info: ${JSON.stringify(data)}`);
    }
    return { id: String(data.user_id), username: data.username };
  }

  private async subscribeWebhooks(igUserId: string, accessToken: string): Promise<void> {
    const url = `https://${this.graphHost}/${this.graphVersion}/${igUserId}/subscribed_apps?subscribed_fields=messages&access_token=${encodeURIComponent(accessToken)}`;
    const res = await fetch(url, { method: 'POST' });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Failed to subscribe Instagram webhooks (${res.status}): ${body}`);
    }
    this.logger.log(`Subscribed Instagram account ${igUserId} to 'messages' webhooks`);
  }

  private async unsubscribeWebhooks(igUserId: string, accessToken: string): Promise<void> {
    const url = `https://${this.graphHost}/${this.graphVersion}/${igUserId}/subscribed_apps?access_token=${encodeURIComponent(accessToken)}`;
    const res = await fetch(url, { method: 'DELETE' });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Failed to unsubscribe Instagram webhooks (${res.status}): ${body}`);
    }
  }
}
