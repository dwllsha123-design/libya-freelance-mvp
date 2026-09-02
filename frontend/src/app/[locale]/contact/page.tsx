import { setRequestLocale } from 'next-intl/server';
import { MarketingPage } from '@/components/marketing/marketing-page';
import type { AppLocale } from '@/i18n/routing';
import { getMarketingPageContent } from '@/lib/marketing-pages-i18n';

type Props = { params: Promise<{ locale: string }> };

export default async function ContactPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const content = getMarketingPageContent(locale as AppLocale).contact;

  return (
    <MarketingPage title={content.title} subtitle={content.subtitle}>
      <p>{content.intro}</p>
      <ul className="list-none space-y-2">
        <li>
          <strong>{content.emailLabel}</strong> support@libyifreelance.ly
        </li>
        <li>
          <strong>{content.marketLabel}</strong> {content.marketValue}
        </li>
        <li>
          <strong>{content.currencyLabel}</strong> {content.currencyValue}
        </li>
      </ul>
      <p className="text-sm">{content.formNote}</p>
    </MarketingPage>
  );
}
