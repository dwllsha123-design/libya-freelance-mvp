import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://libyanfreelance.ly';

/** Public marketing & marketplace routes (Arabic = default unprefixed). */
const PATHS = [
  '',
  '/projects',
  '/freelancers',
  '/how-it-works',
  '/help',
  '/escrow',
  '/about',
  '/contact',
  '/privacy',
  '/terms',
  '/sitemap',
  '/auth/login',
  '/auth/register',
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return PATHS.flatMap((path) => {
    const arUrl = `${SITE_URL}${path || '/'}`;
    const enUrl = `${SITE_URL}/en${path}`;

    return [
      {
        url: arUrl,
        lastModified,
        changeFrequency: path === '' ? 'daily' : 'weekly',
        priority: path === '' ? 1 : 0.7,
        alternates: {
          languages: {
            'ar-LY': arUrl,
            en: enUrl,
            'x-default': arUrl,
          },
        },
      },
      {
        url: enUrl,
        lastModified,
        changeFrequency: path === '' ? 'daily' : 'weekly',
        priority: path === '' ? 0.9 : 0.6,
        alternates: {
          languages: {
            'ar-LY': arUrl,
            en: enUrl,
            'x-default': arUrl,
          },
        },
      },
    ];
  });
}
