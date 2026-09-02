import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';
import { MarketingPage } from '@/components/marketing/marketing-page';
import { getMarketingPageContent } from '@/lib/marketing-pages-i18n';
import { buildPageMetadata } from '@/lib/seo';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const content = getMarketingPageContent(locale as AppLocale).privacy;
  return buildPageMetadata({
    title: content.metaTitle,
    description: content.metaDescription,
    path: '/privacy',
  });
}

export default async function PrivacyPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const content = getMarketingPageContent(locale as AppLocale).privacy;

  return (
    <MarketingPage title={content.title}>
      <p className="text-sm">{content.lastUpdated}</p>
      <p>{content.intro}</p>

      {content.sections.map((section) => (
        <div key={section.heading}>
          <h2>{section.heading}</h2>
          {section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          {section.items ? (
            <ul className="list-disc space-y-2 ps-6">
              {section.items.map((item) => (
                <li key={`${item.title}${item.body}`}>
                  {item.title ? <strong>{item.title}</strong> : null} {item.body}
                </li>
              ))}
            </ul>
          ) : null}
          {section.beforeContactLink ? (
            <p>
              {section.beforeContactLink}
              <Link href="/contact">{section.contactLinkLabel}</Link>
              {section.afterContactLink}
            </p>
          ) : null}
        </div>
      ))}
    </MarketingPage>
  );
}
