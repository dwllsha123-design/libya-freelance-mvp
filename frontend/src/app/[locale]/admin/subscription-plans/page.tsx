'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useAuth } from '@/contexts/auth-context';
import { authenticatedRequest, getApiErrorMessage } from '@/lib/api';
import type { AppLocale } from '@/i18n/routing';
import type { SubscriptionPlan } from '@/lib/subscriptions';
import { StatusBadge } from '@/components/admin/status-badge';

type PlanForm = {
  code: string;
  nameAr: string;
  nameEn: string;
  price: string;
  durationDays: string;
  proposalQuotaMonthly: string;
  monthlyPointsGrant: string;
  portfolioItemLimit: string;
  sortOrder: string;
};

const emptyForm: PlanForm = {
  code: '',
  nameAr: '',
  nameEn: '',
  price: '',
  durationDays: '30',
  proposalQuotaMonthly: '20',
  monthlyPointsGrant: '0',
  portfolioItemLimit: '20',
  sortOrder: '0',
};

export default function AdminSubscriptionPlansPage() {
  const t = useTranslations('admin');
  const tCommon = useTranslations('common');
  const locale = useLocale() as AppLocale;
  const { accessToken } = useAuth();
  const [items, setItems] = useState<SubscriptionPlan[]>([]);
  const [form, setForm] = useState<PlanForm>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!accessToken) return;
    const data = await authenticatedRequest<SubscriptionPlan[]>(
      '/admin/subscription-plans?includeInactive=true',
      accessToken,
    );
    setItems(data);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        await load();
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : getApiErrorMessage(locale));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!accessToken) return;
    setError(null);
    try {
      await authenticatedRequest('/admin/subscription-plans', accessToken, {
        method: 'POST',
        body: JSON.stringify({
          code: form.code.trim().toUpperCase(),
          nameAr: form.nameAr.trim(),
          nameEn: form.nameEn.trim(),
          price: Number(form.price),
          durationDays: Number(form.durationDays),
          proposalQuotaMonthly: Number(form.proposalQuotaMonthly),
          monthlyPointsGrant: Number(form.monthlyPointsGrant),
          portfolioItemLimit: Number(form.portfolioItemLimit),
          sortOrder: Number(form.sortOrder),
        }),
      });
      setForm(emptyForm);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : getApiErrorMessage(locale));
    }
  }

  async function toggleActive(plan: SubscriptionPlan) {
    if (!accessToken) return;
    setError(null);
    try {
      await authenticatedRequest(`/admin/subscription-plans/${plan.id}`, accessToken, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !plan.isActive }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : getApiErrorMessage(locale));
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('subscriptionPlans')}</h1>
        <p className="text-sm text-on-surface-variant">{t('subscriptionPlansHint')}</p>
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <form
        onSubmit={(e) => void onCreate(e)}
        className="grid gap-2 rounded-xl border bg-white p-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {(
          [
            ['code', 'Code'],
            ['nameAr', t('nameAr')],
            ['nameEn', 'Name EN'],
            ['price', t('price')],
            ['durationDays', 'Days'],
            ['proposalQuotaMonthly', t('proposalQuota')],
            ['monthlyPointsGrant', t('monthlyPoints')],
            ['portfolioItemLimit', 'Portfolio limit'],
            ['sortOrder', 'Sort'],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="block text-xs">
            {label}
            <input
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
              value={form[key]}
              onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              required={key === 'code' || key === 'nameAr' || key === 'nameEn' || key === 'price'}
            />
          </label>
        ))}
        <button type="submit" className="rounded bg-primary px-4 py-2 text-sm text-white sm:col-span-2">
          {t('add')}
        </button>
      </form>

      {loading ? (
        <p className="text-slate-500">{tCommon('loadingPage')}</p>
      ) : (
        <div className="space-y-2">
          {items.map((plan) => (
            <div
              key={plan.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-white p-4"
            >
              <div>
                <p className="font-medium">
                  {plan.code} — {plan.nameAr} / {plan.nameEn}
                </p>
                <p className="text-xs text-slate-500">
                  {plan.price} {plan.currency} · {plan.proposalQuotaMonthly} proposals ·{' '}
                  {plan.durationDays}d
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge
                  label={plan.isActive ? t('active') : t('inactive')}
                  tone={plan.isActive ? 'success' : 'danger'}
                />
                <button
                  type="button"
                  className="text-sm text-primary underline"
                  onClick={() => void toggleActive(plan)}
                >
                  {plan.isActive ? t('deactivate') : t('activate')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
