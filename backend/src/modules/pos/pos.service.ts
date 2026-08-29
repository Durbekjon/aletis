import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@core/prisma/prisma.service';
import { OrderSource, PaymentProvider, PaymentTxState, PaymentTargetType, ShiftStatus, MemberRole } from '@prisma/client';

@Injectable()
export class PosService {
  constructor(private prisma: PrismaService) {}

  private async getPosMember(userId: number) {
    const member = await this.prisma.member.findUnique({
      where: { userId },
    });
    if (!member) {
      throw new ForbiddenException('Not an organization member');
    }
    if (member.role !== MemberRole.ADMIN && member.role !== MemberRole.CASHIER) {
      throw new ForbiddenException('Only admins and cashiers can access POS');
    }
    return member;
  }

  async openShift(userId: number, startingCash: number) {
    const member = await this.getPosMember(userId);
    const existingOpen = await this.prisma.posShift.findFirst({
      where: { organizationId: member.organizationId, cashierId: member.id, status: ShiftStatus.OPEN },
    });
    if (existingOpen) {
      throw new BadRequestException('A shift is already open for this cashier.');
    }

    return this.prisma.posShift.create({
      data: {
        organizationId: member.organizationId,
        cashierId: member.id,
        startingCash,
        status: ShiftStatus.OPEN,
      },
    });
  }

  async getCurrentShift(userId: number) {
    const member = await this.getPosMember(userId);
    const shift = await this.prisma.posShift.findFirst({
      where: { organizationId: member.organizationId, cashierId: member.id, status: ShiftStatus.OPEN },
    });
    return shift || null;
  }

  async closeShift(userId: number, shiftId: number, actualCash: number) {
    const member = await this.getPosMember(userId);
    const shift = await this.prisma.posShift.findFirst({
      where: { id: shiftId, organizationId: member.organizationId, cashierId: member.id, status: ShiftStatus.OPEN },
    });

    if (!shift) {
      throw new NotFoundException('Open shift not found.');
    }
    
    const cashTransactions = await this.prisma.paymentTransaction.aggregate({
      _sum: { amount: true },
      where: {
        organizationId: member.organizationId,
        provider: PaymentProvider.POS_CASH,
        state: PaymentTxState.PAID,
        createdAt: { gte: shift.openedAt },
      }
    });

    const expectedCash = shift.startingCash + (cashTransactions._sum.amount || 0);
    const discrepancy = actualCash - expectedCash;

    return this.prisma.posShift.update({
      where: { id: shiftId },
      data: {
        closedAt: new Date(),
        status: ShiftStatus.CLOSED,
        expectedCash,
        actualCash,
        discrepancy,
      },
    });
  }

  async checkout(userId: number, data: any) {
    const member = await this.getPosMember(userId);
    const { items, payments } = data; // items: {productId, quantity, price}, payments: {provider: POS_CASH | POS_CARD, amount}

    if (!items || items.length === 0) throw new BadRequestException('No items in cart');

    const totalAmount = items.reduce((acc, item) => acc + item.price * item.quantity, 0);

    return this.prisma.$transaction(async (tx) => {
      // 1. Create Order
      const order = await tx.order.create({
        data: {
          organizationId: member.organizationId,
          source: OrderSource.POS,
          status: 'DELIVERED', // POS orders are instantly fulfilled
          paymentStatus: 'PAID',
          totalPrice: totalAmount,
          orderItems: {
            create: items.map(item => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
            }))
          }
        }
      });

      // 2. Create Payment Transactions
      if (payments && payments.length > 0) {
        for (const payment of payments) {
          await tx.paymentTransaction.create({
            data: {
              provider: payment.provider,
              targetType: PaymentTargetType.ORDER,
              orderId: order.id,
              organizationId: member.organizationId,
              amount: payment.amount,
              state: PaymentTxState.PAID,
            }
          });
        }
      } else {
         // Default to cash if not provided
         await tx.paymentTransaction.create({
          data: {
            provider: PaymentProvider.POS_CASH,
            targetType: PaymentTargetType.ORDER,
            orderId: order.id,
            organizationId: member.organizationId,
            amount: totalAmount,
            state: PaymentTxState.PAID,
          }
        });
      }

      // 3. Deduct Stock
      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            quantity: { decrement: item.quantity }
          }
        });
      }

      return order;
    });
  }
}
