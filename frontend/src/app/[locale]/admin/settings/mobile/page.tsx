'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useAdminApi, type AdminPlatformSettingsBundle } from '@/hooks/use-admin';
import {
  AdminComingSoon,
  AdminPageHeader,
  AdminPanel,
} from '@/components/admin/admin-layout-ui';

const STATUSES = ['COMING_SOON', 'BETA', 'AVAILABLE', 'MAINTENANCE'] as const;
const MOBILE_FLAGS = [
  'MOBILE_ENABLED',
  'MOBILE_MESSAGING',
  'MOBILE_PORTFOLIO',
  'MOBILE_REVIEWS',
  'MOBILE_PAYMENTS',
  'MOBILE_AI_MATCHING',
] as const;

type Status = (typeof STATUSES)[number];

type MobileSettingsFormState = {
  iosAppStatus: Status;
  androidAppStatus: Status;
  iosLatestVersion: string;
  iosMinimumSupportedVersion: string;
  androidLatestVersion: string;
  androidMinimumSupportedVersion: string;
  iosStoreUrl: string;
  androidStoreUrl: string;
  mobileMaintenanceMessage: string;
  privacyPolicyUrl: string;
  termsUrl: string;
  supportUrl: string;
  flags: Record<string, boolean>;
};

function mapMobileSettings(data: AdminPlatformSettingsBundle): MobileSettingsFormState {
  const s = data.settings;
  const flags: Record<string, boolean> = {};
  for (const key of MOBILE_FLAGS) {
    flags[key] = Boolean(data.flags?.[key]);
  }
  return {
    iosAppStatus: (s.iosAppStatus as Status) || 'COMING_SOON',
    androidAppStatus: (s.androidAppStatus as Status) || 'COMING_SOON',
    iosLatestVersion: String(s.iosLatestVersion ?? ''),
    iosMinimumSupportedVersion: String(s.iosMinimumSupportedVersion ?? ''),
    androidLatestVersion: String(s.androidLatestVersion ?? ''),
    androidMinimumSupportedVersion: String(s.androidMinimumSupportedVersion ?? ''),
    iosStoreUrl: String(s.iosStoreUrl ?? ''),
    androidStoreUrl: String(s.androidStoreUrl ?? ''),
    mobileMaintenanceMessage: String(s.mobileMaintenanceMessage ?? ''),
    privacyPolicyUrl: String(s.privacyPolicyUrl ?? ''),
    termsUrl: String(s.termsUrl ?? ''),
    supportUrl: String(s.supportUrl ?? ''),
    flags,
  };
}

export default function AdminMobileSettingsPage() {
  const t = useTranslations('admin');
  const { user } = useAuth();
  const api = useAdminApi();
  const isOwner = user?.role === 'SUPER_ADMIN';

  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [iosAppStatus, setIosAppStatus] = useState<Status>('COMING_SOON');
  const [androidAppStatus, setAndroidAppStatus] = useState<Status>('COMING_SOON');
  const [iosLatestVersion, setIosLatestVersion] = useState('');
  const [iosMinimumSupportedVersion, setIosMinimumSupportedVersion] = useState('');
  const [androidLatestVersion, setAndroidLatestVersion] = useState('');
  const [androidMinimumSupportedVersion, setAndroidMinimumSupportedVersion] =
    useState('');
  const [iosStoreUrl, setIosStoreUrl] = useState('');
  const [androidStoreUrl, setAndroidStoreUrl] = useState('');
  const [mobileMaintenanceMessage, setMobileMaintenanceMessage] = useState('');
  const [privacyPolicyUrl, setPrivacyPolicyUrl] = useState('');
  const [termsUrl, setTermsUrl] = useState('');
  const [supportUrl, setSupportUrl] = useState('');
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  function hydrateForm(data: AdminPlatformSettingsBundle) {
    const mapped = mapMobileSettings(data);
    setIosAppStatus(mapped.iosAppStatus);
    setAndroidAppStatus(mapped.androidAppStatus);
    setIosLatestVersion(mapped.iosLatestVersion);
    setIosMinimumSupportedVersion(mapped.iosMinimumSupportedVersion);
    setAndroidLatestVersion(mapped.androidLatestVersion);
    setAndroidMinimumSupportedVersion(mapped.androidMinimumSupportedVersion);
    setIosStoreUrl(mapped.iosStoreUrl);
    setAndroidStoreUrl(mapped.androidStoreUrl);
    setMobileMaintenanceMessage(mapped.mobileMaintenanceMessage);
    setPrivacyPolicyUrl(mapped.privacyPolicyUrl);
    setTermsUrl(mapped.termsUrl);
    setSupportUrl(mapped.supportUrl);
    setFlags(mapped.flags);
  }

  async function reload() {
    const data = await api.getSettings();
    hydrateForm(data);
  }

  useEffect(() => {
    if (!isOwner) return;
    let cancelled = false;
    void (async () => {
      try {
        const data = await api.getSettings();
        if (!cancelled) hydrateForm(data);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : t('settingsLoadFailed'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api, isOwner, t]);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!isOwner) return;
    setSaving(true);
    setError('');
    try {
      await api.patchSettings({
        iosAppStatus,
        androidAppStatus,
        iosLatestVersion,
        iosMinimumSupportedVersion,
        androidLatestVersion,
        androidMinimumSupportedVersion,
        iosStoreUrl,
        androidStoreUrl,
        mobileMaintenanceMessage,
        privacyPolicyUrl,
        termsUrl,
        supportUrl,
      });
      await api.patchFeatureFlags(flags);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('settingsSaveFailed'));
    } finally {
      setSaving(false);
    }
  }

  if (!isOwner) {
    return (
      <AdminComingSoon
        title={t('superAdminOnlyAction')}
        description={t('mobileSettingsOwnerOnly')}
      />
    );
  }

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500">{t('loading')}</div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <AdminPageHeader
        title={t('mobileSettingsTitle')}
        subtitle={t('mobileSettingsSubtitle')}
        actions={
          <Link href="/admin/settings" className="text-sm text-primary">
            {t('settings')}
          </Link>
        }
      />
      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <form onSubmit={(e) => void onSave(e)} className="space-y-4">
        <AdminPanel title={t('mobileStoreStatus')}>
          <p className="mb-3 text-xs text-slate-500">{t('mobileNoSecretsHint')}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block">{t('iosAppStatus')}</span>
              <select
                value={iosAppStatus}
                onChange={(e) => setIosAppStatus(e.target.value as Status)}
                className="w-full rounded-xl border px-3 py-2"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block">{t('androidAppStatus')}</span>
              <select
                value={androidAppStatus}
                onChange={(e) => setAndroidAppStatus(e.target.value as Status)}
                className="w-full rounded-xl border px-3 py-2"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block">{t('iosLatestVersion')}</span>
              <input
                value={iosLatestVersion}
                onChange={(e) => setIosLatestVersion(e.target.value)}
                className="w-full rounded-xl border px-3 py-2"
                placeholder="1.0.0"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block">{t('iosMinimumVersion')}</span>
              <input
                value={iosMinimumSupportedVersion}
                onChange={(e) => setIosMinimumSupportedVersion(e.target.value)}
                className="w-full rounded-xl border px-3 py-2"
                placeholder="1.0.0"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block">{t('androidLatestVersion')}</span>
              <input
                value={androidLatestVersion}
                onChange={(e) => setAndroidLatestVersion(e.target.value)}
                className="w-full rounded-xl border px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block">{t('androidMinimumVersion')}</span>
              <input
                value={androidMinimumSupportedVersion}
                onChange={(e) =>
                  setAndroidMinimumSupportedVersion(e.target.value)
                }
                className="w-full rounded-xl border px-3 py-2"
              />
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="mb-1 block">{t('iosStoreUrl')}</span>
              <input
                value={iosStoreUrl}
                onChange={(e) => setIosStoreUrl(e.target.value)}
                className="w-full rounded-xl border px-3 py-2"
                dir="ltr"
                placeholder="https://apps.apple.com/…"
              />
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="mb-1 block">{t('androidStoreUrl')}</span>
              <input
                value={androidStoreUrl}
                onChange={(e) => setAndroidStoreUrl(e.target.value)}
                className="w-full rounded-xl border px-3 py-2"
                dir="ltr"
                placeholder="https://play.google.com/…"
              />
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="mb-1 block">{t('mobileMaintenanceMessage')}</span>
              <textarea
                value={mobileMaintenanceMessage}
                onChange={(e) => setMobileMaintenanceMessage(e.target.value)}
                className="w-full rounded-xl border px-3 py-2"
                rows={2}
              />
            </label>
          </div>
        </AdminPanel>

        <AdminPanel title={t('mobileLegalUrls')}>
          <div className="grid gap-3">
            <label className="text-sm">
              <span className="mb-1 block">{t('privacyPolicyUrl')}</span>
              <input
                value={privacyPolicyUrl}
                onChange={(e) => setPrivacyPolicyUrl(e.target.value)}
                className="w-full rounded-xl border px-3 py-2"
                dir="ltr"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block">{t('termsUrl')}</span>
              <input
                value={termsUrl}
                onChange={(e) => setTermsUrl(e.target.value)}
                className="w-full rounded-xl border px-3 py-2"
                dir="ltr"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block">{t('supportUrl')}</span>
              <input
                value={supportUrl}
                onChange={(e) => setSupportUrl(e.target.value)}
                className="w-full rounded-xl border px-3 py-2"
                dir="ltr"
              />
            </label>
          </div>
        </AdminPanel>

        <AdminPanel title={t('mobileFeatureFlags')}>
          <div className="space-y-2">
            {MOBILE_FLAGS.map((key) => (
              <label key={key} className="flex items-center justify-between gap-3 text-sm">
                <span className="font-mono text-xs">{key}</span>
                <input
                  type="checkbox"
                  checked={Boolean(flags[key])}
                  onChange={(e) =>
                    setFlags((prev) => ({ ...prev, [key]: e.target.checked }))
                  }
                />
              </label>
            ))}
          </div>
        </AdminPanel>

        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-on-surface px-5 py-2.5 text-sm text-white disabled:opacity-60"
        >
          {saving ? t('saving') : t('saveMobileSettings')}
        </button>
      </form>
    </div>
  );
}
