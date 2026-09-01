import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CategoryPageContent } from './category-page-content';
import { buildPageMetadata } from '@/lib/seo';
import {
  getCategoryBySlug,
  getCategorySeoTitle,
  MARKETPLACE_CATEGORIES,
} from '@/lib/marketplace-content';

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return MARKETPLACE_CATEGORIES.map((category) => ({ slug: category.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = getCategoryBySlug(slug);
  if (!category) return { title: 'تصنيف غير موجود' };

  return buildPageMetadata({
    title: getCategorySeoTitle(category.nameAr),
    description: category.description,
    path: `/categories/${category.slug}`,
  });
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const category = getCategoryBySlug(slug);
  if (!category) notFound();

  return <CategoryPageContent category={category} />;
}
