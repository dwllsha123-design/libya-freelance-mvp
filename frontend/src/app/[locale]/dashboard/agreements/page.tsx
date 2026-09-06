'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { BackLink } from '@/components/ui/back-link';
import { useAuth } from '@/contexts/auth-context';
import { useAgreementsApi } from '@/hooks/use-agreements';
import { formatCurrency } from '@/lib/currency';
import { useLocale } from 'next-intl';
import type { AppLocale } from '@/i18n/routing';

type ListItem = {
  id: string;
  status: string;
  project: { id: string; title: string; slug: string };
  currentVersion: {
    versionNumber: number;
    grossAmount: number;
    currency: string;
  } | null;
  role: string;
  updatedAt: string;
};

export default function AgreementsListPage() {
  const t = useTranslations('agreements');
  const tCommon = useTranslations('common');
  const tDashboard = useTranslations('dashboard');
  const locale = useLocale() as AppLocale;
  const { user, isLoading: authLoading } = useAuth();
  const api = useAgreementsApi();
  const [items, setItems] = useState<ListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user) return;

    let cancelled = false;
    (async () => {
      try {
        const data = (await api.listMine()) as ListItem[];
        if (!cancelled) setItems(data);
      } catch {
        if (!cancelled) setError(t('loadFailed'));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user, api, t]);

  if (authLoading || (user && isLoading)) {
    return <div className="p-8 text-center">{tCommon('loadingPage')}</div>;
  }

  if (!user) {
    return <div className="p-8 text-center">{tDashboard('unauthorized')}</div>;
  }

  return (
    <div className="page-gutter mx-auto max-w-3xl py-8 sm:py-10">
      <BackLink href="/dashboard">{tDashboard('title')}</BackLink>
      <h1 className="mt-4 text-2xl font-bold">{t('listTitle')}</h1>
      {error ? <p className="mt-4 text-red-600">{error}</p> : null}
      {!error && items.length === 0 ? (
        <p className="mt-8 text-on-surface-variant">{t('empty')}</p>
      ) : null}
      <div className="mt-6 space-y-3">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/dashboard/agreements/${item.id}`}
            className="block rounded-xl border border-outline-variant/40 bg-surface p-4 hover:bg-surface-container/40"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">{item.project.title}</p>
              <span className="text-xs text-on-surface-variant">
                {t(`statuses.${item.status}` as 'statuses.PENDING_APPROVAL')}
              </span>
            </div>
            <p className="mt-1 text-sm text-on-surface-variant">
              {item.currentVersion
                ? `${t('version', { number: item.currentVersion.versionNumber })} · ${formatCurrency(item.currentVersion.grossAmount, item.currentVersion.currency, locale)}`
                : t('openAgreement')}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
