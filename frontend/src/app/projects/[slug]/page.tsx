import type { Metadata } from 'next';
import ProjectDetailClient from './project-detail-client';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
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
      return { title: 'مشروع غير موجود | ليبيا فريلانس' };
    }

    const project = await res.json();

    return {
      title: `${project.title} | ليبيا فريلانس`,
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
    return { title: 'مشروع | ليبيا فريلانس' };
  }
}

export default async function ProjectDetailPage({ params }: Props) {
  const { slug } = await params;
  return <ProjectDetailClient slug={slug} />;
}
