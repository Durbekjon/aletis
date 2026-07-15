import { Module } from '@nestjs/common';
import { PrismaModule } from '@core/prisma/prisma.module';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PaymeProvider } from './providers/payme.provider';
import { ClickProvider } from './providers/click.provider';

/**
 * Payme + Click payments. Serves two flows off one ledger:
 *   - customer checkout for orders  (transaction_param / account.order_id)
 *   - merchant subscription billing (account.invoice_id / "i<id>" click ref)
 *
 * SCAFFOLD: fully wired; activates once provider env vars are configured.
 */
@Module({
  imports: [PrismaModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymeProvider, ClickProvider],
  exports: [PaymentsService],
})
export class PaymentsModule {}
