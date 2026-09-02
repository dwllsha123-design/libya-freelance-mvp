import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import FreelancersPageClient from './freelancers-client';
import { buildPageMetadata } from '@/lib/seo';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'freelancers' });

  return buildPageMetadata({
    title: t('metaTitle'),
    description: t('metaDescription'),
    path: '/freelancers',
  });
}

export default async function FreelancersPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'common' });

  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">{t('loadingPage')}</div>}>
      <FreelancersPageClient />
    </Suspense>
  );
}
