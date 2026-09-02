'use client';

import { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Logo } from '@/components/brand/logo';
import { FACEBOOK_PAGE_URL, PLATFORM_FLAG } from '@/lib/branding';
import { LIBYAN_CITIES, MARKETPLACE_CATEGORIES } from '@/lib/marketplace-content';
import { getLocalizedCategoryName, getLocalizedCityName } from '@/lib/locale-content';
import { apiRequest } from '@/lib/api';
import {
  StoreBadgePair,
  type PublicAppConfig,
} from '@/components/marketing/store-badges';
import type { AppLocale } from '@/i18n/routing';

export function SiteFooter() {
  const t = useTranslations('footer');
  const tBrand = useTranslations('brand');
  const tCommon = useTranslations('common');
  const locale = useLocale() as AppLocale;
  const [appConfig, setAppConfig] = useState<PublicAppConfig | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiRequest<PublicAppConfig>('/platform/app-config')
      .then((data) => {
        if (!cancelled) setAppConfig(data);
      })
      .catch(() => {
        if (!cancelled) {
          setAppConfig({
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
    <footer className="border-t border-outline-variant/40 bg-secondary text-white">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-sm">
            <Logo
              href="/"
              nameClassName="!text-white"
              iconClassName="rounded-lg bg-white p-0.5"
            />
            <p className="mt-3 text-sm text-slate-300">{tBrand('tagline')}</p>
            <p className="mt-2 text-xs text-slate-400">
              {PLATFORM_FLAG} {tCommon('forLibyanTalent')} — {tCommon('country')}
            </p>
            <div className="mt-4 flex items-center gap-2">
              <a
                href={FACEBOOK_PAGE_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t('facebookPage')}
                title={t('facebookPage')}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-[#1877F2] hover:text-white"
              >
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M22 12.07C22 6.48 17.52 2 11.93 2S1.86 6.48 1.86 12.07c0 5.02 3.66 9.18 8.44 9.93v-7.03H7.9v-2.9h2.4V9.86c0-2.37 1.41-3.68 3.57-3.68 1.03 0 2.12.18 2.12.18v2.33h-1.2c-1.18 0-1.55.73-1.55 1.48v1.78h2.64l-.42 2.9h-2.22V22c4.78-.75 8.44-4.91 8.44-9.93z" />
                </svg>
              </a>
            </div>
            <div className="mt-5">
              <h3 className="text-sm font-semibold">{t('mobileApps')}</h3>
              <div className="mt-3">
                <StoreBadgePair config={appConfig} locale={locale} compact />
              </div>
            </div>
          </div>

          <div className="grid flex-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <h3 className="text-sm font-semibold">{t('platform')}</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                <li><Link href="/projects" className="hover:text-white">{t('browseProjects')}</Link></li>
                <li><Link href="/freelancers" className="hover:text-white">{t('findFreelancers')}</Link></li>
                <li><Link href="/search" className="hover:text-white">{t('advancedSearch')}</Link></li>
                <li>
                  <Link href="/register?role=CLIENT&next=/dashboard/projects/new" className="hover:text-white">
                    {t('postProject')}
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold">{t('resources')}</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                <li><Link href="/how-it-works" className="hover:text-white">{t('howItWorks')}</Link></li>
                <li><Link href="/escrow" className="hover:text-white">{t('escrow')}</Link></li>
                <li><Link href="/help" className="hover:text-white">{t('helpCenter')}</Link></li>
                <li><Link href="/sitemap" className="hover:text-white">{t('sitemap')}</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold">{t('company')}</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                <li><Link href="/about" className="hover:text-white">{t('about')}</Link></li>
                <li><Link href="/contact" className="hover:text-white">{t('contact')}</Link></li>
                <li><Link href="/privacy" className="hover:text-white">{t('privacy')}</Link></li>
                <li><Link href="/terms" className="hover:text-white">{t('terms')}</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold">{t('libyanCities')}</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                {LIBYAN_CITIES.slice(0, 6).map((city) => (
                  <li key={city.slug}>
                    <Link href={`/cities/${city.slug}`} className="hover:text-white">
                      {getLocalizedCityName(city, locale)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        <div className="mt-8 flex flex-wrap gap-2 border-t border-white/10 pt-6">
          {MARKETPLACE_CATEGORIES.slice(0, 6).map((cat) => (
            <Link key={cat.slug} href={`/categories/${cat.slug}`} className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-300 hover:bg-white/20">
              {getLocalizedCategoryName(cat, locale)}
            </Link>
          ))}
        </div>
        <div className="mt-6 flex flex-col gap-3 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {tBrand('name')}. {t('copyright')} {PLATFORM_FLAG}</p>
          <p>{tCommon('paymentsInLyd')}</p>
        </div>
      </div>
    </footer>
  );
}
