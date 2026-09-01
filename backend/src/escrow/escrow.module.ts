import { Module, forwardRef } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { PaymentsModule } from '../payments/payment.module.js';
import { EscrowController } from './escrow.controller.js';
import { EscrowService } from './escrow.service.js';
import { EscrowPaymentCompletionHandler } from './escrow-payment-completion.handler.js';
import { PAYMENT_COMPLETION_HANDLER } from '../payments/payment-completion.handler.js';

@Module({
  imports: [NotificationsModule, forwardRef(() => PaymentsModule)],
  controllers: [EscrowController],
  providers: [
    EscrowService,
    EscrowPaymentCompletionHandler,
    {
      provide: PAYMENT_COMPLETION_HANDLER,
      useExisting: EscrowPaymentCompletionHandler,
    },
  ],
  exports: [EscrowService, PAYMENT_COMPLETION_HANDLER],
})
export class EscrowModule {}
