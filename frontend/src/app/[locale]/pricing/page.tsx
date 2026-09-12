import type { Metadata } from 'next';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { PricingPageClient } from '@/components/pricing/pricing-page-client';
import { buildPageMetadata } from '@/lib/seo';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'pricing' });
  return buildPageMetadata({
    title: t('metaTitle'),
    description: t('metaDescription'),
    path: '/pricing',
    locale,
  });
}

export default async function PricingPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <PricingPageClient />;
}
