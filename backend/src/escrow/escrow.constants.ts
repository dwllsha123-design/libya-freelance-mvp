import { ESCROW_CURRENCY, FALLBACK_COMMISSION_PERCENT } from '../commercial/commercial.constants.js';

/** @deprecated Prefer CommissionResolutionService — kept for marketing fallback only */
export const ESCROW_PLATFORM_FEE_PERCENT = FALLBACK_COMMISSION_PERCENT;
export { ESCROW_CURRENCY };

export function calculateEscrowFees(amount: number, commissionPercent = FALLBACK_COMMISSION_PERCENT) {
  const platformFee = Math.round(amount * (commissionPercent / 100) * 100) / 100;
  const freelancerPayout = Math.round((amount - platformFee) * 100) / 100;
  return { platformFee, freelancerPayout, commissionPercent };
}
