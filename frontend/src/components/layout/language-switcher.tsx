'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';

const LOCALES: { code: AppLocale; label: string }[] = [
  { code: 'ar', label: 'عربي' },
  { code: 'en', label: 'EN' },
];

export function LanguageSwitcher() {
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const router = useRouter();

  function switchLocale(next: AppLocale) {
    if (next === locale) return;
    router.replace(pathname, { locale: next });
  }

  return (
    <div
      className="flex items-center rounded-lg border border-slate-200 bg-surface p-0.5 text-xs font-semibold"
      role="group"
      aria-label="Language"
    >
      {LOCALES.map((item) => (
        <button
          key={item.code}
          type="button"
          onClick={() => switchLocale(item.code)}
          className={`rounded-md px-2.5 py-1.5 transition ${
            locale === item.code
              ? 'bg-secondary text-white'
              : 'text-slate-600 hover:text-slate-900'
          }`}
          aria-pressed={locale === item.code}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
