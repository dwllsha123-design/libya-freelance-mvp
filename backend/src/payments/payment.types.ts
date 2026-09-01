export type PaymentCaptureMode = 'sync' | 'redirect';

export type ProviderPaymentStatus = 'pending' | 'succeeded' | 'failed';

export interface PaymentProviderCapabilities {
  /** Immediate capture without leaving the platform (e.g. simulated, card on-file). */
  supportsSyncCapture: boolean;
  /** Hosted checkout page — user is redirected to the gateway. */
  supportsRedirectCheckout: boolean;
  /** Provider can send money back to the payer. */
  supportsRefunds: boolean;
}

export interface CreateProviderPaymentInput {
  paymentId: string;
  amount: number;
  currency: string;
  description: string;
  clientId: string;
  returnUrl?: string;
  cancelUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateProviderPaymentResult {
  providerReference: string | null;
  status: ProviderPaymentStatus;
  checkoutUrl?: string | null;
}

export interface VerifyProviderWebhookInput {
  headers: Record<string, string | string[] | undefined>;
  rawBody: string | Buffer;
}

export type ProviderWebhookEventType =
  | 'payment.succeeded'
  | 'payment.failed'
  | 'payment.refunded';

export interface ProviderWebhookEvent {
  type: ProviderWebhookEventType;
  paymentId?: string;
  providerReference: string;
  failureCode?: string;
  failureMessage?: string;
}

export interface RefundProviderPaymentInput {
  paymentId: string;
  providerReference: string;
  amount: number;
  currency: string;
  reason?: string;
}

export interface RefundProviderPaymentResult {
  providerReference: string | null;
  status: 'pending' | 'succeeded' | 'failed';
}

export interface PaymentProvider {
  readonly name: string;
  readonly capabilities: PaymentProviderCapabilities;
  createPayment(input: CreateProviderPaymentInput): Promise<CreateProviderPaymentResult>;
  verifyWebhook?(input: VerifyProviderWebhookInput): Promise<ProviderWebhookEvent | null>;
  refund?(input: RefundProviderPaymentInput): Promise<RefundProviderPaymentResult>;
}

export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');

export interface EscrowFundingCaptureResult {
  paymentId: string;
  provider: string;
  depositNote: string;
}

export interface InitiateEscrowFundingResult {
  paymentId: string;
  status: string;
  provider: string;
  checkoutUrl?: string | null;
  requiresRedirect: boolean;
}

export interface PublicPaymentConfig {
  provider: string;
  mode: PaymentCaptureMode;
  currency: string;
  requiresRedirect: boolean;
  supportsRefunds: boolean;
  available: boolean;
}
