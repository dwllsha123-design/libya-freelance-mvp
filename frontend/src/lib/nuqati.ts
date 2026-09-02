import type { AppLocale } from '@/i18n/routing';

export const NUQATI_BRAND_AR = 'نقاطي';
export const NUQATI_BRAND_EN = 'Nuqati';

export function getNuqatiBrand(locale: AppLocale) {
  return locale === 'en' ? NUQATI_BRAND_EN : NUQATI_BRAND_AR;
}

export interface NuqatiTask {
  key: string;
  titleAr: string;
  descriptionAr: string;
  reward: number;
  maxProgress?: number;
  category: string;
  progress: number;
  completed: boolean;
}

export interface NuqatiDashboard {
  brand: string;
  balance: number;
  summary: {
    totalEarned: number;
    totalSpent: number;
    totalPurchased: number;
    totalRefunded: number;
  };
  earnedThisMonth: number;
  monthlyCap: number;
  proposalCost: number;
  packages: { id: string; points: number; priceLyd: number }[];
  tasks: NuqatiTask[];
  streak: {
    currentDays: number;
    lastApplicationDate: string | null;
    claimedMilestones: number[];
  };
}

export interface NuqatiTransaction {
  id: string;
  amount: number;
  type: string;
  reasonKey: string;
  reasonLabel: string;
  descriptionAr: string;
  referenceId: string | null;
  balanceAfter: number;
  createdAt: string;
}
