import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';
import { MarketingPage } from '@/components/marketing/marketing-page';
import { getLocalizedCityName } from '@/lib/locale-content';
import { getMarketingPageContent } from '@/lib/marketing-pages-i18n';
import { LIBYAN_CITIES } from '@/lib/marketplace-content';
import { buildPageMetadata } from '@/lib/seo';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const content = getMarketingPageContent(locale as AppLocale).about;
  return buildPageMetadata({
    title: content.metaTitle,
    description: content.metaDescription,
    path: '/about',
  });
}

export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const content = getMarketingPageContent(locale as AppLocale).about;
  const t = await getTranslations('marketing');

  return (
    <MarketingPage title={content.title} subtitle={content.subtitle}>
      <p className="text-lg">{content.intro}</p>

      <h2>{content.missionHeading}</h2>
      <p>{content.missionBody}</p>

      <h2>{content.whyLibyanHeading}</h2>
      <p>{content.whyLibyanBody}</p>

      <h2>{content.citiesHeading}</h2>
      <p>{content.citiesBody}</p>
      <div className="not-prose flex flex-wrap gap-2">
        {LIBYAN_CITIES.map((city) => (
          <Link
            key={city.slug}
            href={`/cities/${city.slug}`}
            className="rounded-full border border-outline-variant/50 px-3 py-1.5 text-sm text-on-surface-variant hover:border-primary hover:text-primary"
          >
            {getLocalizedCityName(city, locale as AppLocale)}
          </Link>
        ))}
      </div>

      <h2>{content.visionHeading}</h2>
      <p>{content.visionBody}</p>

      <h2>{content.valuesHeading}</h2>
      <ul className="list-disc space-y-2 ps-6">
        {content.values.map((value) => (
          <li key={value.title}>
            <strong>{value.title}</strong> {value.body}
          </li>
        ))}
      </ul>

      <h2>{content.offeringsHeading}</h2>
      <ul className="list-disc space-y-2 ps-6">
        {content.offerings.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <div className="not-prose mt-8 flex flex-wrap gap-4">
        <Link
          href="/register?role=CLIENT&next=/dashboard/projects/new"
          className="rounded-full bg-ember px-6 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_-8px_rgba(234,88,12,0.55)] transition hover:bg-ember-deep"
        >
          {t('postProjectCta')}
        </Link>
        <Link
          href="/register?role=FREELANCER"
          className="rounded-full border border-line bg-cream px-6 py-2.5 text-sm font-semibold text-ink transition hover:border-ink hover:bg-cream-deep"
        >
          {t('joinFreelancerCta')}
        </Link>
      </div>
    </MarketingPage>
  );
}
