'use client';

import { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Logo } from '@/components/brand/logo';
import {
  DESIGN_MARBLE_PATH,
  FACEBOOK_PAGE_URL,
  PLATFORM_FLAG,
} from '@/lib/branding';
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
    <footer className="relative mt-16 overflow-hidden border-t border-line/70 bg-cream-deep/40 sm:mt-24">
      <div
        className="howto-marble pointer-events-none absolute inset-x-0 top-0 h-40 bg-cover bg-center opacity-20"
        style={{
          backgroundImage: `url(${DESIGN_MARBLE_PATH})`,
          maskImage: 'linear-gradient(to bottom, black, transparent)',
          WebkitMaskImage: 'linear-gradient(to bottom, black, transparent)',
        }}
        aria-hidden
      />
      <div className="page-gutter relative mx-auto max-w-6xl py-10 sm:py-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-soft">
              {tBrand('tagline')}
            </p>
            <p className="mt-2 text-xs text-ink-soft/80">
              {PLATFORM_FLAG} {tCommon('forLibyanTalent')} — {tCommon('country')}
            </p>
            <div className="mt-4 flex items-center gap-2">
              <a
                href={FACEBOOK_PAGE_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t('facebookPage')}
                title={t('facebookPage')}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line bg-cream text-ink transition hover:border-[#1877F2] hover:bg-[#1877F2] hover:text-white"
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
              <h3 className="font-display text-sm font-semibold text-ink">{t('mobileApps')}</h3>
              <div className="mt-3">
                <StoreBadgePair config={appConfig} locale={locale} compact />
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-display text-sm font-semibold text-ink">{t('platform')}</h4>
            <ul className="mt-4 space-y-2.5">
              <li>
                <Link href="/projects" className="text-sm text-ink-soft transition-colors hover:text-ember">
                  {t('browseProjects')}
                </Link>
              </li>
              <li>
                <Link href="/freelancers" className="text-sm text-ink-soft transition-colors hover:text-ember">
                  {t('findFreelancers')}
                </Link>
              </li>
              <li>
                <Link href="/search" className="text-sm text-ink-soft transition-colors hover:text-ember">
                  {t('advancedSearch')}
                </Link>
              </li>
              <li>
                <Link
                  href="/register?role=CLIENT&next=/dashboard/projects/new"
                  className="text-sm text-ink-soft transition-colors hover:text-ember"
                >
                  {t('postProject')}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-display text-sm font-semibold text-ink">{t('resources')}</h4>
            <ul className="mt-4 space-y-2.5">
              <li>
                <Link href="/how-it-works" className="text-sm text-ink-soft transition-colors hover:text-ember">
                  {t('howItWorks')}
                </Link>
              </li>
              <li>
                <Link href="/escrow" className="text-sm text-ink-soft transition-colors hover:text-ember">
                  {t('escrow')}
                </Link>
              </li>
              <li>
                <Link href="/help" className="text-sm text-ink-soft transition-colors hover:text-ember">
                  {t('helpCenter')}
                </Link>
              </li>
              <li>
                <Link href="/sitemap" className="text-sm text-ink-soft transition-colors hover:text-ember">
                  {t('sitemap')}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-display text-sm font-semibold text-ink">{t('company')}</h4>
            <ul className="mt-4 space-y-2.5">
              <li>
                <Link href="/about" className="text-sm text-ink-soft transition-colors hover:text-ember">
                  {t('about')}
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-sm text-ink-soft transition-colors hover:text-ember">
                  {t('contact')}
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-sm text-ink-soft transition-colors hover:text-ember">
                  {t('privacy')}
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-sm text-ink-soft transition-colors hover:text-ember">
                  {t('terms')}
                </Link>
              </li>
            </ul>
            <h4 className="mt-6 font-display text-sm font-semibold text-ink">{t('libyanCities')}</h4>
            <ul className="mt-4 space-y-2.5">
              {LIBYAN_CITIES.slice(0, 4).map((city) => (
                <li key={city.slug}>
                  <Link
                    href={`/cities/${city.slug}`}
                    className="text-sm text-ink-soft transition-colors hover:text-ember"
                  >
                    {getLocalizedCityName(city, locale)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap gap-2 border-t border-line/70 pt-6">
          {MARKETPLACE_CATEGORIES.slice(0, 6).map((cat) => (
            <Link
              key={cat.slug}
              href={`/categories/${cat.slug}`}
              className="rounded-full border border-line bg-cream/70 px-3 py-1 text-xs text-ink-soft transition hover:border-ember/40 hover:text-ember"
            >
              {getLocalizedCategoryName(cat, locale)}
            </Link>
          ))}
        </div>
      </div>

      <div className="border-t border-line/70">
        <div className="page-gutter mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 py-5 text-xs text-ink-soft sm:flex-row">
          <span>
            © {new Date().getFullYear()} {tBrand('name')} — {t('copyright')} {PLATFORM_FLAG}
          </span>
        </div>
      </div>
    </footer>
  );
}
