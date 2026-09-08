'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { AdminPageHeader, AdminPanel } from '@/components/admin/admin-layout-ui';
import { useLaunchApi } from '@/hooks/use-launch';
import type { LaunchAdminOverview } from '@/lib/launch';
import type { AppLocale } from '@/i18n/routing';

export default function AdminLaunchProgramPage() {
  const t = useTranslations('launch');
  const tCommon = useTranslations('common');
  const locale = useLocale() as AppLocale;
  const numberLocale = locale === 'ar' ? 'ar-LY' : 'en-LY';
  const api = useLaunchApi();
  const [data, setData] = useState<LaunchAdminOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void api
      .getAdminOverview()
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {
        if (!cancelled) setError(t('loadFailed'));
      });
    return () => {
      cancelled = true;
    };
  }, [api, t]);

  if (error) {
    return <div className="p-8 text-center text-red-600">{error}</div>;
  }

  if (!data) {
    return <div className="p-8 text-center">{tCommon('loadingPage')}</div>;
  }

  const rows: { label: string; value: string }[] = [
    {
      label: t('adminEnabled'),
      value: data.enabled ? t('adminYes') : t('adminNo'),
    },
    {
      label: t('adminWelcomePoints'),
      value: data.welcomePoints.toLocaleString(numberLocale),
    },
    {
      label: t('adminProfileReward'),
      value: data.profileCompletionReward.toLocaleString(numberLocale),
    },
    {
      label: t('adminProfileThreshold'),
      value: `${data.profileCompletionThreshold}%`,
    },
    {
      label: t('adminCommission'),
      value: String(data.freelancerCommissionPercent),
    },
    {
      label: t('adminFoundingLimit'),
      value: data.foundingFreelancerLimit.toLocaleString(numberLocale),
    },
    {
      label: t('adminFoundingCount'),
      value: data.foundingPermanentCount.toLocaleString(numberLocale),
    },
    {
      label: t('adminSlotsRemaining'),
      value: data.slotsRemaining.toLocaleString(numberLocale),
    },
    {
      label: t('adminPaymentProtection'),
      value: data.paymentProtectionActive
        ? t('adminYes')
        : t('adminPaymentComingSoon'),
    },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader title={t('adminTitle')} />
      <p className="text-sm text-on-surface-variant">{t('adminSubtitle')}</p>

      <AdminPanel title={t('adminTitle')}>
        <dl className="grid gap-3 sm:grid-cols-2">
          {rows.map((row) => (
            <div
              key={row.label}
              className="rounded-xl border border-outline-variant/40 bg-surface-container-low/40 px-4 py-3"
            >
              <dt className="text-xs font-medium text-on-surface-variant">{row.label}</dt>
              <dd className="mt-1 text-sm font-semibold text-on-surface">{row.value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-xs text-on-surface-variant">{t('paymentDisclaimer')}</p>
      </AdminPanel>
    </div>
  );
}
