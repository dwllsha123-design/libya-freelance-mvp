'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useAuth } from '@/contexts/auth-context';
import { authenticatedRequest, getApiErrorMessage } from '@/lib/api';
import type { AppLocale } from '@/i18n/routing';
import { StatusBadge } from '@/components/admin/status-badge';

type PointsPackage = {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  points: number;
  bonusPoints: number;
  priceLyd: number;
  currency: string;
  isActive: boolean;
  sortOrder: number;
};

type FormState = {
  code: string;
  nameAr: string;
  nameEn: string;
  points: string;
  bonusPoints: string;
  priceLyd: string;
  sortOrder: string;
};

const empty: FormState = {
  code: '',
  nameAr: '',
  nameEn: '',
  points: '',
  bonusPoints: '0',
  priceLyd: '',
  sortOrder: '0',
};

export default function AdminPointPackagesPage() {
  const t = useTranslations('admin');
  const tCommon = useTranslations('common');
  const locale = useLocale() as AppLocale;
  const { accessToken } = useAuth();
  const [items, setItems] = useState<PointsPackage[]>([]);
  const [form, setForm] = useState<FormState>(empty);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!accessToken) return;
    const data = await authenticatedRequest<PointsPackage[]>(
      '/admin/points-packages?includeInactive=true',
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
      await authenticatedRequest('/admin/points-packages', accessToken, {
        method: 'POST',
        body: JSON.stringify({
          code: form.code.trim().toUpperCase(),
          nameAr: form.nameAr.trim(),
          nameEn: form.nameEn.trim(),
          points: Number(form.points),
          bonusPoints: Number(form.bonusPoints),
          priceLyd: Number(form.priceLyd),
          sortOrder: Number(form.sortOrder),
        }),
      });
      setForm(empty);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : getApiErrorMessage(locale));
    }
  }

  async function toggleActive(pkg: PointsPackage) {
    if (!accessToken) return;
    try {
      await authenticatedRequest(`/admin/points-packages/${pkg.id}`, accessToken, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !pkg.isActive }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : getApiErrorMessage(locale));
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('pointPackages')}</h1>
        <p className="text-sm text-on-surface-variant">{t('pointPackagesHint')}</p>
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
            ['points', t('pointsAmount')],
            ['bonusPoints', t('bonusPoints')],
            ['priceLyd', t('price')],
            ['sortOrder', 'Sort'],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="block text-xs">
            {label}
            <input
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
              value={form[key]}
              onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              required={key !== 'bonusPoints' && key !== 'sortOrder'}
            />
          </label>
        ))}
        <button type="submit" className="rounded bg-primary px-4 py-2 text-sm text-white">
          {t('add')}
        </button>
      </form>

      {loading ? (
        <p className="text-slate-500">{tCommon('loadingPage')}</p>
      ) : (
        <div className="space-y-2">
          {items.map((pkg) => (
            <div
              key={pkg.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-white p-4"
            >
              <div>
                <p className="font-medium">
                  {pkg.code} — {pkg.nameAr}
                </p>
                <p className="text-xs text-slate-500">
                  {pkg.points}+{pkg.bonusPoints} pts · {pkg.priceLyd} {pkg.currency}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge
                  label={pkg.isActive ? t('active') : t('inactive')}
                  tone={pkg.isActive ? 'success' : 'danger'}
                />
                <button
                  type="button"
                  className="text-sm text-primary underline"
                  onClick={() => void toggleActive(pkg)}
                >
                  {pkg.isActive ? t('deactivate') : t('activate')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
