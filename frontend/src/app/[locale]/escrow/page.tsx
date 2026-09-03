import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';
import { MarketingPage } from '@/components/marketing/marketing-page';
import { getMarketingPageContent } from '@/lib/marketing-pages-i18n';

type Props = { params: Promise<{ locale: string }> };

export default async function EscrowPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const content = getMarketingPageContent(locale as AppLocale).escrow;
  const t = await getTranslations('marketing');

  return (
    <MarketingPage title={content.title} subtitle={content.subtitle}>
      <p>{content.intro}</p>

      <h2>{content.howHeading}</h2>
      <ol className="list-decimal space-y-2 ps-6">
        {content.howSteps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>

      <h2>{content.forClientsHeading}</h2>
      <ul className="list-disc space-y-2 ps-6">
        {content.forClientsItems.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <h2>{content.forFreelancersHeading}</h2>
      <ul className="list-disc space-y-2 ps-6">
        {content.forFreelancersItems.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <p className="rounded-lg bg-surface-container-low p-4 text-sm text-on-surface-variant">
        {content.mvpNote}
      </p>

      <div className="not-prose flex flex-wrap gap-4">
        <Link
          href="/dashboard/escrow"
          className="rounded-full bg-ember px-6 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_-8px_rgba(234,88,12,0.55)] transition hover:bg-ember-deep"
        >
          {t('escrowLedgerCta')}
        </Link>
        <Link
          href="/contact"
          className="rounded-full border border-line bg-cream px-6 py-2.5 text-sm font-semibold text-ink transition hover:border-ink hover:bg-cream-deep"
        >
          {t('paymentInquiryCta')}
        </Link>
      </div>
    </MarketingPage>
  );
}
