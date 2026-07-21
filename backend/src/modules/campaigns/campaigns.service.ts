import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '@core/prisma/prisma.service';
import { GeminiService } from '@core/gemini/gemini.service';
import { EncryptionService } from '@core/encryption/encryption.service';
import { TelegramService } from '@modules/telegram/telegram.service';
import { InstagramService } from '@modules/instagram/instagram.service';
import { RetentionService } from '@modules/retention/retention.service';
import { CAMPAIGN_QUEUE } from '@core/queue/queue.module';
import {
  CampaignSegment,
  CampaignStatus,
  CustomerChannel,
} from '@prisma/client';

/** Hard cap on recipients per campaign run (safety valve; logged if exceeded). */
const MAX_RECIPIENTS = 2000;

type Recipient = {
  id: number;
  name: string;
  lang: string | null;
  channel: CustomerChannel;
  telegramId: string;
  instagramId: string | null;
  bot: { token: string } | null;
};

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);

  constructor(
    @InjectQueue(CAMPAIGN_QUEUE) private readonly queue: Queue,
    private readonly prisma: PrismaService,
    private readonly gemini: GeminiService,
    private readonly encryption: EncryptionService,
    private readonly telegram: TelegramService,
    private readonly instagram: InstagramService,
    private readonly retention: RetentionService,
  ) {}

  async resolveOrgId(userId: number): Promise<number> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { member: { include: { organization: true } } },
    });
    if (!user?.member?.organization?.id) {
      throw new Error('User not associated with any organization');
    }
    return user.member.organization.id;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // CRUD + launch
  // ──────────────────────────────────────────────────────────────────────────

  async createCampaign(
    organizationId: number,
    dto: {
      name: string;
      segment: CampaignSegment;
      messageTemplate?: string;
      incentive?: string;
    },
  ) {
    const recipientIds = await this.resolveRecipientIds(
      organizationId,
      dto.segment,
    );
    return this.prisma.campaign.create({
      data: {
        organizationId,
        name: dto.name,
        segment: dto.segment,
        messageTemplate: dto.messageTemplate ?? null,
        incentive: dto.incentive ?? null,
        status: CampaignStatus.DRAFT,
        targeted: recipientIds.length,
      },
    });
  }

  listCampaigns(organizationId: number) {
    return this.prisma.campaign.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getCampaign(organizationId: number, id: number) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, organizationId },
    });
    if (!campaign) throw new NotFoundException(`Campaign #${id} not found`);
    return campaign;
  }

  /** Preview how many customers a segment currently resolves to. */
  async previewSegment(organizationId: number, segment: CampaignSegment) {
    const ids = await this.resolveRecipientIds(organizationId, segment);
    return { segment, count: ids.length };
  }

  async launch(organizationId: number, id: number) {
    const campaign = await this.getCampaign(organizationId, id);
    if (campaign.status === CampaignStatus.SENDING) {
      return campaign; // already running
    }
    const updated = await this.prisma.campaign.update({
      where: { id },
      data: { status: CampaignStatus.SENDING, startedAt: new Date() },
    });
    await this.queue.add(
      'run-campaign',
      { campaignId: id },
      {
        jobId: `campaign-${id}`,
        attempts: 1,
        removeOnComplete: true,
        removeOnFail: { count: 20 },
      },
    );
    this.logger.log(`Campaign #${id} launched (${campaign.targeted} targeted)`);
    return updated;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Execution (called by the processor)
  // ──────────────────────────────────────────────────────────────────────────

  async runCampaign(campaignId: number): Promise<void> {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { organization: { select: { name: true } } },
    });
    if (!campaign || campaign.status !== CampaignStatus.SENDING) return;

    const ids = await this.resolveRecipientIds(
      campaign.organizationId,
      campaign.segment,
    );
    if (ids.length > MAX_RECIPIENTS) {
      this.logger.warn(
        `Campaign #${campaignId}: ${ids.length} recipients exceeds cap ${MAX_RECIPIENTS} — sending to first ${MAX_RECIPIENTS}`,
      );
    }
    const recipients = await this.loadRecipients(ids.slice(0, MAX_RECIPIENTS));

    let sent = 0;
    let failed = 0;
    for (const r of recipients) {
      try {
        const text = campaign.messageTemplate
          ? campaign.messageTemplate.replace(/\{name\}/g, r.name || '')
          : await this.gemini.generateBroadcastMessage({
              campaignName: campaign.name,
              segment: campaign.segment,
              businessName: campaign.organization?.name,
              customerName: r.name,
              lang: r.lang,
              incentive: campaign.incentive,
            }, { organizationId: campaign.organizationId });
        await this.sendToRecipient(campaign.organizationId, r, text);
        sent++;
      } catch (err: any) {
        failed++;
        this.logger.warn(
          `Campaign #${campaignId}: send to customer ${r.id} failed: ${err.message}`,
        );
      }
    }

    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: CampaignStatus.SENT,
        sent,
        failed,
        completedAt: new Date(),
      },
    });
    this.logger.log(
      `Campaign #${campaignId} complete: ${sent} sent, ${failed} failed`,
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Segments
  // ──────────────────────────────────────────────────────────────────────────

  private async resolveRecipientIds(
    organizationId: number,
    segment: CampaignSegment,
  ): Promise<number[]> {
    switch (segment) {
      case CampaignSegment.DORMANT: {
        const dormant = await this.retention.getDormantCustomers(
          organizationId,
          { includeRecentlyTargeted: true },
        );
        return dormant.map((d) => d.id);
      }
      case CampaignSegment.AT_RISK: {
        const dormant = await this.retention.getDormantCustomers(
          organizationId,
          { includeRecentlyTargeted: true },
        );
        return dormant
          .filter((d) => d.healthTier === 'at_risk' || d.healthTier === 'lost')
          .map((d) => d.id);
      }
      case CampaignSegment.NEW: {
        const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
        const rows = await this.prisma.customer.findMany({
          where: { organizationId, createdAt: { gte: cutoff } },
          select: { id: true },
        });
        return rows.map((r) => r.id);
      }
      case CampaignSegment.VIP: {
        const rows = await this.prisma.customer.findMany({
          where: { organizationId, orders: { some: {} } },
          select: {
            id: true,
            orders: { select: { totalPrice: true } },
          },
        });
        return rows
          .map((r) => ({
            id: r.id,
            count: r.orders.length,
            spent: r.orders.reduce((s, o) => s + (o.totalPrice ?? 0), 0),
          }))
          .filter((r) => r.count >= 2)
          .sort((a, b) => b.spent - a.spent)
          .slice(0, 200)
          .map((r) => r.id);
      }
      case CampaignSegment.ALL_BUYERS:
      default: {
        const rows = await this.prisma.customer.findMany({
          where: { organizationId, orders: { some: {} } },
          select: { id: true },
        });
        return rows.map((r) => r.id);
      }
    }
  }

  private loadRecipients(ids: number[]): Promise<Recipient[]> {
    if (ids.length === 0) return Promise.resolve([]);
    return this.prisma.customer.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        name: true,
        lang: true,
        channel: true,
        telegramId: true,
        instagramId: true,
        bot: { select: { token: true } },
      },
    });
  }

  private async sendToRecipient(
    organizationId: number,
    r: Recipient,
    text: string,
  ): Promise<void> {
    switch (r.channel) {
      case CustomerChannel.TELEGRAM: {
        if (!r.bot) throw new Error('Customer has no Telegram bot');
        const token = this.encryption.decrypt(r.bot.token);
        const res = await this.telegram.sendRequest(token, 'sendMessage', {
          chat_id: r.telegramId,
          text,
          parse_mode: 'HTML',
        });
        if (res && res.ok === false) {
          throw new Error(`Telegram send failed: ${res.description ?? 'unknown'}`);
        }
        return;
      }
      case CustomerChannel.INSTAGRAM: {
        if (!r.instagramId) throw new Error('Customer has no Instagram ID');
        await this.instagram.sendMessage(organizationId, r.instagramId, text);
        return;
      }
      default:
        throw new Error(`Unknown channel: ${r.channel}`);
    }
  }
}
