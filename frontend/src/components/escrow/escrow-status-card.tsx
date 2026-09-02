'use client';

import { useTranslations, useLocale } from 'next-intl';
import type { EscrowRecord } from '@/hooks/use-escrow';
import { formatCurrency } from '@/lib/currency';
import type { AppLocale } from '@/i18n/routing';

const STATUS_STYLES: Record<EscrowRecord['status'], string> = {
  PENDING_FUNDING: 'bg-amber-50 text-amber-800 border-amber-200',
  FUNDED: 'bg-blue-50 text-blue-800 border-blue-200',
  RELEASED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  REFUNDED: 'bg-slate-100 text-slate-700 border-slate-200',
  DISPUTED: 'bg-red-50 text-red-800 border-red-200',
};

const STATUS_KEYS: Record<EscrowRecord['status'], string> = {
  PENDING_FUNDING: 'statusPending',
  FUNDED: 'statusFunded',
  RELEASED: 'statusReleased',
  REFUNDED: 'statusRefunded',
  DISPUTED: 'statusDisputed',
};

export function EscrowStatusCard({ escrow }: { escrow: EscrowRecord }) {
  const t = useTranslations('escrow');
  const locale = useLocale() as AppLocale;

  return (
    <div className={`rounded-xl border p-4 ${STATUS_STYLES[escrow.status]}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold">{t('title')}</p>
        <span className="rounded-full bg-white/60 px-2 py-0.5 text-xs font-medium">
          {t(STATUS_KEYS[escrow.status])}
        </span>
      </div>
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-xs opacity-80">{t('amountHeld')}</dt>
          <dd className="font-semibold">{formatCurrency(escrow.amount, escrow.currency, locale)}</dd>
        </div>
        <div>
          <dt className="text-xs opacity-80">{t('platformFee')}</dt>
          <dd>{formatCurrency(escrow.platformFee, escrow.currency, locale)}</dd>
        </div>
        <div>
          <dt className="text-xs opacity-80">{t('freelancerPayout')}</dt>
          <dd>{formatCurrency(escrow.freelancerPayout, escrow.currency, locale)}</dd>
        </div>
      </dl>
      {escrow.dispute ? (
        <p className="mt-3 text-xs">{t('openDisputeLabel', { reason: escrow.dispute.reason })}</p>
      ) : null}
    </div>
  );
}
