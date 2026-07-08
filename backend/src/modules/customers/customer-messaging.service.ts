import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@core/prisma/prisma.service';
import { TelegramService } from '@modules/telegram/telegram.service';
import { InstagramService } from '@modules/instagram/instagram.service';
import { EncryptionService } from '@core/encryption/encryption.service';
import { MessagesService } from '@modules/messages/messages.service';
import { CustomerChannel, MemberRole, Message } from '@prisma/client';

// Deliberately a separate service from CustomersService: TelegramModule
// shadow-provides its own CustomersService instance to avoid a module
// cycle (TelegramService needs CustomersService), so adding a TelegramService
// dependency onto CustomersService itself would create a genuine circular
// provider dependency. This service lives in CustomersModule but has no
// relationship to CustomersService, so it can safely depend on
// TelegramService/InstagramService without reintroducing that cycle.
@Injectable()
export class CustomerMessagingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly telegramService: TelegramService,
    private readonly instagramService: InstagramService,
    private readonly encryptionService: EncryptionService,
    private readonly messagesService: MessagesService,
  ) {}

  /**
   * Admin-composed reply from the dashboard, sent via the customer's own
   * channel (Telegram bot / Instagram) and persisted so it shows up in the
   * conversation history like any other message.
   */
  async sendMessageToCustomer(
    userId: number,
    customerId: number,
    content: string,
  ): Promise<Message> {
    const organizationId = await this.resolveAdminOrgId(userId);
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId, organizationId },
      include: { bot: true },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    await this.sendToCustomer(customer.channel, organizationId, customer, content);

    return this.messagesService._saveMessage(
      customer.id,
      content,
      'BOT',
      customer.botId,
    );
  }

  // Mirrors RetentionService/ReplenishmentService's sendToCustomer — same
  // channel-switch pattern, reused here for admin-composed replies.
  private async sendToCustomer(
    channel: CustomerChannel,
    organizationId: number,
    customer: {
      telegramId: string;
      instagramId: string | null;
      bot: { token: string } | null;
    },
    text: string,
  ): Promise<void> {
    switch (channel) {
      case CustomerChannel.TELEGRAM: {
        if (!customer.bot) throw new Error('Customer has no Telegram bot');
        const token = this.encryptionService.decrypt(customer.bot.token);
        const res = await this.telegramService.sendRequest(
          token,
          'sendMessage',
          { chat_id: customer.telegramId, text },
        );
        if (res && res.ok === false) {
          throw new Error(`Telegram send failed: ${res.description ?? 'unknown'}`);
        }
        return;
      }
      case CustomerChannel.INSTAGRAM: {
        if (!customer.instagramId) {
          throw new Error('Customer has no Instagram ID');
        }
        await this.instagramService.sendMessage(
          organizationId,
          customer.instagramId,
          text,
        );
        return;
      }
      default:
        throw new Error(`Unknown channel: ${channel}`);
    }
  }

  private async resolveAdminOrgId(userId: number): Promise<number> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { member: true },
    });
    if (!user) throw new NotFoundException('User not found');
    if (!user.member) throw new NotFoundException('User is not a member');
    if (user.member.role !== MemberRole.ADMIN) {
      throw new ForbiddenException('User is not an admin');
    }
    return user.member.organizationId;
  }
}
