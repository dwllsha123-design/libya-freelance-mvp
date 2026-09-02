import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';
import { MarketingPage } from '@/components/marketing/marketing-page';
import { getLocalizedCategoryName, getLocalizedCityName } from '@/lib/locale-content';
import { getMarketingPageContent } from '@/lib/marketing-pages-i18n';
import { LIBYAN_CITIES, MARKETPLACE_CATEGORIES } from '@/lib/marketplace-content';

type Props = { params: Promise<{ locale: string }> };

export default async function SitemapPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const content = getMarketingPageContent(locale as AppLocale).sitemap;
  const appLocale = locale as AppLocale;

  return (
    <MarketingPage title={content.title}>
      {content.sections.map((section, index) => (
        <div key={section.title}>
          <h2>{section.title}</h2>
          <ul className="list-disc space-y-1 ps-6">
            {index === 2
              ? LIBYAN_CITIES.map((city) => (
                  <li key={city.slug}>
                    <Link href={`/cities/${city.slug}`}>
                      {getLocalizedCityName(city, appLocale)}
                    </Link>
                  </li>
                ))
              : index === 3
                ? MARKETPLACE_CATEGORIES.map((category) => (
                    <li key={category.slug}>
                      <Link href={`/categories/${category.slug}`}>
                        {getLocalizedCategoryName(category, appLocale)}
                      </Link>
                    </li>
                  ))
                : section.links.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href}>{link.label}</Link>
                    </li>
                  ))}
          </ul>
        </div>
      ))}
    </MarketingPage>
  );
}
