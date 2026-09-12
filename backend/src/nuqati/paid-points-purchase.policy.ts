import { GoneException } from '@nestjs/common';

export const PAID_POINTS_PURCHASE_DISABLED = 'PAID_POINTS_PURCHASE_DISABLED';

/**
 * Paid Nuqati packages are not sold in the current commercial release.
 * Historical Points tables/ledger remain; rewards and admin grants still work.
 */
export function assertPaidPointsPurchaseEnabled(): never {
  throw new GoneException({
    statusCode: 410,
    code: PAID_POINTS_PURCHASE_DISABLED,
    message:
      'Paid points purchase is disabled. Platform payments are for freelancer subscriptions only.',
    messageAr:
      'شراء النقاط المدفوع غير متاح حالياً. الدفع الإلكتروني داخل المنصة مخصص لاشتراكات المستقلين فقط.',
  });
}
