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
  const content = getMarketingPageContent(locale as AppLocale).help;
  return buildPageMetadata({
    title: content.metaTitle,
    description: content.metaDescription,
    path: '/help',
  });
}

export default async function HelpPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const content = getMarketingPageContent(locale as AppLocale).help;

  return (
    <MarketingPage title={content.title} subtitle={content.subtitle}>
      {content.sections.map((section) => (
        <div key={section.title}>
          <h2>{section.title}</h2>
          <div className="not-prose space-y-4">
            {section.items.map((item) => (
              <div
                key={item.q}
                className="rounded-xl border border-outline-variant/40 bg-surface p-5"
              >
                <h3 className="font-semibold text-on-surface">{item.q}</h3>
                <p className="mt-2 text-sm text-on-surface-variant">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      ))}

      <h2>{content.quickLinksHeading}</h2>
      <ul className="list-disc space-y-2 ps-6">
        {content.quickLinks.map((link) => (
          <li key={link.href}>
            <Link href={link.href}>{link.label}</Link>
          </li>
        ))}
      </ul>
    </MarketingPage>
  );
}
