/**
 * Launch-phase payment protection gate — escrow funding is frozen.
 *
 * Advertising / subscription marketplace model: Libyan Freelance must not create
 * FUNDED / escrowed marketplace states that imply the platform held project funds.
 * Escrow prepare/fund/release paths remain in the codebase for a future protected
 * payout product, but mutations stay blocked unless PAYMENT_PROTECTION_ACTIVE=true.
 *
 * Simulated funding must NEVER bypass this gate (including local/dev) — use the
 * explicit protection flag only when intentionally testing legacy escrow flows.
 */
import { PreconditionFailedException } from '@nestjs/common';

export const PAYMENT_PROTECTION_NOT_ACTIVE = 'PAYMENT_PROTECTION_NOT_ACTIVE';

export function isMarketplacePaymentProtectionActive(): boolean {
  return process.env.PAYMENT_PROTECTION_ACTIVE === 'true';
}

/**
 * @deprecated Escrow is frozen for the advertising model. Simulated env alone
 * must not unlock funding — kept only for callers that still import this helper.
 */
export function isSimulatedMarketplaceFundingAllowed(): boolean {
  return false;
}

/**
 * Marketplace escrow funding mutations are allowed only when payment protection
 * is explicitly active. Always false otherwise (permanent advertising-model freeze).
 */
export function canMutateMarketplaceEscrowFunding(): boolean {
  return isMarketplacePaymentProtectionActive();
}

export function assertMarketplaceFundingAllowed(): void {
  if (canMutateMarketplaceEscrowFunding()) {
    return;
  }

  throw new PreconditionFailedException({
    message:
      'تمويل الضمان مجمّد. ليبي فريلانس تعمل بنموذج الإعلان والاشتراك — الدفع يتم مباشرة بين صاحب المشروع والمستقل خارج المنصة.',
    code: PAYMENT_PROTECTION_NOT_ACTIVE,
    messageEn:
      'Escrow funding is frozen. Libyan Freelance uses an advertising/subscription model — pay freelancers directly outside the platform.',
  });
}

export function paymentProtectionPublicFlags() {
  const active = isMarketplacePaymentProtectionActive();
  return {
    paymentProtectionActive: active,
    /** Escrow is not a public product; default status is frozen/disabled — not "coming soon". */
    paymentProtectionStatus: active
      ? ('ACTIVE' as const)
      : ('DISABLED' as const),
    directPaymentMode: !active,
    platformPaymentsScope: 'SUBSCRIPTIONS_AND_POINTS' as const,
  };
}
