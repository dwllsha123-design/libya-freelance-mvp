import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import ProjectDetailClient from './project-detail-client';

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, locale } = await params;
  const t = await getTranslations({ locale, namespace: 'projects' });
  const tBrand = await getTranslations({ locale, namespace: 'brand' });
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api'}/projects/slug/${slug}`,
      {
        headers: { 'X-Client-Request': 'libya-freelance' },
        next: { revalidate: 60 },
      },
    );

    if (!res.ok) {
      return { title: `${t('detailNotFound')} | ${tBrand('name')}` };
    }

    const project = await res.json();

    return {
      title: `${project.title} | ${tBrand('name')}`,
      description: project.description?.slice(0, 160),
      alternates: { canonical: `${baseUrl}/projects/${slug}` },
      openGraph: {
        title: project.title,
        description: project.description?.slice(0, 160),
        url: `${baseUrl}/projects/${slug}`,
        type: 'article',
      },
    };
  } catch {
    return { title: `${t('detailMetaFallback')} | ${tBrand('name')}` };
  }
}

export default async function ProjectDetailPage({ params }: Props) {
  const { slug } = await params;
  return <ProjectDetailClient slug={slug} />;
}
