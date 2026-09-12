import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import type {
  CreateProviderPaymentInput,
  CreateProviderPaymentResult,
  PaymentProvider,
  PaymentProviderCapabilities,
  PaymentProviderConfigSnapshot,
  PaymentProviderHealth,
  ProviderPaymentStatus,
  ProviderWebhookEvent,
  RefundProviderPaymentResult,
  VerifyProviderWebhookInput,
} from '../payment.types.js';

export const SIMULATED_PAYMENT_PROVIDER = 'simulated';

@Injectable()
export class SimulatedPaymentProvider implements PaymentProvider {
  readonly name = SIMULATED_PAYMENT_PROVIDER;

  readonly capabilities: PaymentProviderCapabilities = {
    supportsSyncCapture: true,
    supportsRedirectCheckout: false,
    supportsRefunds: true,
    available: true,
  };

  constructor(private readonly configService: ConfigService) {}

  async createPayment(
    input: CreateProviderPaymentInput,
  ): Promise<CreateProviderPaymentResult> {
    const simulateFailure =
      this.configService.get<string>('payment.simulatedFailure') === 'true';

    if (simulateFailure) {
      return {
        providerReference: null,
        status: 'failed',
      };
    }

    return {
      providerReference: `sim_${input.paymentId}_${randomUUID().slice(0, 8)}`,
      status: 'succeeded',
    };
  }

  async createCheckout(
    input: CreateProviderPaymentInput,
  ): Promise<CreateProviderPaymentResult> {
    return this.createPayment(input);
  }

  async verifyPayment(input: {
    paymentId: string;
    providerReference?: string | null;
  }): Promise<ProviderPaymentStatus> {
    if (!input.providerReference) return 'pending';
    return input.providerReference.startsWith('sim_') ? 'succeeded' : 'failed';
  }

  async verifyWebhook(
    input: VerifyProviderWebhookInput,
  ): Promise<ProviderWebhookEvent | null> {
    return this.parseWebhook(input.rawBody, input.headers);
  }

  parseWebhook(
    rawBody: string | Buffer,
    _headers?: Record<string, string | string[] | undefined>,
  ): ProviderWebhookEvent | null {
    try {
      const text = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
      const body = JSON.parse(text) as {
        type?: ProviderWebhookEvent['type'];
        paymentId?: string;
        providerReference?: string;
        failureCode?: string;
        failureMessage?: string;
      };
      if (!body.type || !body.providerReference) return null;
      return {
        type: body.type,
        paymentId: body.paymentId,
        providerReference: body.providerReference,
        failureCode: body.failureCode,
        failureMessage: body.failureMessage,
      };
    } catch {
      return null;
    }
  }

  async health(): Promise<PaymentProviderHealth> {
    return {
      ok: true,
      available: true,
      provider: this.name,
      message: 'Simulated provider (non-production / explicit allow only)',
    };
  }

  getConfig(): PaymentProviderConfigSnapshot {
    return {
      provider: this.name,
      available: true,
      mode: 'sync',
      requiresRedirect: false,
      supportsRefunds: true,
    };
  }

  async refund(): Promise<RefundProviderPaymentResult> {
    return {
      providerReference: `sim_refund_${randomUUID().slice(0, 8)}`,
      status: 'succeeded',
    };
  }
}
