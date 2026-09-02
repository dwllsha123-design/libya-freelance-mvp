import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { CategoryPageContent } from './category-page-content';
import { buildPageMetadata } from '@/lib/seo';
import {
  getCategoryBySlug,
  getCategorySeoTitle,
  MARKETPLACE_CATEGORIES,
} from '@/lib/marketplace-content';
import { getLocalizedCategoryName, getLocalizedDescription } from '@/lib/locale-content';
import type { AppLocale } from '@/i18n/routing';

type Props = { params: Promise<{ locale: string; slug: string }> };

export function generateStaticParams() {
  return MARKETPLACE_CATEGORIES.map((category) => ({ slug: category.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, locale } = await params;
  const appLocale = locale as AppLocale;
  const category = getCategoryBySlug(slug);
  const t = await getTranslations({ locale, namespace: 'common' });

  if (!category) return { title: t('notFound') };

  const name = getLocalizedCategoryName(category, appLocale);

  return buildPageMetadata({
    title: getCategorySeoTitle(name, appLocale),
    description: getLocalizedDescription(category, appLocale),
    path: `/categories/${category.slug}`,
  });
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const category = getCategoryBySlug(slug);
  if (!category) notFound();

  return <CategoryPageContent category={category} />;
}
