'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';
import type { PaginatedProjects } from '@/lib/schemas/project';
import { formatBudgetRange } from '@/lib/currency';
import type { MarketplaceCategory } from '@/lib/marketplace-types';
import { LIBYAN_CITIES } from '@/lib/marketplace-content';

export function CategoryPageContent({ category }: { category: MarketplaceCategory }) {
  const [projects, setProjects] = useState<PaginatedProjects | null>(null);

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
          الرئيسية
        </Link>
        <span className="mx-2">/</span>
        <span>{category.nameAr}</span>
      </nav>

      <h1 className="mt-4 text-3xl font-bold text-on-surface">{category.nameAr} في ليبيا</h1>
      <p className="mt-3 max-w-3xl text-lg text-on-surface-variant">{category.description}</p>
      <p className="mt-2 text-sm text-on-surface-variant">
        مشاريع {category.nameAr} — الميزانيات بالدينار الليبي (د.ل)
      </p>

      <section className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-xl font-semibold text-on-surface">مشاريع متاحة</h2>
          <Link
            href={`/projects?category=${category.slug}`}
            className="text-sm text-primary hover:underline"
          >
            عرض الكل ←
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
                  {formatBudgetRange(p.budgetMin, p.budgetMax, p.currency)}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-on-surface-variant">لا توجد مشاريع في هذا التصنيف حالياً.</p>
        )}
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold text-on-surface">مدن ليبيا</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {LIBYAN_CITIES.map((city) => (
            <Link
              key={city.slug}
              href={`/cities/${city.slug}`}
              className="rounded-full border border-outline-variant/50 px-3 py-1.5 text-sm text-on-surface-variant hover:border-primary hover:text-primary"
            >
              {city.nameAr}
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-12 rounded-xl border border-outline-variant/40 bg-surface-container-low p-6">
        <h2 className="font-semibold text-on-surface">تحتاج {category.nameAr}؟</h2>
        <p className="mt-2 text-sm text-on-surface-variant">
          انشر مشروعك واستقبل عروضاً من مستقلين ليبيين متخصصين.
        </p>
        <Link
          href="/register?role=CLIENT&next=/dashboard/projects/new"
          className="mt-4 inline-block rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90"
        >
          انشر مشروعاً
        </Link>
      </section>
    </div>
  );
}
