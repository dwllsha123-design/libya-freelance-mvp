import { setRequestLocale } from 'next-intl/server';
import { MarketingPage } from '@/components/marketing/marketing-page';
import { FACEBOOK_PAGE_URL } from '@/lib/branding';
import type { AppLocale } from '@/i18n/routing';
import { getMarketingPageContent } from '@/lib/marketing-pages-i18n';

type Props = { params: Promise<{ locale: string }> };

export default async function ContactPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const content = getMarketingPageContent(locale as AppLocale).contact;
  const isAr = locale === 'ar';

  return (
    <MarketingPage title={content.title} subtitle={content.subtitle}>
      <p>{content.intro}</p>
      <ul className="list-none space-y-2">
        <li>
          <strong>{content.emailLabel}</strong> support@libyanfreelance.ly
        </li>
        <li>
          <strong>{content.marketLabel}</strong> {content.marketValue}
        </li>
        <li>
          <strong>{content.currencyLabel}</strong> {content.currencyValue}
        </li>
        <li className="flex flex-wrap items-center gap-2 pt-1">
          <strong>{isAr ? 'فيسبوك:' : 'Facebook:'}</strong>
          <a
            href={FACEBOOK_PAGE_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={
              isAr
                ? 'صفحة Libya Freelance على فيسبوك'
                : 'Libya Freelance on Facebook'
            }
            className="inline-flex items-center gap-2 rounded-full border border-outline-variant/50 bg-[#1877F2] px-3 py-1.5 text-sm font-medium text-white transition hover:opacity-90"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M22 12.07C22 6.48 17.52 2 11.93 2S1.86 6.48 1.86 12.07c0 5.02 3.66 9.18 8.44 9.93v-7.03H7.9v-2.9h2.4V9.86c0-2.37 1.41-3.68 3.57-3.68 1.03 0 2.12.18 2.12.18v2.33h-1.2c-1.18 0-1.55.73-1.55 1.48v1.78h2.64l-.42 2.9h-2.22V22c4.78-.75 8.44-4.91 8.44-9.93z" />
            </svg>
            facebook.com/libyanfreelance
          </a>
        </li>
      </ul>
      <p className="text-sm">{content.formNote}</p>
    </MarketingPage>
  );
}
