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

  it('is inactive by default (launch direct-payment mode)', () => {
    vi.stubEnv('PAYMENT_PROTECTION_ACTIVE', '');
    vi.stubEnv('NODE_ENV', 'production');
    expect(isMarketplacePaymentProtectionActive()).toBe(false);
    expect(paymentProtectionPublicFlags().directPaymentMode).toBe(true);
    expect(paymentProtectionPublicFlags().paymentProtectionStatus).toBe('DISABLED');
    expect(paymentProtectionPublicFlags().platformPaymentsScope).toBe(
      'SUBSCRIPTIONS_AND_POINTS',
    );
  });

  it('blocks marketplace funding mutations in production when inactive', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('PAYMENT_PROTECTION_ACTIVE', '');
    expect(canMutateMarketplaceEscrowFunding()).toBe(false);
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

  it('blocks escrow funding outside production when protection inactive (advertising-model freeze)', () => {
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('PAYMENT_PROTECTION_ACTIVE', '');
    expect(isSimulatedMarketplaceFundingAllowed()).toBe(false);
    expect(canMutateMarketplaceEscrowFunding()).toBe(false);
    expect(() => assertMarketplaceFundingAllowed()).toThrow(
      PreconditionFailedException,
    );
  });

  it('allows funding when PAYMENT_PROTECTION_ACTIVE=true even in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('PAYMENT_PROTECTION_ACTIVE', 'true');
    expect(isMarketplacePaymentProtectionActive()).toBe(true);
    expect(canMutateMarketplaceEscrowFunding()).toBe(true);
    expect(() => assertMarketplaceFundingAllowed()).not.toThrow();
  });
});
