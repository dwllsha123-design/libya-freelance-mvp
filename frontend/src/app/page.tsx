import type { Metadata } from 'next';
import { HomeLanding } from '@/components/home/home-landing';
import { PLATFORM_NAME_AR, PLATFORM_TAGLINE_AR } from '@/lib/branding';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: `${PLATFORM_NAME_AR} — ${PLATFORM_TAGLINE_AR}`,
  description:
    'سوق العمل الحر الليبي. وظّف مستقلين من طرابلس وبنغازي ومصراتة — برمجة، تصميم، تسويق — بميزانيات بالدينار الليبي (د.ل). تصفح بدون حساب.',
  path: '/',
});

export default function HomePage() {
  return <HomeLanding />;
}
