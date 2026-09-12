import { Injectable } from '@nestjs/common';
import type {
  CreateProviderPaymentInput,
  CreateProviderPaymentResult,
  PaymentProvider,
  PaymentProviderCapabilities,
  ProviderWebhookEvent,
  RefundProviderPaymentInput,
  RefundProviderPaymentResult,
  VerifyProviderWebhookInput,
} from '../payment.types.js';

export const UNAVAILABLE_PAYMENT_PROVIDER = 'unavailable';

/**
 * Production-safe stub when no real PSP is wired (or simulated is refused).
 * Never reports a successful capture.
 */
@Injectable()
export class UnavailablePaymentProvider implements PaymentProvider {
  readonly name = UNAVAILABLE_PAYMENT_PROVIDER;

  readonly capabilities: PaymentProviderCapabilities = {
    supportsSyncCapture: false,
    supportsRedirectCheckout: false,
    supportsRefunds: false,
    available: false,
  };

  async createPayment(
    _input: CreateProviderPaymentInput,
  ): Promise<CreateProviderPaymentResult> {
    return {
      providerReference: null,
      status: 'failed',
      checkoutUrl: null,
    };
  }

  async createCheckout(
    input: CreateProviderPaymentInput,
  ): Promise<CreateProviderPaymentResult> {
    return this.createPayment(input);
  }

  async verifyPayment(): Promise<'failed'> {
    return 'failed';
  }

  async verifyWebhook(
    _input: VerifyProviderWebhookInput,
  ): Promise<ProviderWebhookEvent | null> {
    return null;
  }

  parseWebhook(): ProviderWebhookEvent | null {
    return null;
  }

  async health() {
    return {
      ok: false,
      available: false,
      provider: this.name,
      message: 'No payment service provider configured',
    };
  }

  getConfig() {
    return {
      provider: this.name,
      available: false,
      mode: 'sync' as const,
      requiresRedirect: false,
      supportsRefunds: false,
    };
  }

  async refund(
    _input: RefundProviderPaymentInput,
  ): Promise<RefundProviderPaymentResult> {
    return { providerReference: null, status: 'failed' };
  }
}
