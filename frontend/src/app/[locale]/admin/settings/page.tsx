'use client';

import { useLocale, useTranslations } from 'next-intl';
import { PLATFORM_NAME_AR, PLATFORM_NAME_EN, PLATFORM_TAGLINE_AR } from '@/lib/branding';
import type { AppLocale } from '@/i18n/routing';

export default function AdminSettingsPage() {
  const t = useTranslations('admin');
  const locale = useLocale() as AppLocale;
  const platformName = locale === 'en' ? PLATFORM_NAME_EN : PLATFORM_NAME_AR;

  return (
    <div className="rounded-xl border bg-white p-6">
      <h1 className="text-2xl font-bold">{t('settings')}</h1>
      <div className="mt-6 space-y-3 text-sm text-slate-700">
        <p><strong>{t('settingsPlatformName')}</strong> {platformName}</p>
        <p><strong>{t('settingsTagline')}</strong> {PLATFORM_TAGLINE_AR}</p>
        <p><strong>{t('settingsStatus')}</strong> {t('settingsStatusValue')}</p>
        <p><strong>{t('settingsNote')}</strong> {t('settingsNoteValue')}</p>
        <p><strong>{t('settingsPolicy')}</strong> {t('settingsPolicyValue')}</p>
      </div>
    </div>
  );
}
