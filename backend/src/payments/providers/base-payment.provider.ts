import { Injectable } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type {
  CreateProviderPaymentInput,
  CreateProviderPaymentResult,
  PaymentProvider,
  PaymentProviderCapabilities,
  RefundProviderPaymentInput,
  RefundProviderPaymentResult,
  VerifyProviderWebhookInput,
  ProviderWebhookEvent,
} from '../payment.types.js';

/**
 * Template for integrating a real Libyan (or international) payment gateway.
 *
 * Steps:
 * 1. Copy this file to `your-gateway-payment.provider.ts`
 * 2. Implement createPayment (redirect or sync) and verifyWebhook
 * 3. Register the driver in `payment.module.ts` resolvePaymentDriver()
 * 4. Set PAYMENT_DRIVER=your_gateway in environment variables
 */
@Injectable()
export abstract class BasePaymentProvider implements PaymentProvider {
  abstract readonly name: string;
  abstract readonly capabilities: PaymentProviderCapabilities;

  protected constructor(protected readonly configService: ConfigService) {}

  abstract createPayment(
    input: CreateProviderPaymentInput,
  ): Promise<CreateProviderPaymentResult>;

  createCheckout(
    input: CreateProviderPaymentInput,
  ): Promise<CreateProviderPaymentResult> {
    return this.createPayment(input);
  }

  verifyWebhook?(
    _input: VerifyProviderWebhookInput,
  ): Promise<ProviderWebhookEvent | null> {
    return Promise.resolve(null);
  }

  parseWebhook?(
    _rawBody: string | Buffer,
    _headers?: Record<string, string | string[] | undefined>,
  ): ProviderWebhookEvent | null {
    return null;
  }

  refund?(
    _input: RefundProviderPaymentInput,
  ): Promise<RefundProviderPaymentResult> {
    return Promise.resolve({ providerReference: null, status: 'succeeded' });
  }

  protected buildReturnUrl(paymentId: string, path = '/dashboard/payments/return') {
    const frontendUrl = this.configService.get<string>('frontendUrl') ?? '';
    return `${frontendUrl}${path}?paymentId=${paymentId}`;
  }
}
