'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

export function MarketingPage({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const t = useTranslations('marketing');

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold text-on-surface">{title}</h1>
      {subtitle ? <p className="mt-2 text-on-surface-variant">{subtitle}</p> : null}
      <div className="prose prose-slate mt-8 max-w-none space-y-4 text-on-surface [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_li]:text-on-surface-variant [&_li_a]:font-medium [&_li_a]:text-ember [&_li_a]:underline-offset-2 hover:[&_li_a]:underline [&_p]:leading-relaxed [&_p]:text-on-surface-variant [&_p_a]:font-medium [&_p_a]:text-ember [&_p_a]:underline-offset-2 hover:[&_p_a]:underline">
        {children}
      </div>
      <p className="mt-10">
        <Link href="/" className="text-primary hover:underline">
          ← {t('backToHome')}
        </Link>
      </p>
    </div>
  );
}
