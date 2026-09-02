'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import {
  PLATFORM_BOOLEAN_SETTING_KEYS,
  useAdminApi,
  type AdminPlatformSettingsBundle,
} from '@/hooks/use-admin';
import { AdminPageHeader, AdminPanel } from '@/components/admin/admin-layout-ui';
import { AdminConfirmDialog } from '@/components/admin/admin-ui';

const SETTING_LABEL_KEYS: Record<(typeof PLATFORM_BOOLEAN_SETTING_KEYS)[number], string> = {
  allowClientRegistration: 'flagClientReg',
  allowFreelancerRegistration: 'flagFreelancerReg',
  allowNewProjects: 'flagNewProjects',
  allowNewProposals: 'flagProposals',
  allowMessaging: 'flagMessaging',
  allowReviews: 'flagReviews',
  allowPortfolio: 'flagPortfolio',
  investorPortalEnabled: 'flagInvestorPortal',
};

export default function AdminSettingsPage() {
  const t = useTranslations('admin');
  const api = useAdminApi();
  const [bundle, setBundle] = useState<AdminPlatformSettingsBundle | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [platformName, setPlatformName] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [currency, setCurrency] = useState('LYD');
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [booleans, setBooleans] = useState<Record<string, boolean>>({});

  async function reload() {
    const data = await api.getSettings();
    setBundle(data);
    setPlatformName(String(data.settings.platformName ?? ''));
    setSupportEmail(String(data.settings.supportEmail ?? ''));
    setCurrency(String(data.settings.currency ?? 'LYD'));
    setMaintenanceMessage(String(data.settings.maintenanceMessage ?? ''));
    const next: Record<string, boolean> = {};
    for (const key of PLATFORM_BOOLEAN_SETTING_KEYS) {
      next[key] = Boolean(data.settings[key]);
    }
    setBooleans(next);
  }

  useEffect(() => {
    let cancelled = false;
    api
      .getSettings()
      .then((data) => {
        if (cancelled) return;
        setBundle(data);
        setPlatformName(String(data.settings.platformName ?? ''));
        setSupportEmail(String(data.settings.supportEmail ?? ''));
        setCurrency(String(data.settings.currency ?? 'LYD'));
        setMaintenanceMessage(String(data.settings.maintenanceMessage ?? ''));
        const next: Record<string, boolean> = {};
        for (const key of PLATFORM_BOOLEAN_SETTING_KEYS) {
          next[key] = Boolean(data.settings[key]);
        }
        setBooleans(next);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : t('settingsLoadFailed'));
      });
    return () => {
      cancelled = true;
    };
  }, [api, t]);

  async function saveSettings() {
    setError('');
    setSaving(true);
    try {
      await api.patchSettings({
        platformName,
        supportEmail,
        currency,
        maintenanceMessage,
        ...booleans,
      });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('settingsSaveFailed'));
    } finally {
      setSaving(false);
    }
  }

  async function saveGeneral(e: FormEvent) {
    e.preventDefault();
    await saveSettings();
  }

  async function toggleMaintenance() {
    if (!bundle) return;
    setSaving(true);
    setError('');
    try {
      await api.patchSettings({
        maintenanceEnabled: !bundle.maintenance.enabled,
        maintenanceMessage:
          maintenanceMessage || String(bundle.settings.maintenanceMessage ?? ''),
      });
      await reload();
      setConfirmOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('settingsSaveFailed'));
    } finally {
      setSaving(false);
    }
  }

  const maintenanceOn = Boolean(bundle?.maintenance.enabled);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={t('settings')}
        subtitle={t('settingsSubtitle')}
        actions={
          <Link
            href="/admin/settings/features"
            className="rounded-xl border px-3 py-2 text-sm hover:bg-slate-50"
          >
            {t('featureFlagsPage')}
          </Link>
        }
      />

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <AdminPanel title={t('settingsGeneral')}>
        {!bundle ? (
          <p className="text-sm text-slate-500">{t('loading')}</p>
        ) : (
          <form onSubmit={saveGeneral} className="space-y-4">
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">{t('settingsPlatformName')}</span>
              <input
                value={platformName}
                onChange={(e) => setPlatformName(e.target.value)}
                className="w-full rounded-xl border px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">{t('settingsSupportEmail')}</span>
              <input
                type="email"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                className="w-full rounded-xl border px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">{t('settingsCurrency')}</span>
              <input
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full max-w-xs rounded-xl border px-3 py-2"
              />
            </label>
            <p className="text-xs text-slate-500">
              <strong>{t('settingsNote')}</strong> {t('settingsNoteValue')}
            </p>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-on-surface px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? t('loading') : t('saveSettings')}
            </button>
          </form>
        )}
      </AdminPanel>

      <AdminPanel title={t('operationalToggles')}>
        <p className="mb-3 text-xs text-slate-500">{t('operationalTogglesHint')}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {PLATFORM_BOOLEAN_SETTING_KEYS.map((key) => (
            <label
              key={key}
              className="flex items-center justify-between rounded-xl border px-3 py-2 text-sm"
            >
              <span>{t(SETTING_LABEL_KEYS[key])}</span>
              <input
                type="checkbox"
                checked={Boolean(booleans[key])}
                onChange={(e) =>
                  setBooleans((prev) => ({ ...prev, [key]: e.target.checked }))
                }
              />
            </label>
          ))}
        </div>
        <button
          type="button"
          disabled={saving || !bundle}
          onClick={() => void saveSettings()}
          className="mt-4 rounded-xl border px-4 py-2 text-sm disabled:opacity-50"
        >
          {t('saveSettings')}
        </button>
      </AdminPanel>

      <AdminPanel title={t('maintenanceMode')}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1 space-y-2">
            <p className="font-medium">{t('maintenanceMode')}</p>
            <p className="text-sm text-slate-500">{t('maintenanceExplain')}</p>
            {bundle?.maintenance.active ? (
              <p className="text-sm font-medium text-amber-700">{t('maintenanceActiveNow')}</p>
            ) : null}
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">{t('maintenanceMessage')}</span>
              <input
                value={maintenanceMessage}
                onChange={(e) => setMaintenanceMessage(e.target.value)}
                className="w-full rounded-xl border px-3 py-2"
                placeholder={t('maintenanceMessagePlaceholder')}
              />
            </label>
          </div>
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            disabled={!bundle || saving}
            className={`rounded-xl px-5 py-3 text-sm font-semibold disabled:opacity-50 ${
              maintenanceOn
                ? 'bg-amber-500 text-white'
                : 'border border-slate-300 bg-white text-on-surface'
            }`}
          >
            {maintenanceOn ? t('maintenanceOn') : t('maintenanceOff')}
          </button>
        </div>
      </AdminPanel>

      <AdminConfirmDialog
        open={confirmOpen}
        title={t('maintenanceMode')}
        message={t('maintenanceExplain')}
        confirmLabel={t('confirmToggle')}
        isLoading={saving}
        onConfirm={() => void toggleMaintenance()}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
