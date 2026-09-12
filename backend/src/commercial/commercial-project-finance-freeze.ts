import { GoneException } from '@nestjs/common';

export const COMMERCIAL_PROJECT_FINANCE_FROZEN =
  'COMMERCIAL_PROJECT_FINANCE_FROZEN';

/**
 * Advertising / subscription marketplace: project commission, investor
 * settlement from project fees, and paid points package commerce are frozen.
 * Historical rows remain readable for audit.
 */
export function assertCommercialProjectFinanceWritable(): never {
  throw new GoneException({
    statusCode: 410,
    code: COMMERCIAL_PROJECT_FINANCE_FROZEN,
    message:
      'Project commission and investor settlement tools are frozen. Libyan Freelance monetizes freelancer subscriptions only.',
    messageAr:
      'أدوات عمولة المشاريع وتسويات المستثمرين مجمّدة. ليبي فريلانس تحقق الإيراد من اشتراكات المستقلين فقط.',
  });
}

export function zeroCommissionResolution(amount: number) {
  return {
    commissionPercent: 0,
    platformFee: 0,
    freelancerPayout: amount,
    source: 'PLATFORM_DEFAULT' as const,
    platformCommissionPolicyId: null as string | null,
    categoryCommissionOverrideId: null as string | null,
    projectCommissionOverrideId: null as string | null,
    minimumCommissionAmount: null as number | null,
    maximumCommissionAmount: null as number | null,
  };
}
