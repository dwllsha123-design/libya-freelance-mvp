'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useNuqatiBalance } from '@/hooks/use-nuqati';
import { getNuqatiBrand } from '@/lib/nuqati';
import type { AppLocale } from '@/i18n/routing';

export function NuqatiBadge() {
  const t = useTranslations('nuqati');
  const locale = useLocale() as AppLocale;
  const { balance } = useNuqatiBalance();
  const brand = getNuqatiBrand(locale);
  const numberLocale = locale === 'ar' ? 'ar-LY' : 'en-LY';

  if (balance === null) return null;

  return (
    <Link
      href="/dashboard/nuqati"
      className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-900 hover:bg-amber-100"
      title={brand}
    >
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-[10px] font-bold text-white">
        {locale === 'ar' ? 'ن' : 'N'}
      </span>
      {balance.toLocaleString(numberLocale)} {t('points')}
    </Link>
  );
}
