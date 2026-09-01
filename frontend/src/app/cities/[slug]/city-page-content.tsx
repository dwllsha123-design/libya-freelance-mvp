'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiRequest, type PublicProfile } from '@/lib/api';
import type { PaginatedProjects } from '@/lib/schemas/project';
import { formatBudgetRange } from '@/lib/currency';
import { FreelancerCard } from '@/components/freelancers/freelancer-card';
import type { LibyanCity } from '@/lib/marketplace-types';

export function CityPageContent({ city }: { city: LibyanCity }) {
  const [projects, setProjects] = useState<PaginatedProjects | null>(null);
  const [freelancers, setFreelancers] = useState<PublicProfile[]>([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiRequest<PaginatedProjects>(`/projects?city=${city.slug}&limit=12`),
      apiRequest<{ data: PublicProfile[] }>(`/freelancers?city=${city.slug}&limit=12`),
    ]).then(([p, f]) => {
      if (!cancelled) {
        setProjects(p);
        setFreelancers(f.data);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [city.slug]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <nav className="text-sm text-on-surface-variant">
        <Link href="/" className="hover:text-primary">
          الرئيسية
        </Link>
        <span className="mx-2">/</span>
        <span>{city.nameAr}</span>
      </nav>

      <h1 className="mt-4 text-3xl font-bold text-on-surface">
        مستقلون ومشاريع في {city.nameAr}
      </h1>
      <p className="mt-3 max-w-3xl text-lg text-on-surface-variant">{city.description}</p>
      <p className="mt-2 text-sm text-on-surface-variant">
        فرص عمل حر في {city.nameAr} — الميزانيات بالدينار الليبي (د.ل)
      </p>

      <section className="mt-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-xl font-semibold text-on-surface">مشاريع في {city.nameAr}</h2>
          <Link href={`/projects?city=${city.slug}`} className="text-sm text-primary hover:underline">
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
          <p className="mt-4 text-on-surface-variant">لا توجد مشاريع منشورة حالياً في {city.nameAr}.</p>
        )}
      </section>

      <section className="mt-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-xl font-semibold text-on-surface">مستقلون في {city.nameAr}</h2>
          <Link href={`/freelancers?city=${city.slug}`} className="text-sm text-primary hover:underline">
            عرض الكل ←
          </Link>
        </div>
        {freelancers.length ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {freelancers.map((f) => (
              <FreelancerCard key={f.username} freelancer={f} />
            ))}
          </div>
        ) : (
          <p className="mt-4 text-on-surface-variant">لا يوجد مستقلون مسجلون حالياً في {city.nameAr}.</p>
        )}
      </section>

      <section className="mt-12 rounded-xl border border-outline-variant/40 bg-surface-container-low p-6">
        <h2 className="font-semibold text-on-surface">انشر مشروعك في {city.nameAr}</h2>
        <p className="mt-2 text-sm text-on-surface-variant">
          اجذب مستقلين محليين — النشر مجاني والميزانيات بالدينار الليبي.
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
