import { setRequestLocale } from 'next-intl/server';
import { HomeLanding } from '@/components/home/home-landing';

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <HomeLanding />;
}
