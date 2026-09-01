'use client';

import { ConfirmDialog } from '@/components/projects/confirm-dialog';
import { usePaymentConfig } from '@/hooks/use-payment-config';
import { calculateEscrowFees, ESCROW_PLATFORM_FEE_PERCENT } from '@/lib/escrow-fees';
import { formatCurrency } from '@/lib/currency';
import { paymentModeLabel } from '@/lib/payment-config';

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
  const { config: paymentConfig } = usePaymentConfig();
  const { platformFee, freelancerPayout } = calculateEscrowFees(proposedPrice);

  return (
    <ConfirmDialog
      open={open}
      title="تمويل الضمان وقبول العرض"
      message={
        <div className="space-y-3 text-right text-sm">
          <p>
            سيتم حجز مبلغ العرض في الضمان قبل بدء العمل. عند إتمام المشروع يُحرَّر المبلغ
            للمستقل.
          </p>
          <div className="rounded-lg bg-surface-container-low p-3 text-on-surface">
            <p>
              <strong>المبلغ المحجوز:</strong> {formatCurrency(proposedPrice, currency)}
            </p>
            <p className="mt-1 text-on-surface-variant">
              عمولة المنصة ({ESCROW_PLATFORM_FEE_PERCENT}%):{' '}
              {formatCurrency(platformFee, currency)}
            </p>
            <p className="mt-1 text-on-surface-variant">
              صافي المستقل: {formatCurrency(freelancerPayout, currency)}
            </p>
          </div>
          <p className="text-xs text-amber-700">{paymentModeLabel(paymentConfig)}</p>
        </div>
      }
      confirmLabel="تمويل وقبول"
      isLoading={isLoading}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
