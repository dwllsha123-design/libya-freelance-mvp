import { afterEach, describe, expect, it } from 'vitest';
import { ConfigService } from '@nestjs/config';
import {
  resolvePaymentDriver,
  resolvePaymentProviderInstance,
} from '../src/payments/payment.module.js';
import { SimulatedPaymentProvider } from '../src/payments/providers/simulated-payment.provider.js';
import { UnavailablePaymentProvider } from '../src/payments/providers/unavailable-payment.provider.js';

function config(nodeEnv: string, driver = 'simulated') {
  return {
    get: (key: string) => {
      if (key === 'nodeEnv') return nodeEnv;
      if (key === 'payment.driver') return driver;
      if (key === 'payment.simulatedFailure') return 'false';
      return undefined;
    },
  } as unknown as ConfigService;
}

describe('resolvePaymentProviderInstance', () => {
  afterEach(() => {
    delete process.env.ALLOW_SIMULATED_CHECKOUT;
  });

  it('refuses silent simulated success in production', async () => {
    const cfg = config('production');
    const provider = resolvePaymentProviderInstance(
      cfg,
      new SimulatedPaymentProvider(cfg),
      new UnavailablePaymentProvider(),
    );
    expect(provider.name).toBe('unavailable');
    const result = await provider.createPayment({
      paymentId: 'p1',
      amount: 42,
      currency: 'LYD',
      description: 'Pro',
      clientId: 'u1',
    });
    expect(result.status).toBe('failed');
  });

  it('allows simulated outside production', async () => {
    const cfg = config('test');
    const provider = resolvePaymentProviderInstance(
      cfg,
      new SimulatedPaymentProvider(cfg),
      new UnavailablePaymentProvider(),
    );
    expect(provider.name).toBe('simulated');
  });

  it('allows simulated in production only with ALLOW_SIMULATED_CHECKOUT', () => {
    process.env.ALLOW_SIMULATED_CHECKOUT = 'true';
    const cfg = config('production');
    const provider = resolvePaymentProviderInstance(
      cfg,
      new SimulatedPaymentProvider(cfg),
      new UnavailablePaymentProvider(),
    );
    expect(provider.name).toBe('simulated');
  });

  it('resolvePaymentDriver accepts unavailable alias', () => {
    expect(resolvePaymentDriver(config('production', 'unavailable'))).toBe(
      'unavailable',
    );
  });
});
