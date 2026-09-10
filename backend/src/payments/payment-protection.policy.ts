import { PreconditionFailedException } from '@nestjs/common';

/**
 * Launch-phase payment protection gate.
 *
 * While inactive, Libyan Freelance must not create FUNDED / escrowed marketplace
 * states that imply the platform received project funds.
 *
 * Simulated funding remains available only outside production (dev/test), so
 * existing architecture and E2E suites keep working without pretending money moved.
 */
export const PAYMENT_PROTECTION_NOT_ACTIVE = 'PAYMENT_PROTECTION_NOT_ACTIVE';

export function isMarketplacePaymentProtectionActive(): boolean {
  return process.env.PAYMENT_PROTECTION_ACTIVE === 'true';
}

/** Simulated/mock escrow funding allowed only in non-production environments. */
export function isSimulatedMarketplaceFundingAllowed(): boolean {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  return nodeEnv !== 'production';
}

export function canMutateMarketplaceEscrowFunding(): boolean {
  return (
    isMarketplacePaymentProtectionActive() ||
    isSimulatedMarketplaceFundingAllowed()
  );
}

export function assertMarketplaceFundingAllowed(): void {
  if (canMutateMarketplaceEscrowFunding()) {
    return;
  }

  throw new PreconditionFailedException({
    message:
      'حماية الدفع غير مفعّلة حالياً. الدفع يتم مباشرة بين صاحب المشروع والمستقل خارج ليبي فريلانس.',
    code: PAYMENT_PROTECTION_NOT_ACTIVE,
  });
}

export function paymentProtectionPublicFlags() {
  const active = isMarketplacePaymentProtectionActive();
  return {
    paymentProtectionActive: active,
    paymentProtectionStatus: active
      ? ('ACTIVE' as const)
      : ('COMING_SOON' as const),
    directPaymentMode: !active,
  };
}
