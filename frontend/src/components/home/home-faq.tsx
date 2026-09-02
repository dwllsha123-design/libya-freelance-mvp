'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';
import { getHomeContent } from '@/lib/home-content-i18n';

export function HomeFaq() {
  const t = useTranslations('home');
  const locale = useLocale() as AppLocale;
  const content = getHomeContent(locale);
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="bg-surface-container-low px-4 py-16">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-on-surface sm:text-3xl">{t('faqTitle')}</h2>
          <p className="mt-2 text-on-surface-variant">{content.faqSection.subtitle}</p>
        </div>

        <div className="mt-8 divide-y divide-outline-variant/30 overflow-hidden rounded-2xl border border-outline-variant/40 bg-surface">
          {content.faq.map((item, index) => {
            const open = openIndex === index;
            return (
              <div key={item.q}>
                <button
                  type="button"
                  onClick={() => setOpenIndex(open ? null : index)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-start text-sm font-semibold text-on-surface hover:bg-surface-container-low/50 sm:px-6 sm:text-base"
                  aria-expanded={open}
                >
                  {item.q}
                  <span
                    className={`shrink-0 text-on-surface-variant transition ${open ? 'rotate-180' : ''}`}
                    aria-hidden
                  >
                    ▾
                  </span>
                </button>
                {open ? (
                  <p className="border-t border-outline-variant/20 px-5 pb-4 pt-2 text-sm leading-relaxed text-on-surface-variant sm:px-6">
                    {item.a}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>

        <p className="mt-6 text-center text-sm">
          <Link href="/help" className="font-semibold text-primary hover:underline">
            {content.faqSection.moreHelp} ←
          </Link>
        </p>
      </div>
    </section>
  );
}
