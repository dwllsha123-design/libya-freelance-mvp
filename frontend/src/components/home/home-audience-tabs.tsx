'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';
import { getHomeContent } from '@/lib/home-content-i18n';

type Tab = 'clients' | 'freelancers';

export function HomeAudienceTabs() {
  const t = useTranslations('home');
  const tBrand = useTranslations('brand');
  const locale = useLocale() as AppLocale;
  const content = getHomeContent(locale);
  const [tab, setTab] = useState<Tab>('clients');
  const active = tab === 'clients' ? content.audience.clients : content.audience.freelancers;
  const ctaHref =
    tab === 'clients'
      ? '/register?role=CLIENT&next=/dashboard/projects/new'
      : '/register?role=FREELANCER';

  return (
    <section className="bg-surface-container-low px-4 py-16">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-2xl font-bold text-on-surface sm:text-3xl">{t('audienceTitle')}</h2>
        <p className="mt-3 text-on-surface-variant">
          {t('audienceSubtitle', { brand: tBrand('nameStyled') })}
        </p>

        <div className="mt-8 inline-flex rounded-full border border-outline-variant/50 bg-surface p-1">
          <button
            type="button"
            onClick={() => setTab('clients')}
            className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${
              tab === 'clients'
                ? 'bg-secondary text-white'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {content.audienceTabs.clients}
          </button>
          <button
            type="button"
            onClick={() => setTab('freelancers')}
            className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${
              tab === 'freelancers'
                ? 'bg-secondary text-white'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {content.audienceTabs.freelancers}
          </button>
        </div>

        <div className="mt-8 rounded-2xl border border-outline-variant/40 bg-surface p-6 text-start shadow-sm sm:p-8">
          <ul className="space-y-4">
            {active.items.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-on-surface-variant">
                <span
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs text-primary"
                  aria-hidden
                >
                  ✓
                </span>
                {item}
              </li>
            ))}
          </ul>
          <Link
            href={ctaHref}
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary-container"
          >
            {active.cta}
            <span aria-hidden>←</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
