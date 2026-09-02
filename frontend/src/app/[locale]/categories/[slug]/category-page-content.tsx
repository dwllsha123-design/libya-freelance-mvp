'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';
import type { PaginatedProjects } from '@/lib/schemas/project';
import { formatBudgetRange } from '@/lib/currency';
import { getLocalizedCityName } from '@/lib/locale-content';
import type { AppLocale } from '@/i18n/routing';
import type { MarketplaceCategory } from '@/lib/marketplace-types';
import { LIBYAN_CITIES } from '@/lib/marketplace-content';

export function CategoryPageContent({ category }: { category: MarketplaceCategory }) {
  const t = useTranslations('freelancers');
  const locale = useLocale() as AppLocale;
  const [projects, setProjects] = useState<PaginatedProjects | null>(null);

  const categoryName = category.nameAr;

  useEffect(() => {
    let cancelled = false;
    apiRequest<PaginatedProjects>(`/projects?category=${category.slug}&limit=12`).then((p) => {
      if (!cancelled) setProjects(p);
    });
    return () => {
      cancelled = true;
    };
  }, [category.slug]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <nav className="text-sm text-on-surface-variant">
        <Link href="/" className="hover:text-primary">
          {t('home')}
        </Link>
        <span className="mx-2">/</span>
        <span>{categoryName}</span>
      </nav>

      <h1 className="mt-4 text-3xl font-bold text-on-surface">
        {t('categoryInLibya', { category: categoryName })}
      </h1>
      <p className="mt-3 max-w-3xl text-lg text-on-surface-variant">{category.description}</p>
      <p className="mt-2 text-sm text-on-surface-variant">
        {t('categoryBudgetNote', { category: categoryName })}
      </p>

      <section className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-xl font-semibold text-on-surface">{t('availableProjects')}</h2>
          <Link
            href={`/projects?category=${category.slug}`}
            className="text-sm text-primary hover:underline"
          >
            {t('viewAll')}
          </Link>
        </div>
        {projects?.items.length ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {projects.items.map((p) => (
              <Link
                key={p.slug}
                href={`/projects/${p.slug}`}
                className="rounded-xl border border-outline-variant/40 bg-surface p-5 transition hover:border-primary"
              >
                <h3 className="font-medium text-on-surface">{p.title}</h3>
                <p className="mt-2 line-clamp-2 text-sm text-on-surface-variant">{p.description}</p>
                <p className="mt-2 text-sm font-semibold text-primary">
                  {formatBudgetRange(p.budgetMin, p.budgetMax, p.currency, locale)}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-on-surface-variant">{t('noProjectsInCategory')}</p>
        )}
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold text-on-surface">{t('libyaCities')}</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {LIBYAN_CITIES.map((city) => (
            <Link
              key={city.slug}
              href={`/cities/${city.slug}`}
              className="rounded-full border border-outline-variant/50 px-3 py-1.5 text-sm text-on-surface-variant hover:border-primary hover:text-primary"
            >
              {getLocalizedCityName(city, locale)}
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-12 rounded-xl border border-outline-variant/40 bg-surface-container-low p-6">
        <h2 className="font-semibold text-on-surface">{t('needCategory', { category: categoryName })}</h2>
        <p className="mt-2 text-sm text-on-surface-variant">{t('needCategorySubtitle')}</p>
        <Link
          href="/register?role=CLIENT&next=/dashboard/projects/new"
          className="mt-4 inline-block rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90"
        >
          {t('postProject')}
        </Link>
      </section>
    </div>
  );
}
