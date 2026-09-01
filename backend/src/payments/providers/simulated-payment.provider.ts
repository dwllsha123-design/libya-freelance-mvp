import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import type {
  CreateProviderPaymentInput,
  CreateProviderPaymentResult,
  PaymentProvider,
  PaymentProviderCapabilities,
} from '../payment.types.js';

export const SIMULATED_PAYMENT_PROVIDER = 'simulated';

@Injectable()
export class SimulatedPaymentProvider implements PaymentProvider {
  readonly name = SIMULATED_PAYMENT_PROVIDER;

  readonly capabilities: PaymentProviderCapabilities = {
    supportsSyncCapture: true,
    supportsRedirectCheckout: false,
    supportsRefunds: true,
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

  async refund(): Promise<{ providerReference: string | null; status: 'succeeded' }> {
    return {
      providerReference: `sim_refund_${randomUUID().slice(0, 8)}`,
      status: 'succeeded',
    };
  }
}
