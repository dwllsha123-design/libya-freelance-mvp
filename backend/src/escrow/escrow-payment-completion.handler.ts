import { Injectable } from '@nestjs/common';
import type { PaymentCompletionHandler } from '../payments/payment-completion.handler.js';
import { EscrowService } from './escrow.service.js';

@Injectable()
export class EscrowPaymentCompletionHandler implements PaymentCompletionHandler {
  constructor(private readonly escrow: EscrowService) {}

  onEscrowFundingSucceeded(paymentId: string) {
    return this.escrow.completeFundingAfterPayment(paymentId);
  }
}
