import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@core/prisma/prisma.service';
import { LoyaltyReason, Prisma } from '@prisma/client';

/**
 * Loyalty points + two-sided referrals.
 *
 * - Every customer can fetch a Telegram referral link (t.me/bot?start=ref_CODE).
 * - A new customer who starts the bot via that link is attached to the referrer.
 * - On the referred customer's FIRST order, both sides earn referral points.
 * - Orders also earn a flat number of loyalty points.
 *
 * Customer.loyaltyPoints holds the running balance; LoyaltyTransaction is the
 * append-only ledger behind it.
 */
@Injectable()
export class LoyaltyService {
  private readonly logger = new Logger(LoyaltyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private get pointsPerOrder(): number {
    return this.config.get<number>('LOYALTY_POINTS_PER_ORDER') ?? 10;
  }

  private get referralPoints(): number {
    return this.config.get<number>('LOYALTY_REFERRAL_POINTS') ?? 50;
  }

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
  // Referral codes / links
  // ──────────────────────────────────────────────────────────────────────────

  private genCode(): string {
    return Math.random().toString(36).slice(2, 8).toUpperCase();
  }

  /** Return the customer's referral code, generating a unique one on first use. */
  async getOrCreateReferralCode(customerId: number): Promise<string> {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: { referralCode: true },
    });
    if (!customer) throw new NotFoundException(`Customer #${customerId} not found`);
    if (customer.referralCode) return customer.referralCode;

    // Retry a few times in the unlikely event of a code collision.
    for (let i = 0; i < 5; i++) {
      const code = this.genCode();
      try {
        await this.prisma.customer.update({
          where: { id: customerId },
          data: { referralCode: code },
        });
        return code;
      } catch (err) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2002'
        ) {
          continue; // code taken — try another
        }
        throw err;
      }
    }
    throw new Error('Could not allocate a unique referral code');
  }

  /** Build the customer's Telegram referral deep link. */
  async getReferralLink(
    customerId: number,
  ): Promise<{ code: string; link: string | null; botUsername: string | null }> {
    const code = await this.getOrCreateReferralCode(customerId);
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: { bot: { select: { username: true } } },
    });
    const botUsername = customer?.bot?.username ?? null;
    const link = botUsername
      ? `https://t.me/${botUsername}?start=ref_${code}`
      : null;
    return { code, link, botUsername };
  }

  /**
   * Attach a newly-started customer to their referrer. No-op if the code is
   * unknown, self-referential, or the customer is already referred.
   */
  async attachReferral(
    newCustomerId: number,
    organizationId: number,
    code: string,
  ): Promise<boolean> {
    if (!code) return false;
    const [referrer, newCustomer] = await Promise.all([
      this.prisma.customer.findFirst({
        where: { referralCode: code, organizationId },
        select: { id: true },
      }),
      this.prisma.customer.findUnique({
        where: { id: newCustomerId },
        select: { id: true, referredById: true },
      }),
    ]);
    if (!referrer || !newCustomer) return false;
    if (referrer.id === newCustomerId) return false; // can't refer yourself
    if (newCustomer.referredById) return false; // already referred

    await this.prisma.customer.update({
      where: { id: newCustomerId },
      data: { referredById: referrer.id },
    });
    this.logger.log(
      `Customer ${newCustomerId} attached to referrer ${referrer.id} (code ${code})`,
    );
    return true;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Ledger
  // ──────────────────────────────────────────────────────────────────────────

  /** Write a ledger entry and move the customer's running balance atomically. */
  private async award(
    customerId: number,
    organizationId: number,
    points: number,
    reason: LoyaltyReason,
    extra: { orderId?: number; referredCustomerId?: number; note?: string } = {},
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.loyaltyTransaction.create({
        data: {
          customerId,
          organizationId,
          points,
          reason,
          orderId: extra.orderId ?? null,
          referredCustomerId: extra.referredCustomerId ?? null,
          note: extra.note ?? null,
        },
      }),
      this.prisma.customer.update({
        where: { id: customerId },
        data: { loyaltyPoints: { increment: points } },
      }),
    ]);
  }

  /**
   * Order hook: award order points, and — if this is the referred customer's
   * first qualifying order — pay the two-sided referral bonus exactly once.
   * Fire-and-forget from the order flow; never throws into it.
   */
  async onOrderCreated(
    customerId: number,
    organizationId: number,
    orderId: number,
  ): Promise<void> {
    try {
      await this.award(
        customerId,
        organizationId,
        this.pointsPerOrder,
        LoyaltyReason.ORDER,
        { orderId },
      );

      const customer = await this.prisma.customer.findUnique({
        where: { id: customerId },
        select: { referredById: true },
      });
      if (!customer?.referredById) return;

      const alreadyRewarded = await this.prisma.loyaltyTransaction.findFirst({
        where: { customerId, reason: LoyaltyReason.REFERRAL_REFEREE },
        select: { id: true },
      });
      if (alreadyRewarded) return;

      await this.award(
        customerId,
        organizationId,
        this.referralPoints,
        LoyaltyReason.REFERRAL_REFEREE,
        { orderId, note: 'First-order referral bonus' },
      );
      await this.award(
        customer.referredById,
        organizationId,
        this.referralPoints,
        LoyaltyReason.REFERRAL_REFERRER,
        { referredCustomerId: customerId, orderId },
      );
      this.logger.log(
        `Referral reward paid: referee ${customerId} + referrer ${customer.referredById} (+${this.referralPoints} each)`,
      );
    } catch (err: any) {
      this.logger.warn(`onOrderCreated loyalty hook failed: ${err.message}`);
    }
  }

  /** Merchant manual adjustment (can be negative). */
  async adjustPoints(
    organizationId: number,
    customerId: number,
    points: number,
    note?: string,
  ): Promise<{ balance: number }> {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, organizationId },
      select: { id: true },
    });
    if (!customer) throw new NotFoundException(`Customer #${customerId} not found`);
    await this.award(customerId, organizationId, points, LoyaltyReason.MANUAL, {
      note,
    });
    return this.getBalance(customerId);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Reads
  // ──────────────────────────────────────────────────────────────────────────

  async getBalance(customerId: number): Promise<{ balance: number }> {
    const c = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: { loyaltyPoints: true },
    });
    return { balance: c?.loyaltyPoints ?? 0 };
  }

  async getCustomerSummary(organizationId: number, customerId: number) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, organizationId },
      select: {
        id: true,
        name: true,
        loyaltyPoints: true,
        referredById: true,
        _count: { select: { referrals: true } },
      },
    });
    if (!customer) throw new NotFoundException(`Customer #${customerId} not found`);

    const [link, transactions] = await Promise.all([
      this.getReferralLink(customerId),
      this.prisma.loyaltyTransaction.findMany({
        where: { customerId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);

    return {
      customerId: customer.id,
      name: customer.name,
      balance: customer.loyaltyPoints,
      referralCount: customer._count.referrals,
      wasReferred: customer.referredById !== null,
      referral: link,
      transactions,
    };
  }

  async getMetrics(organizationId: number) {
    const [issued, redeemed, referralPairs, topReferrers] = await Promise.all([
      this.prisma.loyaltyTransaction.aggregate({
        where: { organizationId, points: { gt: 0 } },
        _sum: { points: true },
      }),
      this.prisma.loyaltyTransaction.aggregate({
        where: { organizationId, reason: LoyaltyReason.REDEMPTION },
        _sum: { points: true },
      }),
      this.prisma.loyaltyTransaction.count({
        where: { organizationId, reason: LoyaltyReason.REFERRAL_REFEREE },
      }),
      this.prisma.customer.findMany({
        where: { organizationId, referrals: { some: {} } },
        select: {
          id: true,
          name: true,
          loyaltyPoints: true,
          _count: { select: { referrals: true } },
        },
        orderBy: { referrals: { _count: 'desc' } },
        take: 10,
      }),
    ]);

    return {
      pointsIssued: issued._sum.points ?? 0,
      pointsRedeemed: Math.abs(redeemed._sum.points ?? 0),
      successfulReferrals: referralPairs,
      topReferrers: topReferrers.map((c) => ({
        customerId: c.id,
        name: c.name,
        referrals: c._count.referrals,
        points: c.loyaltyPoints,
      })),
    };
  }
}
