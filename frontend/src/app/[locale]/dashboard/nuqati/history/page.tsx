'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useNuqatiApi } from '@/hooks/use-nuqati';
import type { NuqatiTransaction } from '@/lib/nuqati';
import type { AppLocale } from '@/i18n/routing';

export default function NuqatiHistoryPage() {
  const t = useTranslations('nuqati');
  const tCommon = useTranslations('common');
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const api = useNuqatiApi();
  const [items, setItems] = useState<NuqatiTransaction[]>([]);
  const [filter, setFilter] = useState<'all' | 'reward' | 'spend' | 'purchase'>('all');
  const [isLoading, setIsLoading] = useState(true);

  const numberLocale = locale === 'ar' ? 'ar-LY' : 'en-LY';

  const FILTERS = useMemo(
    () => [
      { key: 'all' as const, label: t('tabAll') },
      { key: 'reward' as const, label: t('tabRewards') },
      { key: 'spend' as const, label: t('tabSpent') },
      { key: 'purchase' as const, label: t('tabPurchases') },
    ],
    [t],
  );

  useEffect(() => {
    if (!authLoading && user && user.role !== 'FREELANCER') {
      router.replace('/dashboard');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user?.role !== 'FREELANCER') return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await api.listTransactions(filter === 'all' ? undefined : filter);
        if (!cancelled) setItems(res.items);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, api, filter]);

  function handleFilterChange(next: typeof filter) {
    setIsLoading(true);
    setFilter(next);
  }

  if (authLoading || !user) {
    return <div className="p-8 text-center text-slate-500">{tCommon('loadingPage')}</div>;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t('historyTitle', { brand: t('brand') })}</h1>
          <p className="mt-1 text-sm text-slate-600">{t('historySubtitle')}</p>
        </div>
        <Link href="/dashboard/nuqati" className="text-sm font-semibold text-primary hover:underline">
          {t('backToNuqati')}
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => handleFilterChange(f.key)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              filter === f.key ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mt-6 divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
        {isLoading ? (
          <p className="p-8 text-center text-slate-500">{tCommon('loadingPage')}</p>
        ) : items.length === 0 ? (
          <p className="p-8 text-center text-slate-500">{t('noMovements')}</p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="flex items-start justify-between gap-4 px-5 py-4">
              <div className="min-w-0">
                <p className="font-medium text-on-surface">{item.descriptionAr}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {item.reasonLabel} ·{' '}
                  {new Date(item.createdAt).toLocaleDateString(numberLocale, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
              </div>
              <span
                className={`shrink-0 text-sm font-bold ${
                  item.amount > 0 ? 'text-emerald-600' : 'text-red-600'
                }`}
              >
                {item.amount > 0 ? '+' : ''}
                {item.amount}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
