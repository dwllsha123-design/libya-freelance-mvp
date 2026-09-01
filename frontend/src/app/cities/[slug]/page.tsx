import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CityPageContent } from './city-page-content';
import { buildPageMetadata } from '@/lib/seo';
import { getCityBySlug, getCitySeoTitle, LIBYAN_CITIES } from '@/lib/marketplace-content';

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return LIBYAN_CITIES.map((city) => ({ slug: city.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const city = getCityBySlug(slug);
  if (!city) return { title: 'مدينة غير موجودة' };

  return buildPageMetadata({
    title: getCitySeoTitle(city.nameAr),
    description: city.description,
    path: `/cities/${city.slug}`,
  });
}

export default async function CityPage({ params }: Props) {
  const { slug } = await params;
  const city = getCityBySlug(slug);
  if (!city) notFound();

  return <CityPageContent city={city} />;
}
