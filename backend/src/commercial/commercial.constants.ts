export const ESCROW_CURRENCY = 'LYD';
/** Fallback only when no platform policy row exists (should not happen after migration seed). */
export const FALLBACK_COMMISSION_PERCENT = 10;

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function calculateFeesFromPercent(
  amount: number,
  commissionPercent: number,
  options?: {
    minimumCommissionAmount?: number | null;
    maximumCommissionAmount?: number | null;
  },
) {
  let platformFee = roundMoney(amount * (commissionPercent / 100));
  if (
    options?.minimumCommissionAmount != null &&
    platformFee < options.minimumCommissionAmount
  ) {
    platformFee = roundMoney(options.minimumCommissionAmount);
  }
  if (
    options?.maximumCommissionAmount != null &&
    platformFee > options.maximumCommissionAmount
  ) {
    platformFee = roundMoney(options.maximumCommissionAmount);
  }
  if (platformFee > amount) {
    platformFee = roundMoney(amount);
  }
  const freelancerPayout = roundMoney(amount - platformFee);
  return { platformFee, freelancerPayout, commissionPercent };
}

export function previewCommissionSplit(input: {
  projectValue: number;
  commissionPercent: number;
  investorSharePercent?: number | null;
  minimumCommissionAmount?: number | null;
  maximumCommissionAmount?: number | null;
}) {
  const fees = calculateFeesFromPercent(input.projectValue, input.commissionPercent, {
    minimumCommissionAmount: input.minimumCommissionAmount,
    maximumCommissionAmount: input.maximumCommissionAmount,
  });
  const investorSharePercent = input.investorSharePercent ?? 0;
  const investorAccrual = roundMoney(
    fees.platformFee * (investorSharePercent / 100),
  );
  const platformRemaining = roundMoney(fees.platformFee - investorAccrual);
  return {
    projectValue: roundMoney(input.projectValue),
    commissionPercent: input.commissionPercent,
    platformCommission: fees.platformFee,
    freelancerPayout: fees.freelancerPayout,
    investorSharePercent,
    investorAccrual,
    platformRemainingBeforeExpenses: platformRemaining,
    currency: ESCROW_CURRENCY,
  };
}
