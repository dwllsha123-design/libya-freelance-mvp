import type { Metadata } from 'next';
import { PLATFORM_NAME_AR } from '@/lib/branding';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export function buildPageMetadata({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  const fullTitle = `${title} | ${PLATFORM_NAME_AR}`;
  const url = `${SITE_URL}${path}`;

  return {
    title: fullTitle,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: fullTitle,
      description,
      url,
      type: 'website',
      locale: 'ar_LY',
    },
  };
}
