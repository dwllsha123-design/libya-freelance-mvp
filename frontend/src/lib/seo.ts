import type { Metadata } from 'next';
import { PLATFORM_NAME_AR, PLATFORM_NAME_EN } from '@/lib/branding';
import type { AppLocale } from '@/i18n/routing';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://libyanfreelance.ly';

function normalizePath(path: string): string {
  if (!path || path === '/') return '';
  return path.startsWith('/') ? path : `/${path}`;
}

/** Locale-aware path: Arabic default has no prefix; English uses `/en`. */
export function localizedPath(locale: AppLocale | string, path: string): string {
  const normalized = normalizePath(path);
  if (locale === 'en') return `/en${normalized || ''}` || '/en';
  return normalized || '/';
}

export function buildPageMetadata({
  title,
  description,
  path,
  locale = 'ar',
}: {
  title: string;
  description: string;
  path: string;
  locale?: AppLocale | string;
}): Metadata {
  const brand = locale === 'en' ? PLATFORM_NAME_EN : PLATFORM_NAME_AR;
  const fullTitle = `${title} | ${brand}`;
  const canonicalPath = localizedPath(locale, path);
  const url = `${SITE_URL}${canonicalPath === '/' ? '' : canonicalPath}`;
  const arPath = localizedPath('ar', path);
  const enPath = localizedPath('en', path);

  return {
    title: fullTitle,
    description,
    alternates: {
      canonical: url,
      languages: {
        'ar-LY': `${SITE_URL}${arPath === '/' ? '' : arPath}`,
        en: `${SITE_URL}${enPath}`,
        'x-default': `${SITE_URL}${arPath === '/' ? '' : arPath}`,
      },
    },
    openGraph: {
      title: fullTitle,
      description,
      url,
      type: 'website',
      locale: locale === 'en' ? 'en' : 'ar_LY',
      alternateLocale: locale === 'en' ? ['ar_LY'] : ['en'],
      siteName: PLATFORM_NAME_EN,
    },
  };
}
