import type { Metadata } from 'next';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';
import { MarketingPage } from '@/components/marketing/marketing-page';
import { getMarketingPageContent } from '@/lib/marketing-pages-i18n';
import { buildPageMetadata } from '@/lib/seo';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const content = getMarketingPageContent(locale as AppLocale).howItWorks;
  return buildPageMetadata({
    title: content.metaTitle,
    description: content.metaDescription,
    path: '/how-it-works',
  });
}

export default async function HowItWorksPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const content = getMarketingPageContent(locale as AppLocale).howItWorks;
  const t = await getTranslations('marketing');

  return (
    <MarketingPage title={content.title} subtitle={content.subtitle}>
      <p>{content.intro}</p>

      <h2>{content.clientHeading}</h2>
      <div className="not-prose space-y-4">
        {content.clientSteps.map((step, index) => (
          <div
            key={step.title}
            className="flex gap-4 rounded-xl border border-outline-variant/40 bg-surface p-5"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              {index + 1}
            </span>
            <div>
              <h3 className="font-semibold text-on-surface">{step.title}</h3>
              <p className="mt-1 text-sm text-on-surface-variant">{step.body}</p>
            </div>
          </div>
        ))}
      </div>

      <h2>{content.freelancerHeading}</h2>
      <div className="not-prose space-y-4">
        {content.freelancerSteps.map((step, index) => (
          <div
            key={step.title}
            className="flex gap-4 rounded-xl border border-outline-variant/40 bg-surface p-5"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-tertiary/10 text-sm font-bold text-tertiary">
              {index + 1}
            </span>
            <div>
              <h3 className="font-semibold text-on-surface">{step.title}</h3>
              <p className="mt-1 text-sm text-on-surface-variant">{step.body}</p>
            </div>
          </div>
        ))}
      </div>

      <h2>{content.verifiedHeading}</h2>
      <p>{content.verifiedIntro}</p>
      <ul className="list-disc space-y-2 ps-6">
        {content.verificationCriteria.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <h2>{content.currencyHeading}</h2>
      <p>
        {content.currencyBeforeLink}
        <Link href="/escrow">{content.currencyLinkLabel}</Link>
        {content.currencyAfterLink}
      </p>

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
