/**
 * Permanent advertising / subscription marketplace freeze.
 *
 * Libyan Freelance does NOT hold project funds, run escrow, or take project commission.
 * Escrow tables/endpoints may remain for historical rows, but mutations are impossible.
 *
 * Platform electronic payments are for MONTHLY FREELANCER SUBSCRIPTIONS only.
 * Paid Nuqati (points) purchase is disabled for the current commercial release.
 */
import { PreconditionFailedException } from '@nestjs/common';

export const PAYMENT_PROTECTION_NOT_ACTIVE = 'PAYMENT_PROTECTION_NOT_ACTIVE';

/**
 * Always false — payment protection / escrow is not part of the product.
 * Env flag is ignored so the model cannot be re-enabled accidentally.
 */
export function isMarketplacePaymentProtectionActive(): boolean {
  return false;
}

/**
 * @deprecated Escrow funding is permanently frozen for the advertising model.
 */
export function isSimulatedMarketplaceFundingAllowed(): boolean {
  return false;
}

/** Marketplace escrow funding mutations are never allowed. */
export function canMutateMarketplaceEscrowFunding(): boolean {
  return false;
}

export function assertMarketplaceFundingAllowed(): void {
  throw new PreconditionFailedException({
    message:
      'تمويل المشاريع غير متاح. ليبي فريلانس منصة إعلانية ووسيط تقني — الدفع يتم مباشرة بين صاحب المشروع والمستقل خارج المنصة.',
    code: PAYMENT_PROTECTION_NOT_ACTIVE,
    messageEn:
      'Project funding is not available. Libyan Freelance is an advertising marketplace — clients and freelancers arrange payment directly outside the platform.',
  });
}

export function paymentProtectionPublicFlags() {
  return {
    paymentProtectionActive: false,
    paymentProtectionStatus: 'DISABLED' as const,
    directPaymentMode: true,
    /** Commercial launch: subscription fees only (paid points purchase disabled). */
    platformPaymentsScope: 'SUBSCRIPTIONS_ONLY' as const,
    projectPaymentModel: 'DIRECT_BETWEEN_USERS' as const,
    projectCommission: 0 as const,
    paidPointsPurchaseEnabled: false as const,
  };
}
