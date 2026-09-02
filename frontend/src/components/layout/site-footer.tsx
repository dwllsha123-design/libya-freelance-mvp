'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Logo } from '@/components/brand/logo';
import { PLATFORM_FLAG } from '@/lib/branding';
import { LIBYAN_CITIES, MARKETPLACE_CATEGORIES } from '@/lib/marketplace-content';
import { getLocalizedCategoryName, getLocalizedCityName } from '@/lib/locale-content';
import { useLocale } from 'next-intl';
import type { AppLocale } from '@/i18n/routing';

export function SiteFooter() {
  const t = useTranslations('footer');
  const tBrand = useTranslations('brand');
  const tCommon = useTranslations('common');
  const locale = useLocale() as AppLocale;

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
          </div>

          <div className="grid flex-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <h3 className="text-sm font-semibold">{t('platform')}</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                <li><Link href="/projects" className="hover:text-white">{t('browseProjects')}</Link></li>
                <li><Link href="/freelancers" className="hover:text-white">{t('findFreelancers')}</Link></li>
                <li><Link href="/search" className="hover:text-white">{t('advancedSearch')}</Link></li>
                <li>
                  <Link
                    href="/register?role=CLIENT&next=/dashboard/projects/new"
                    className="hover:text-white"
                  >
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
            <Link
              key={cat.slug}
              href={`/categories/${cat.slug}`}
              className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-300 hover:bg-white/20"
            >
              {getLocalizedCategoryName(cat, locale)}
            </Link>
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-3 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {tBrand('name')}. {t('copyright')} {PLATFORM_FLAG}
          </p>
          <p>{tCommon('paymentsInLyd')}</p>
        </div>
      </div>
    </footer>
  );
}
