'use client';

import { useLocale, useTranslations } from 'next-intl';
import { getAdminHomeHref } from '@/lib/roles';

/** Subtle staff-only control while browsing the public site. */
export function StaffReturnToAdminLink({ className = '' }: { className?: string }) {
  const t = useTranslations('admin');
  const locale = useLocale();

  return (
    <a
      href={getAdminHomeHref(locale)}
      className={`text-xs font-medium text-slate-500 underline-offset-2 hover:text-on-surface hover:underline ${className}`}
    >
      {t('returnToAdminPanel')}
    </a>
  );
}
