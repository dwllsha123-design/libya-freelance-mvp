'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useAdminApi, type AdminPlatformSettingsBundle } from '@/hooks/use-admin';
import { AdminPageHeader, AdminPanel } from '@/components/admin/admin-layout-ui';

const FLAG_LABEL_KEYS: Record<string, string> = {
  MESSAGING: 'flagMessaging',
  PORTFOLIO: 'flagPortfolio',
  REVIEWS: 'flagReviews',
  INVESTOR_PORTAL: 'flagInvestorPortal',
  ESCROW: 'flagEscrow',
  PAYMENTS: 'flagPayments',
  SUBSCRIPTIONS: 'flagSubscriptions',
  AI_MATCHING: 'flagAiMatching',
};

export default function AdminFeatureFlagsPage() {
  const t = useTranslations('admin');
  const { user } = useAuth();
  const api = useAdminApi();
  const isOwner = user?.role === 'SUPER_ADMIN';
  const [bundle, setBundle] = useState<AdminPlatformSettingsBundle | null>(null);
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .getFeatureFlags()
      .then((data) => {
        if (cancelled) return;
        setBundle(data);
        setFlags({ ...data.flags });
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : t('settingsLoadFailed'));
      });
    return () => {
      cancelled = true;
    };
  }, [api, t]);

  async function save() {
    if (!isOwner) return;
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const data = await api.patchFeatureFlags(flags);
      setBundle(data);
      setFlags({ ...data.flags });
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('settingsSaveFailed'));
    } finally {
      setSaving(false);
    }
  }

  const keys = Object.keys(flags).sort();

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={t('featureFlags')}
        subtitle={t('featureFlagsSubtitle')}
        breadcrumb={
          <Link href="/admin/settings" className="text-primary hover:underline">
            ← {t('settings')}
          </Link>
        }
      />

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {!isOwner ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {t('superAdminOnlyAction')}
        </p>
      ) : null}

      <AdminPanel title={t('featureFlags')}>
        {!bundle ? (
          <p className="text-sm text-slate-500">{t('loading')}</p>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-2">
              {keys.map((key) => (
                <label
                  key={key}
                  className="flex items-center justify-between rounded-xl border px-3 py-2 text-sm"
                >
                  <span>{t(FLAG_LABEL_KEYS[key] ?? key)}</span>
                  <input
                    type="checkbox"
                    disabled={!isOwner}
                    checked={Boolean(flags[key])}
                    onChange={(e) =>
                      setFlags((prev) => ({ ...prev, [key]: e.target.checked }))
                    }
                  />
                </label>
              ))}
            </div>
            {isOwner ? (
              <button
                type="button"
                disabled={saving}
                onClick={() => void save()}
                className="rounded-xl bg-on-surface px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ? t('loading') : t('saveFeatureFlags')}
              </button>
            ) : null}
            {saved ? <p className="text-xs text-emerald-700">{t('settingsSaved')}</p> : null}
          </div>
        )}
      </AdminPanel>
    </div>
  );
}
