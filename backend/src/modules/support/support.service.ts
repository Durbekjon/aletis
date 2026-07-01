import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@core/prisma/prisma.service';
import { Customer, TicketStatus } from '@prisma/client';

/** Statuses that count as an open (unresolved) ticket. */
const OPEN_STATUSES: TicketStatus[] = [
  TicketStatus.OPEN,
  TicketStatus.IN_PROGRESS,
];

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);

  constructor(private readonly prisma: PrismaService) {}

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

  /**
   * Create a support ticket triggered by the AI ESCALATE_TO_SUPPORT intent.
   * Dashboard-only: no external notification is sent.
   */
  async createFromAIResponse(
    escalationData: { reason?: string; sentiment?: string } | undefined,
    customer: Customer,
    organizationId: number,
  ) {
    const sentiment = (escalationData?.sentiment || 'NORMAL').toUpperCase();
    const ticket = await this.prisma.supportTicket.create({
      data: {
        organizationId,
        customerId: customer.id,
        reason: escalationData?.reason || 'Customer requested a human agent',
        sentiment: ['URGENT', 'NORMAL', 'COMPLAINT'].includes(sentiment)
          ? sentiment
          : 'NORMAL',
        status: TicketStatus.OPEN,
      },
    });

    this.logger.log(
      `🆘 Support ticket #${ticket.id} created for customer ${customer.id} (org ${organizationId})`,
    );

    return ticket;
  }

  async listTickets(
    organizationId: number,
    opts: { status?: TicketStatus; limit?: number } = {},
  ) {
    return this.prisma.supportTicket.findMany({
      where: {
        organizationId,
        ...(opts.status ? { status: opts.status } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: opts.limit ?? 50,
      include: {
        customer: {
          select: { id: true, name: true, username: true, channel: true },
        },
      },
    });
  }

  async getMetrics(organizationId: number) {
    const grouped = await this.prisma.supportTicket.groupBy({
      by: ['status'],
      where: { organizationId },
      _count: { _all: true },
    });
    const count = (s: TicketStatus) =>
      grouped.find((g) => g.status === s)?._count._all ?? 0;

    const open = count(TicketStatus.OPEN);
    const inProgress = count(TicketStatus.IN_PROGRESS);
    const resolved = count(TicketStatus.RESOLVED);

    return {
      open,
      inProgress,
      resolved,
      total: open + inProgress + resolved,
    };
  }

  async updateStatus(
    organizationId: number,
    id: number,
    status: TicketStatus,
  ) {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { id, organizationId },
    });
    if (!ticket) {
      throw new NotFoundException(`Support ticket #${id} not found`);
    }
    return this.prisma.supportTicket.update({
      where: { id },
      data: { status },
    });
  }
}

export { OPEN_STATUSES };
