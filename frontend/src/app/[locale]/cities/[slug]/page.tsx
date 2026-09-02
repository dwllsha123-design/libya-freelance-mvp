import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { CityPageContent } from './city-page-content';
import { buildPageMetadata } from '@/lib/seo';
import { getCityBySlug, getCitySeoTitle, LIBYAN_CITIES } from '@/lib/marketplace-content';
import { getLocalizedCityName, getLocalizedDescription } from '@/lib/locale-content';
import type { AppLocale } from '@/i18n/routing';

type Props = { params: Promise<{ locale: string; slug: string }> };

export function generateStaticParams() {
  return LIBYAN_CITIES.map((city) => ({ slug: city.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, locale } = await params;
  const appLocale = locale as AppLocale;
  const city = getCityBySlug(slug);
  const t = await getTranslations({ locale, namespace: 'common' });

  if (!city) return { title: t('notFound') };

  const name = getLocalizedCityName(city, appLocale);

  return buildPageMetadata({
    title: getCitySeoTitle(name, appLocale),
    description: getLocalizedDescription(city, appLocale),
    path: `/cities/${city.slug}`,
  });
}

export default async function CityPage({ params }: Props) {
  const { slug } = await params;
  const city = getCityBySlug(slug);
  if (!city) notFound();

  return <CityPageContent city={city} />;
}
