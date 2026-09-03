import { API_BASE_URL } from './api';

export function calculateEscrowFees(amount: number, commissionPercent: number) {
  const platformFee =
    Math.round(amount * (commissionPercent / 100) * 100) / 100;
  const freelancerPayout = Math.round((amount - platformFee) * 100) / 100;
  return { platformFee, freelancerPayout, commissionPercent };
}

export async function fetchDefaultCommissionPercent(): Promise<number> {
  try {
    const res = await fetch(`${API_BASE_URL}/platform/commission-config`, {
      cache: 'no-store',
    });
    if (!res.ok) return 10;
    const data = (await res.json()) as { defaultCommissionPercentage?: number };
    return data.defaultCommissionPercentage ?? 10;
  } catch {
    return 10;
  }
}
