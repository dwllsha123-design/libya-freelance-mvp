import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

function imageRemotePatterns(): NonNullable<NextConfig['images']>['remotePatterns'] {
  const patterns: NonNullable<NextConfig['images']>['remotePatterns'] = [
    { protocol: 'http', hostname: 'localhost', port: '4000', pathname: '/uploads/**' },
    { protocol: 'https', hostname: 'localhost', port: '4000', pathname: '/uploads/**' },
  ];

  const origins = [
    process.env.NEXT_PUBLIC_MEDIA_ORIGIN,
    process.env.NEXT_PUBLIC_S3_PUBLIC_BASE_URL,
    process.env.S3_PUBLIC_BASE_URL,
  ]
    .filter(Boolean)
    .map((value) => value!.trim());

  const extraHosts = (process.env.NEXT_PUBLIC_IMAGE_HOSTS ?? '')
    .split(',')
    .map((host) => host.trim())
    .filter(Boolean);

  for (const origin of origins) {
    try {
      const url = new URL(origin);
      patterns.push({
        protocol: url.protocol.replace(':', '') as 'http' | 'https',
        hostname: url.hostname,
        port: url.port || undefined,
        pathname: '/**',
      });
    } catch {
      // ignore invalid URL at build time
    }
  }

  for (const hostname of extraHosts) {
    patterns.push({ protocol: 'https', hostname, pathname: '/**' });
    patterns.push({ protocol: 'http', hostname, pathname: '/**' });
  }

  return patterns;
}

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: imageRemotePatterns(),
  },
};

export default withNextIntl(nextConfig);
