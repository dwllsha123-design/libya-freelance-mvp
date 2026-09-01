export const ESCROW_PLATFORM_FEE_PERCENT = 10;

export function calculateEscrowFees(amount: number) {
  const platformFee =
    Math.round(amount * (ESCROW_PLATFORM_FEE_PERCENT / 100) * 100) / 100;
  const freelancerPayout = Math.round((amount - platformFee) * 100) / 100;
  return { platformFee, freelancerPayout };
}
