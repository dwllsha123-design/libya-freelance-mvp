'use client';

import { useTranslations } from 'next-intl';

export function VerifiedBadge({ className = '' }: { className?: string }) {
  const t = useTranslations('ui');

  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full bg-tertiary/15 px-2 py-0.5 text-[10px] font-semibold text-tertiary ${className}`}
      title={t('verifiedTitle')}
    >
      <svg viewBox="0 0 20 20" className="h-3 w-3" fill="currentColor" aria-hidden>
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
          clipRule="evenodd"
        />
      </svg>
      {t('verified')}
    </span>
  );
}
