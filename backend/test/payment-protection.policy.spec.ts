import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  PAYMENT_PROTECTION_NOT_ACTIVE,
  assertMarketplaceFundingAllowed,
  canMutateMarketplaceEscrowFunding,
  isMarketplacePaymentProtectionActive,
  isSimulatedMarketplaceFundingAllowed,
  paymentProtectionPublicFlags,
} from '../src/payments/payment-protection.policy.js';
import { PreconditionFailedException } from '@nestjs/common';

describe('payment-protection.policy', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('is permanently disabled (advertising marketplace)', () => {
    vi.stubEnv('PAYMENT_PROTECTION_ACTIVE', 'true');
    vi.stubEnv('NODE_ENV', 'production');
    expect(isMarketplacePaymentProtectionActive()).toBe(false);
    expect(paymentProtectionPublicFlags().directPaymentMode).toBe(true);
    expect(paymentProtectionPublicFlags().paymentProtectionStatus).toBe('DISABLED');
    expect(paymentProtectionPublicFlags().platformPaymentsScope).toBe(
      'SUBSCRIPTIONS_ONLY',
    );
    expect(paymentProtectionPublicFlags().paidPointsPurchaseEnabled).toBe(false);
    expect(paymentProtectionPublicFlags().projectCommission).toBe(0);
  });

  it('blocks marketplace funding mutations permanently', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('PAYMENT_PROTECTION_ACTIVE', 'true');
    expect(canMutateMarketplaceEscrowFunding()).toBe(false);
    expect(isSimulatedMarketplaceFundingAllowed()).toBe(false);
    expect(() => assertMarketplaceFundingAllowed()).toThrow(
      PreconditionFailedException,
    );
    try {
      assertMarketplaceFundingAllowed();
    } catch (err) {
      expect(err).toBeInstanceOf(PreconditionFailedException);
      const body = (err as PreconditionFailedException).getResponse() as {
        code?: string;
      };
      expect(body.code).toBe(PAYMENT_PROTECTION_NOT_ACTIVE);
    }
  });

  it('blocks escrow funding outside production', () => {
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('PAYMENT_PROTECTION_ACTIVE', '');
    expect(canMutateMarketplaceEscrowFunding()).toBe(false);
    expect(() => assertMarketplaceFundingAllowed()).toThrow(
      PreconditionFailedException,
    );
  });
});
