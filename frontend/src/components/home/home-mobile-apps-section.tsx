'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { apiRequest } from '@/lib/api';
import {
  StoreBadgePair,
  type PublicAppConfig,
} from '@/components/marketing/store-badges';
import type { AppLocale } from '@/i18n/routing';

export function HomeMobileAppsSection() {
  const t = useTranslations('home');
  const locale = useLocale() as AppLocale;
  const [config, setConfig] = useState<PublicAppConfig | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiRequest<PublicAppConfig>('/platform/app-config')
      .then((data) => {
        if (!cancelled) setConfig(data);
      })
      .catch(() => {
        if (!cancelled) {
          setConfig({
            iosAppStatus: 'COMING_SOON',
            androidAppStatus: 'COMING_SOON',
            iosStoreUrl: null,
            androidStoreUrl: null,
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="border-t border-outline-variant/30 bg-surface-container-low px-4 py-14">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-2xl font-bold text-on-surface sm:text-3xl">
          {t('mobileAppsTitle')}
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-on-surface-variant sm:text-base">
          {t('mobileAppsSubtitle')}
        </p>
        <div className="mt-8 flex justify-center">
          <StoreBadgePair config={config} locale={locale} />
        </div>
      </div>
    </section>
  );
}
