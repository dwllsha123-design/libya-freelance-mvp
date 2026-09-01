export interface PaymentCompletionHandler {
  onEscrowFundingSucceeded(paymentId: string): Promise<void>;
}

export const PAYMENT_COMPLETION_HANDLER = Symbol('PAYMENT_COMPLETION_HANDLER');
