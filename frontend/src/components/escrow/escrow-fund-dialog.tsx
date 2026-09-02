'use client';

import { useTranslations, useLocale } from 'next-intl';
import { ConfirmDialog } from '@/components/projects/confirm-dialog';
import { usePaymentConfig } from '@/hooks/use-payment-config';
import { calculateEscrowFees, ESCROW_PLATFORM_FEE_PERCENT } from '@/lib/escrow-fees';
import { formatCurrency } from '@/lib/currency';
import { paymentModeLabel } from '@/lib/payment-config';
import type { AppLocale } from '@/i18n/routing';

export function EscrowFundDialog({
  open,
  proposedPrice,
  currency = 'LYD',
  isLoading,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  proposedPrice: number;
  currency?: string;
  isLoading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const t = useTranslations('escrow');
  const locale = useLocale() as AppLocale;
  const { config: paymentConfig } = usePaymentConfig();
  const { platformFee, freelancerPayout } = calculateEscrowFees(proposedPrice);

  return (
    <ConfirmDialog
      open={open}
      title={t('fundDialogTitle')}
      message={
        <div className="space-y-3 text-right text-sm">
          <p>{t('fundDialogBody')}</p>
          <div className="rounded-lg bg-surface-container-low p-3 text-on-surface">
            <p>
              <strong>{t('fundDialogHeld')}</strong>{' '}
              {formatCurrency(proposedPrice, currency, locale)}
            </p>
            <p className="mt-1 text-on-surface-variant">
              {t('fundDialogFee', { percent: ESCROW_PLATFORM_FEE_PERCENT })}{' '}
              {formatCurrency(platformFee, currency, locale)}
            </p>
            <p className="mt-1 text-on-surface-variant">
              {t('fundDialogPayout')} {formatCurrency(freelancerPayout, currency, locale)}
            </p>
          </div>
          <p className="text-xs text-amber-700">{paymentModeLabel(paymentConfig)}</p>
        </div>
      }
      confirmLabel={t('fundAndAccept')}
      isLoading={isLoading}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
