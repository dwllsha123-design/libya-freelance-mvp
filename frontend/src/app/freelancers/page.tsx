import type { Metadata } from 'next';
import { Suspense } from 'react';
import FreelancersPageClient from './freelancers-client';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'المستقلون في ليبيا',
  description:
    'تصفّح ملفات المستقلين الليبيين — تقييمات، مشاريع مكتملة، وشارات موثّقة. وظّف بالدينار الليبي.',
  path: '/freelancers',
});

export default function FreelancersPage() {  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">جاري التحميل...</div>}>
      <FreelancersPageClient />
    </Suspense>
  );
}
